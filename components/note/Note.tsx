/* eslint-disable @typescript-eslint/no-unused-vars */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import MsEditor, { embeds, JSONContent } from "mdsmirror";
import { RawMark } from "mdsmark";
import saveAs from 'file-saver';
import { Mindmap } from "editor/DemoEditor";
import Title from 'components/note/Title';
import Toc, { Heading } from 'components/note/Toc';
import { Notes, SidebarTab, store, useStore } from 'lib/store';
import { defaultNote, Note as NoteType } from 'types/model';
import { ProvideCurrentMd } from 'context/useCurrentMd';
import { useCurrentViewContext } from 'context/useCurrentView';
import { 
  writeFile, getOrNewFileHandle, delFileHandle, writeJsonFile 
} from 'editor/hooks/useFSA';
import useNoteSearch from 'editor/hooks/useNoteSearch';
import { FileSystemAccess } from 'editor/checks';
import { ciStringEqual, decodeHTMLEntity, isUrl, joinPath, regDateStr } from 'utils/helper';
import { refreshFile } from 'editor/hooks/useRefresh';
import ErrorBoundary from '../misc/ErrorBoundary';
import NoteHeader from './NoteHeader';
import Backlinks from './backlinks/Backlinks';
import updateBacklinks from './backlinks/updateBacklinks';

type Props = {
  noteId: string;
  highlightedPath?: unknown;
  className?: string;
};

function Note(props: Props) {
  const { noteId, className } = props;
  // console.log("loading",noteId)
  const [headings, setHeadings] = useState<Heading[]>([]);
  const editorInstance = useRef<MsEditor>(null);
  const getHeading = () => {
    const hdings = editorInstance.current?.getHeadings();
    // console.log(hdings); 
    setHeadings(hdings ?? []);
  };

  useEffect(() => { getHeading(); }, [noteId]); // to trigger change on dep change

  const darkMode = useStore((state) => state.darkMode);
  const rawMode = useStore((state) => state.rawMode);
  const readMode = useStore((state) => state.readMode);
  const isRTL = useStore((state) => state.isRTL);
  
  const initDir = useStore((state) => state.initDir);
  const currentDir = useStore((state) => state.currentDir);

  // console.log("initDir", initDir, protocol, navigator.platform);
  const storeNotes = useStore((state) => state.notes);
  // get note and properties: title,  content value.... 
  const thisNote: NoteType = useStore((state) => state.currentNote[noteId]);
  const isDaily = thisNote?.is_daily ?? false;
  const title = thisNote?.title || '';
  const mdContent = thisNote?.content || ' '; // show ' ' if null 
  
  // const doc = parser.parse(mdContent);
  // console.log(">> doc: ", doc);
  // const json = getJSONContent(doc); 
  // console.log(">>json: ", json);

  // for context 
  const currentView = useCurrentViewContext();
  const state = currentView.state;
  const dispatch = currentView.dispatch;
  const currentNoteValue = useMemo(() => (
    { ty: 'note', id: noteId, state, dispatch }
  ), [dispatch, noteId, state]);

  // note action
  const updateNote = useStore((state) => state.updateNote);
  const deleteNote = useStore((state) => state.deleteNote);
  const upsertNote = useStore((state) => state.upsertNote);
  const upsertTree = useStore((state) => state.upsertTree);

  // for split view
  const [rawCtn, setRawCtn] = useState<string | null>(null);
  const [mdCtn, setMdCtn] = useState<string | null>(null);
  const [focusOn, setFocusOn] = useState<string | null>(null);
  const switchFocus = useCallback(
    (on: string) => {
      // refresh current note
      const cNote: Notes = {};
      cNote[noteId] = storeNotes[noteId];
      store.getState().setCurrentNote(cNote);
      // switch focus 
      setFocusOn(on);
    }, [noteId, storeNotes]
  );

  // update locally
  const onContentChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (text: string, json: JSONContent) => {
      // console.log("on content change", text.length, json);
      // write to local file and store
      updateNote({ id: noteId, content: text });
      if (rawMode === 'split' && focusOn === 'wysiwyg') { 
        setMdCtn(null);
        setRawCtn(text); 
      }
      if (FileSystemAccess.support(window)) {
        const handle = store.getState().handles[title]
          || await getOrNewFileHandle(title);
        if (handle) {
          await writeFile(handle, text);
          await writeJsonFile();
        }
      }
      // update TOC if any 
      getHeading();
    },
    [focusOn, noteId, rawMode, title, updateNote]
  );

  const onMarkdownChange = useCallback(
    async (text: string) => {
      // console.log("on markdown content change", text);
      // write to local file and store
      updateNote({ id: noteId, content: text });
      if (rawMode === 'split' && focusOn === 'raw') { 
        setRawCtn(null); 
        setMdCtn(text); 
      }
      if (FileSystemAccess.support(window)) {
        const handle = store.getState().handles[title]
          || await getOrNewFileHandle(title);
        if (handle) {
          await writeFile(handle, text);
          await writeJsonFile();
        }
      }
    },
    [updateNote, noteId, rawMode, focusOn, title]
  );

  // update locally
  const onTitleChange = useCallback(
    async (newtitle: string) => {
      // update note title in storage as unique title
      const newTitle = newtitle.trim() || getUntitledTitle(noteId);
      const isTitleUnique = () => {
        const notesArr = Object.values(storeNotes);
        return notesArr.findIndex(
          // no need to be unique for wiki note title
          (n) => n.id !== noteId && ciStringEqual(n.title, newTitle)
        ) === -1;
      };
      if (isTitleUnique()) {
        await updateBacklinks(title, newTitle); 
        // handle FSA for private note
        // #FSA: on rename file: 
        // 1- new FileHandle 
        const newHandle = await getOrNewFileHandle(newTitle);
        // 2- swap value
        if (newHandle) {
          const swapContent = store.getState().notes[noteId]?.content || mdContent;
          await writeFile(newHandle, swapContent);
        }
        // 3- delete the old redundant FileHandle
        await delFileHandle(title);
        // 4- update note in store
        const oldNote = storeNotes[noteId];
        const newNote = {
          ...oldNote,
          id: `${newTitle}.md`,
          title: newTitle,
          file_path: `${newTitle}.md`,
        };
        upsertNote(newNote);
        if (currentDir) upsertTree(currentDir, [newNote]);
        // await writeJsonFile();
        // 5- nav to renamed note
        await refreshFile(`${newTitle}.md`);
        deleteNote(noteId);
        dispatch({view: 'md', params: {noteId: `${newTitle}.md`}});
      } else {
        toast.error(
          `There's already a note called ${newTitle}. Please use a different title.`
        );
      }
    },
    [currentDir, deleteNote, dispatch, mdContent, noteId, storeNotes, title, upsertNote, upsertTree]
  );

  // Search
  const onSearchText = useCallback(
    async (text: string, ty?: string) => {
      store.getState().setSidebarTab(SidebarTab.Search);
      store.getState().setSidebarSearchQuery(text);
      store.getState().setSidebarSearchType(ty || 'content');
      store.getState().setIsSidebarOpen(true);
    },
    []
  );

  // Search note
  const search = useNoteSearch({ numOfResults: 10 });
  const onSearchNote = useCallback(
    async (text: string) => {
      const results = search(text);
      const searchResults = results.map(res => {
        const itemTitle = res.item.title.trim();
        const search = {
          title: itemTitle,
          url: encodeURI(itemTitle),
        };
        return search;
      });
      return searchResults;
    },
    [search]
  );

  // Create new note 
  const onCreateNote = useCallback(
    async (title: string) => {
      title = title.trim();
      const existingNote = Object.values(storeNotes).find((n) => (n.title === title));
      if (existingNote) {
        return encodeURI(existingNote.title.trim());
      }
      if (initDir) await createNewNote(initDir, title);
      
      return encodeURI(title);
    },
    [initDir, storeNotes]
  );

  // open link
  const onOpenLink = useCallback(
    async (href: string) => {
      if (isUrl(href)) { 
        window.open(href);
      } else {
        // find the note per title
        const title = decodeURI(href.trim());
        // ISSUE ALERT: 
        // maybe more than one notes with same title(ci), 
        // but only link to first searched one 
        const toNote = Object.values(storeNotes).find((n) => (n.title === title));
        if (!toNote) {
          // IF note is not existing, create new
          if (!initDir) return;
          const newNotePath = await createNewNote(initDir, title);
          dispatch({view: 'md', params: { noteId: newNotePath }});
          return;
        }
        await refreshFile(toNote.id);
        dispatch({view: 'md', params: { noteId: toNote.id }});
      }
    },
    [dispatch, initDir, storeNotes]
  );

  // open Attachment file using defult application 
  const onClickAttachment = useCallback(async (href: string) => {
    const realHref = href.startsWith('./') && initDir
      ? href.replace('.', initDir)
      : href;
    // console.log("file href", href, decodeURI(realHref), initDir);
    window.open(decodeURI(realHref));
  }, [initDir]);

  const onSaveDiagram = useCallback((svg: string, ty: string) => {
    saveDiagram(svg, ty, title);
  }, [title]);

  const noteContainerClassName =
    'flex flex-col flex-shrink-0 md:flex-shrink w-full bg-white dark:bg-black dark:text-gray-200';
  const errorContainerClassName = 
    `${noteContainerClassName} items-center justify-center h-full p-4`;

  const isNoteExists = useMemo(
    () => !!storeNotes[noteId] || !!thisNote, [noteId, storeNotes, thisNote]
  );

  if (!isNoteExists) {
    return (
      <div className={errorContainerClassName}>
        <p>It does not look like this note exists: {noteId}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className={errorContainerClassName}>
          <p>An unexpected error occurred when rendering this note.</p>
        </div>
      }
    >
      <ProvideCurrentMd value={currentNoteValue}>
        <div id={noteId} className={`${noteContainerClassName} ${className}`}>
          <NoteHeader />
          <div className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto">
            <div className="flex flex-col flex-1 w-full mx-auto px-8 md:px-12">
              <Title
                className="px-2 pb-1"
                initialTitle={title}
                onChange={onTitleChange}
                isDaily={isDaily}
              />
              {(rawMode === 'wysiwyg') && headings.length > 0 
                ? (<Toc headings={headings} />) 
                : null
              }
              <div className="flex-1 p-2">
                {rawMode === 'raw' ? (
                  <RawMark
                    key={`raw-${title}`}
                    value={mdContent}
                    onChange={onMarkdownChange}
                    dark={darkMode}
                    readMode={readMode}
                    className={"text-xl"}
                  />
                ) : rawMode === 'wysiwyg' ? (
                  <MsEditor 
                    key={`wys-${noteId}`}
                    ref={editorInstance}
                    value={mdContent}
                    dark={darkMode}
                    readOnly={readMode}
                    readOnlyWriteCheckboxes={readMode}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    onChange={onContentChange}
                    onSearchLink={onSearchNote}
                    onCreateLink={onCreateNote}
                    onSearchSelectText={(txt) => onSearchText(txt)}
                    onClickHashtag={(txt) => onSearchText(txt, 'hashtag')}
                    onOpenLink={onOpenLink} 
                    onClickAttachment={onClickAttachment} 
                    onSaveDiagram={onSaveDiagram} 
                    embeds={embeds}
                    disables={['sub']}
                  />
                ) : rawMode === 'mindmap' ? (
                  <Mindmap key={`mp-${noteId}`} mdValue={mdContent} title={title} />
                ) : (
                  <div className="grid grid-cols-2 gap-1 justify-between">
                    <div className="flex-1 mr-4 border-r-2 border-gray-200 dark:border-gray-600">
                      <RawMark
                        key={`raws-${title}`}
                        value={focusOn === 'wysiwyg' ? rawCtn || mdContent : mdContent}
                        onChange={onMarkdownChange}
                        dark={darkMode}
                        readMode={readMode}
                        className={"text-xl"}
                        onFocus={() => switchFocus('raw')}
                      />
                    </div>
                    <div className="flex-1 ml-4">
                      <MsEditor 
                        key={`wyss-${title}`}
                        ref={editorInstance}
                        value={focusOn === 'raw' ? mdCtn || mdContent : mdContent}
                        dark={darkMode}
                        readOnly={readMode}
                        readOnlyWriteCheckboxes={readMode}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        onChange={onContentChange}
                        onSearchLink={onSearchNote}
                        onCreateLink={onCreateNote}
                        onSearchSelectText={(txt) => onSearchText(txt)}
                        onClickHashtag={(txt) => onSearchText(txt, 'hashtag')}
                        onOpenLink={onOpenLink} 
                        onClickAttachment={onClickAttachment} 
                        embeds={embeds}
                        disables={['sub']}
                        onFocus={() => switchFocus('wysiwyg')}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t-2 border-gray-200 dark:border-gray-600">
                {rawMode !== 'wysiwyg' 
                  ? null 
                  : (<Backlinks className="mx-4 mb-8" isCollapse={true} />)
                }
              </div>
            </div>
          </div>
        </div>
      </ProvideCurrentMd>
    </ErrorBoundary>
  );
}

export default memo(Note);

// Get a unique "Untitled" title, ignoring the specified noteId.
const getUntitledTitle = (noteId: string) => {
  const title = 'Untitled';

  const getResult = () => (suffix > 0 ? `${title} ${suffix}` : title);

  let suffix = 0;
  const notesArr: NoteType[] = Object.values(store.getState().notes);
  while (
    notesArr.findIndex(
      (note) =>
        note?.id !== noteId &&
        ciStringEqual(note?.title, getResult())
    ) > -1
  ) {
    suffix += 1;
  }

  return getResult();
};

const createNewNote = async (parentDir: string, title: string) => {
  const notePath = joinPath(parentDir, `${title}.md`);
  const newNote = { 
    ...defaultNote, 
    id: notePath, 
    title,
    file_path: notePath,
    is_daily: regDateStr.test(title),
  };
  store.getState().upsertNote(newNote);
  store.getState().upsertTree(parentDir, [newNote]);
  // await writeFile(notePath, ' ');

  return notePath;
};

export const saveDiagram = (svg: string, ty: string, title = 'untitled') => {
  const rawSVG = decodeHTMLEntity(svg);
  const svgBlob = new Blob([rawSVG], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(svgBlob, `${title}-${ty}.svg`);
};
