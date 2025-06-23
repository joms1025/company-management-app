
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

const CriticalErrorDisplay: React.FC<{ title: string; messages: string[] }> = ({ title, messages }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-danger-light dark:bg-danger-dark p-8 text-center">
    <div className="bg-neutral-lightest dark:bg-neutral-dark p-10 rounded-lg shadow-2xl max-w-2xl">
      <h1 className="text-3xl font-bold text-danger-DEFAULT dark:text-danger-light mb-6">{title}</h1>
      {messages.map((msg, index) => (
        <p key={index} className="text-md text-neutral-darkest dark:text-neutral-lightest mb-4" dangerouslySetInnerHTML={{ __html: msg }} />
      ))}
      <p className="mt-6 text-sm text-neutral-DEFAULT dark:text-neutral-light">
        Please correct the configuration and refresh the page.
      </p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check if Supabase client failed to initialize (most likely due to placeholder credentials)
  if (!supabase) {
    // Attempt to read the values directly from window to provide more specific feedback
    const urlIsPlaceholder = (window as any).SUPABASE_URL === "YOUR_SUPABASE_URL_HERE";
    const keyIsPlaceholder = (window as any).SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY_HERE";
    const urlIsMissing = !(window as any).SUPABASE_URL;
    const keyIsMissing = !(window as any).SUPABASE_ANON_KEY;

    let errorMessages = [
      "The application cannot connect to the backend (Supabase). This is a critical configuration issue.",
      "Open the <code>index.html</code> file in your project.",
      `Ensure <code>window.SUPABASE_URL</code> is set to your <strong>actual Supabase Project URL</strong> (e.g., "https://your-project-id.supabase.co").`,
      `Ensure <code>window.SUPABASE_ANON_KEY</code> is set to your <strong>actual Supabase Anon Key</strong>.`,
    ];

    if (urlIsPlaceholder || keyIsPlaceholder) {
      errorMessages.unshift("It seems you are still using <strong>placeholder values</strong> for Supabase credentials.");
    } else if (urlIsMissing || keyIsMissing) {
      errorMessages.unshift("Supabase URL or Anon Key is <strong>missing</strong> from <code>index.html</code>.");
    } else {
         errorMessages.unshift("There was an error initializing the Supabase client. This might be due to an invalid URL or key format even if not a placeholder. Check console for more details.");
    }


    return <CriticalErrorDisplay title="Supabase Configuration Error!" messages={errorMessages} />;
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-light dark:bg-neutral-darkest">
        <Spinner size="lg" />
        <p className="ml-4 text-xl text-neutral-dark dark:text-neutral-light">Loading Application...</p>
      </div>
    );
  }

  if (!user && location.pathname !== '/register') {
    return <Navigate to="/register" replace />;
  }

  if (user && location.pathname === '/register') {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (!user && location.pathname === '/register') {
    return <RegistrationPage />; // Render RegistrationPage without Layout if no user
  }


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
