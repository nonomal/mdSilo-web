import { Menu } from '@headlessui/react';
import { IconChevronsDown, IconChevronLeft, IconSettings, IconPizza } from '@tabler/icons';
import { useStore } from 'lib/store';
import Tooltip from 'components/misc/Tooltip';
import { DropdownItem } from 'components/misc/Dropdown';
import { isMobile } from 'utils/helper';

export default function SidebarHeader() {
  const setIsSidebarOpen = useStore((state) => state.setIsSidebarOpen);
  const setIsSettingsOpen = useStore((state) => state.setIsSettingsOpen);

  return (
    <div className="relative">
      <Menu>
        <Menu.Button className="flex items-center justify-between w-full py-2 pl-2 overflow-x-hidden text-left text-gray-800 hover:bg-gray-200 active:bg-gray-300 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 overflow-ellipsis whitespace-nowrap focus:outline-none border-b-2 border-gray-200 dark:border-gray-600">
          <div className="flex items-center flex-1">
            <span className="mr-1 px-1 font-semibold select-none">mdSilo</span>
            <IconChevronsDown size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <Tooltip content="Collapse Sidebar (Alt+X)" placement="right">
            <span
              className="p-1 mr-2 rounded hover:bg-gray-300 active:bg-gray-400 dark:hover:bg-gray-600 dark:active:bg-gray-500"
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarOpen(false);
              }}
            >
              <IconChevronLeft className="text-gray-500 dark:text-gray-400" />
            </span>
          </Tooltip>
        </Menu.Button>
        <Menu.Items className="absolute z-20 w-56 overflow-hidden bg-white rounded left-6 top-full shadow-popover dark:bg-gray-800 focus:outline-none">
          <DropdownItem
            onClick={() => {
              if (isMobile()) {
                setIsSidebarOpen(false);
              }
              setIsSettingsOpen(true);
            }}
          >
            <IconSettings size={18} className="mr-1" />
            <span>Settings</span>
          </DropdownItem>
          <DropdownItem
            className="border-t dark:border-gray-700"
            as='a'
            href='/helpus/'
          >
            <IconPizza size={18} className="mr-1" />
            <span>Help Us</span>
          </DropdownItem>
        </Menu.Items>
      </Menu>
    </div>
  );
}
