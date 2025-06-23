import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArchiveBoxIcon } from '../components/icons/HeroIcons';

// This page is currently deprecated for general users as voice note functionality
// has been integrated directly into the Group Chat page.
// It might be repurposed for Admins for specific broadcast functionalities or logs in the future.

const VoiceNotesPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-darkest dark:text-neutral-lightest mb-2">Voice Note System</h1>
      </div>

      <div className="bg-neutral-lightest dark:bg-neutral-dark shadow-xl rounded-lg p-6 text-center">
        <ArchiveBoxIcon className="h-16 w-16 text-neutral-DEFAULT dark:text-neutral-light mx-auto mb-4" />
        <p className="text-lg text-neutral-dark dark:text-neutral-lightest">
          Voice note recording and sending is now primarily handled within the <strong className="text-primary-DEFAULT dark:text-primary-light">Group Chat</strong> section.
        </p>
        {user?.role === 'Admin' && (
          <p className="mt-2 text-sm text-neutral-DEFAULT dark:text-neutral-light">
            Admin-specific voice note broadcast tools or logs may appear here in future updates.
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceNotesPage;