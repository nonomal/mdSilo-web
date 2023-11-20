import Link from 'next/link';
import OpenSidebarButton from 'components/sidebar/OpenSidebarButton';
import { useStore } from 'lib/store';

export default function AppHome() {
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);

  return (
    <div className="flex items-center justify-center flex-1 w-full p-12">
      {!isSidebarOpen ? (
        <OpenSidebarButton className="absolute top-0 left-0 z-10 mx-4 my-1" />
      ) : null}
      <p className="text-center text-gray-500">
        Get started <Link href="/app"><a>Here</a></Link>
      </p>
    </div>
  );
}
