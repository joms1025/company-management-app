import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon, VideoCameraIcon, Cog6ToothIcon, XMarkIcon, SwatchIcon } from './icons/HeroIcons';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navigationLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Group Chat', href: '/group-chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
  { name: 'Video Call', href: '/video-call', icon: VideoCameraIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  // { name: 'Voice Notes', href: '/voice-notes', icon: MicrophoneIconSolid }, // Removed, integrated into chat
];

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const NavItem: React.FC<{ link: typeof navigationLinks[0]; onClick?: () => void }> = ({ link, onClick }) => (
    <NavLink
      to={link.href}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center px-3 py-3 text-sm rounded-lg transition-all duration-200 ease-in-out group 
         focus:outline-none focus:ring-2 
         ${isActive
            ? 'bg-primary-DEFAULT text-white dark:bg-primary-light dark:text-primary-dark font-semibold shadow-lg scale-105 focus:ring-primary-DEFAULT dark:focus:ring-primary-DEFAULT'
            : 'text-neutral-dark dark:text-neutral-light font-medium hover:bg-primary-light hover:text-white dark:hover:bg-primary-dark dark:hover:text-neutral-lightest focus:ring-primary-light'
         }`
      }
    >
      <link.icon className="h-6 w-6 mr-3 transition-transform duration-200 ease-in-out group-hover:scale-110" />
      {link.name}
    </NavLink>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="fixed inset-0 bg-neutral-darkest bg-opacity-75 transition-opacity" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex flex-col flex-1 w-full max-w-xs bg-neutral-lightest dark:bg-neutral-dark p-4">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full text-white hover:bg-neutral-dark focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center flex-shrink-0 px-4 h-16 border-b border-neutral-light dark:border-neutral-darkest">
             <SwatchIcon className="h-8 w-8 text-primary-DEFAULT mr-2"/>
            <span className="text-2xl font-bold text-primary-DEFAULT dark:text-primary-light">CMS</span>
          </div>
          <nav className="mt-5 flex-1 space-y-2 px-2">
            {navigationLinks.map((link) => (
              <NavItem key={link.name} link={link} onClick={() => setSidebarOpen(false)} />
            ))}
          </nav>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-neutral-lightest dark:bg-neutral-dark pt-5 pb-4 overflow-y-auto shadow-xl">
            <div className="flex items-center flex-shrink-0 px-4 h-16">
              <SwatchIcon className="h-10 w-10 text-primary-DEFAULT mr-2"/>
              <span className="text-3xl font-bold text-primary-DEFAULT dark:text-primary-light">CMS</span>
            </div>
            <nav className="mt-8 flex-1 px-3 space-y-3">
              {navigationLinks.map((link) => (
                <NavItem key={link.name} link={link} />
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;