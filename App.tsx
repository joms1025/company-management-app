

import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
// import VoiceNotesPage from './pages/VoiceNotesPage'; // VoiceNotesPage is being integrated into chat
import GroupChatPage from './pages/GroupChatPage';
import TasksPage from './pages/TasksPage';
import VideoCallPage from './pages/VideoCallPage';
import SettingsPage from './pages/SettingsPage';
import RegistrationPage from './pages/RegistrationPage'; // CRITICAL: This MUST be a relative path
import { useAuth } from './contexts/AuthContext';
import Spinner from './components/Spinner';
import supabase from './supabaseClient'; // Import supabase to check its status

const CriticalErrorDisplay: React.FC<{ title: string; messages: string[]; detectedUrl?: string; detectedKey?: string }> = ({ title, messages, detectedUrl, detectedKey }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-danger-light dark:bg-danger-dark p-4 sm:p-8 text-center">
    <div className="bg-neutral-lightest dark:bg-neutral-dark p-6 sm:p-10 rounded-xl shadow-2xl max-w-2xl w-full sm:w-auto">
      <svg className="mx-auto mb-4 h-12 w-12 text-danger-DEFAULT animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h1 className="text-2xl sm:text-3xl font-bold text-danger-DEFAULT dark:text-danger-light mb-6">{title}</h1>
      {messages.map((msg, index) => (
        <p key={index} className="text-sm sm:text-md text-neutral-darkest dark:text-neutral-lightest mb-3 sm:mb-4" dangerouslySetInnerHTML={{ __html: msg }} />
      ))}
      {(detectedUrl === "YOUR_SUPABASE_URL_HERE" || detectedKey === "YOUR_SUPABASE_ANON_KEY_HERE") && (
        <div className="mt-4 p-3 bg-danger-DEFAULT/10 dark:bg-danger-dark/20 border border-danger-DEFAULT/30 rounded-md">
          <p className="text-xs text-danger-dark dark:text-danger-light font-semibold">The application is currently seeing:</p>
          {detectedUrl === "YOUR_SUPABASE_URL_HERE" && <p className="text-xs text-danger-dark dark:text-danger-light">URL: <code>"{detectedUrl}"</code></p>}
          {detectedKey === "YOUR_SUPABASE_ANON_KEY_HERE" && <p className="text-xs text-danger-dark dark:text-danger-light">Key: <code>"{detectedKey}"</code></p>}
          <p className="text-xs text-danger-dark dark:text-danger-light mt-1">These appear to be placeholder values.</p>
        </div>
      )}
      <p className="mt-6 text-xs sm:text-sm text-neutral-DEFAULT dark:text-neutral-light">
        Please correct the configuration in your <code>index.html</code> file and then <strong>refresh this page</strong>.
      </p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check if Supabase client failed to initialize
  if (!supabase) {
    const actualUrl = (window as any).SUPABASE_URL;
    const actualKey = (window as any).SUPABASE_ANON_KEY;

    // Log the actual values for debugging
    console.error("CRITICAL ERROR: Supabase client is null. Investigating window credentials...");
    console.error(`DEBUG: window.SUPABASE_URL = "${actualUrl}" (Type: ${typeof actualUrl})`);
    console.error(`DEBUG: window.SUPABASE_ANON_KEY = "${actualKey}" (Type: ${typeof actualKey})`);


    const urlIsPlaceholder = actualUrl === "YOUR_SUPABASE_URL_HERE";
    const keyIsPlaceholder = actualKey === "YOUR_SUPABASE_ANON_KEY_HERE";
    const urlIsMissing = !actualUrl; 
    const keyIsMissing = !actualKey; 

    let errorMessages = [
      "The application cannot connect to its backend services (Supabase). This is a critical configuration issue that requires your manual intervention.",
      "<strong>Action Required:</strong>",
      "1. Open the <code>index.html</code> file located in the root of your project.",
      `2. Find the line <code>window.SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";</code> and replace <code>"YOUR_SUPABASE_URL_HERE"</code> with your <strong>actual Supabase Project URL</strong> (e.g., "https://your-project-id.supabase.co").`,
      `3. Find the line <code>window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";</code> and replace <code>"YOUR_SUPABASE_ANON_KEY_HERE"</code> with your <strong>actual Supabase Public Anon Key</strong>.`,
      "You can find these credentials in your Supabase project dashboard under Project Settings > API.",
    ];

    let specificIssueMessage = "There was an error initializing the Supabase client. Please double-check the values in <code>index.html</code> and consult the browser console for more specific error messages from Supabase, such as 'Invalid URL'.";

    if (urlIsPlaceholder || keyIsPlaceholder) {
      specificIssueMessage = "It appears you are still using <strong>placeholder values</strong> for your Supabase credentials in <code>index.html</code>.";
    } else if (urlIsMissing || keyIsMissing) {
      specificIssueMessage = "The Supabase URL or Anon Key is <strong>missing or empty</strong> in the configuration in <code>index.html</code>.";
    }
    
    errorMessages.unshift(specificIssueMessage);


    return <CriticalErrorDisplay title="Critical Configuration Error!" messages={errorMessages} detectedUrl={actualUrl} detectedKey={actualKey} />;
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-light dark:bg-neutral-darkest">
        <Spinner size="lg" />
        <p className="ml-4 text-xl text-neutral-dark dark:text-neutral-light">Loading Application...</p>
      </div>
    );
  }

  // Debugging logs for navigation decisions
  const userString = user ? `User ID: ${user.id}, Name: ${user.name}, Role: ${user.role}` : 'null';
  console.log(`App.tsx: Evaluating navigation. User: ${userString}, Loading: ${loading}, Path: ${location.pathname}`);

  if (!user && location.pathname !== '/register') {
    console.log(`App.tsx: Navigating to /register. Reason: No user and not on /register. Current User: ${userString}, Loading: ${loading}, Path: ${location.pathname}`);
    return <Navigate to="/register" replace />;
  }

  if (user && location.pathname === '/register') {
    console.log(`App.tsx: Navigating to /dashboard. Reason: User exists and is on /register. Current User: ${userString}, Loading: ${loading}, Path: ${location.pathname}`);
    return <Navigate to="/dashboard" replace />;
  }
  
  if (!user && location.pathname === '/register') {
    console.log(`App.tsx: Rendering RegistrationPage directly. Reason: No user and on /register. Current User: ${userString}, Loading: ${loading}, Path: ${location.pathname}`);
    return <RegistrationPage />; // Render RegistrationPage without Layout if no user
  }

  console.log(`App.tsx: Proceeding to render Layout. User: ${userString}, Loading: ${loading}, Path: ${location.pathname}`);
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* <Route path="/voice-notes" element={<VoiceNotesPage />} /> */}
        <Route path="/group-chat" element={<GroupChatPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/video-call" element={<VideoCallPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/register" element={<RegistrationPage />} /> {/* Should ideally not be within Layout if user is not auth'd */}
      </Routes>
    </Layout>
  );
}


const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;