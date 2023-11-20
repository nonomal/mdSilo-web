import { store } from 'lib/store';

export const initialState = {view: 'default'};

type ViewParams = { noteId: string; stackIds?: string[], hash?: string };

export interface ViewState {
  view: string;
  params?: ViewParams; 
  tag?: string; 
}

export type ViewAction =
  | { view: 'default' }
  | { view: 'chronicle' }
  | { view: 'task' }
  | { view: 'graph' }
  | { view: 'journal' }
  | {
      view: 'md';
      params: ViewParams;
    }
  | {
    view: 'tag';
    tag: string;
  };

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  const actionView = action.view;
  if (actionView === 'md') {
    store.getState().setCurrentNoteId(action.params.noteId);
  } else {
    store.getState().setCurrentNoteId('');
  }

  switch (actionView) {
    case 'default':
      return {...state, view: 'default'};
    case 'chronicle':
      return {...state, view: 'chronicle'};
    case 'task':
      return {...state, view: 'task'};
    case 'graph':
      return {...state, view: 'graph'};
    case 'journal':
      return {...state, view: 'journal'};
    case 'md':
      return {view: 'md', params: action.params};
    case 'tag':
      return {view: 'tag', tag: action.tag};
    default:
      throw new Error();
  }
}
