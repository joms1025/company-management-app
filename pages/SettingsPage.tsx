import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Cog8ToothIcon, UserCircleIcon as UserProfileIcon } from '../components/icons/HeroIcons';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <p className="text-neutral-dark dark:text-neutral-light">Loading settings...</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-neutral-darkest dark:text-neutral-lightest">Settings</h1>
      
      <div className="bg-neutral-lightest dark:bg-neutral-dark shadow-xl rounded-lg p-6 md:p-8">
        <div className="flex items-center mb-6">
            <UserProfileIcon className="h-10 w-10 text-primary-DEFAULT mr-4"/>
            <h2 className="text-2xl font-semibold text-neutral-darkest dark:text-neutral-lightest">User Profile</h2>
        </div>
        <div className="space-y-3 text-neutral-DEFAULT dark:text-neutral-light text-sm md:text-base">
          <div className="grid grid-cols-3 gap-4 items-center">
            <p className="font-medium text-neutral-dark dark:text-neutral-lightest col-span-1">Name:</p>
            <p className="col-span-2">{user.name}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <p className="font-medium text-neutral-dark dark:text-neutral-lightest col-span-1">Email:</p>
            <p className="col-span-2">{user.email}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <p className="font-medium text-neutral-dark dark:text-neutral-lightest col-span-1">Role:</p>
            <p className="col-span-2">{user.role}</p>
          </div>
           <div className="grid grid-cols-3 gap-4 items-center">
            <p className="font-medium text-neutral-dark dark:text-neutral-lightest col-span-1">Department:</p>
            <p className="col-span-2">{user.department}</p>
          </div>
        </div>
         <button className="mt-6 px-4 py-2 border border-primary-DEFAULT text-primary-DEFAULT hover:bg-primary-DEFAULT hover:text-white dark:border-primary-light dark:text-primary-light dark:hover:bg-primary-light dark:hover:text-neutral-darkest text-sm font-medium rounded-md transition-colors duration-150">
            Edit Profile (Conceptual)
        </button>
      </div>

      <div className="bg-neutral-lightest dark:bg-neutral-dark shadow-xl rounded-lg p-6 md:p-8">
         <div className="flex items-center mb-6">
            <Cog8ToothIcon className="h-10 w-10 text-secondary-DEFAULT mr-4"/>
            <h2 className="text-2xl font-semibold text-neutral-darkest dark:text-neutral-lightest">Application Settings</h2>
        </div>
        <div className="flex flex-col items-center justify-center text-neutral-DEFAULT dark:text-neutral-light py-10">
            <Cog8ToothIcon className="h-20 w-20 text-neutral-DEFAULT/30 dark:text-neutral-light/30 animate-spin-slow" />
            <p className="mt-6 text-lg">More application settings coming soon!</p>
            <p className="text-sm">This section could include notification preferences, theme choices, language settings, etc.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;