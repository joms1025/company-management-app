import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Bars3Icon, UserCircleIcon, ArrowRightOnRectangleIcon, SunIcon, MoonIcon } from './icons/HeroIcons';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user, setUserRole, logout } = useAuth();
  const [darkMode, setDarkMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleRoleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    // Note: Changing roles like this for demo.
    // In a real app, this would be a privileged operation, likely not available to all users.
    // The setUserRole in AuthContext now attempts to update Supabase 'profiles' table.
    // Proper RLS policies must be in place for this to work.
    await setUserRole(event.target.value as UserRole);
  };

  const handleLogout = async () => {
    await logout();
    // Navigation to /register or /login will be handled by App.tsx based on user state
  };

  return (
    <header className="sticky top-0 z-30 bg-neutral-lightest dark:bg-neutral-dark shadow-md">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile navigation button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-neutral-DEFAULT hover:text-neutral-dark dark:text-neutral-light dark:hover:text-white"
              aria-label="Open sidebar"
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="w-6 h-6" />
            </button>
          </div>

          <div className="hidden md:block text-lg font-semibold text-neutral-dark dark:text-neutral-light">
            {/* Page title could go here */}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-neutral-DEFAULT hover:bg-neutral-light dark:text-neutral-light dark:hover:bg-neutral-darkest focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-DEFAULT"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <SunIcon className="h-5 w-5 text-amber-DEFAULT" /> : <MoonIcon className="h-5 w-5 text-primary-DEFAULT" />}
            </button>
            
            {user && (
              <>
                <div className="hidden sm:block">
                  <label htmlFor="role-switcher" className="sr-only">Switch Role</label>
                  <select
                    id="role-switcher"
                    value={user.role} // Reflects current user's role from AuthContext
                    onChange={handleRoleChange}
                    className="text-sm rounded-md border-neutral-DEFAULT/50 shadow-sm focus:border-primary-DEFAULT focus:ring-primary-DEFAULT dark:bg-neutral-dark dark:border-neutral-darkest dark:text-neutral-lightest"
                    aria-label="Switch user role (Demo)"
                    // Disable if user isn't allowed to change roles, or if it's an admin-only feature
                  >
                    <option value={UserRole.USER}>User</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>
              
                <div className="flex items-center">
                  <UserCircleIcon className="h-8 w-8 text-neutral-DEFAULT dark:text-neutral-light mr-2" />
                  <div>
                    <span className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">{user.name}</span>
                    <span className="block text-xs text-neutral-DEFAULT dark:text-neutral-light">{user.role} - {user.department}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full text-neutral-DEFAULT hover:bg-neutral-light dark:text-neutral-light dark:hover:bg-neutral-darkest focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-DEFAULT"
                  aria-label="Logout"
                  title="Logout"
                >
                    <ArrowRightOnRectangleIcon className="h-6 w-6"/>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
