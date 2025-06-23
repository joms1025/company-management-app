

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
      <h1 className="text-2xl sm:text-3xl font-bold text-danger-dark dark:text-danger-lightest mb-3 sm:mb-4">{title}</h1>
      {messages.map((msg, index) => (
         <p key={index} className="text-sm sm:text-base text-neutral-darkest dark:text-neutral-lightest mb-2" dangerouslySetInnerHTML={{ __html: msg }}></p>
      ))}
      {detectedUrl && <p className="text-xs text-neutral-DEFAULT dark:text-neutral-light mt-2">Detected URL: <code className="bg-neutral-light dark:bg-neutral-darkest p-1 rounded text-xs">{detectedUrl}</code></p>}
      {detectedKey && <p className="text-xs text-neutral-DEFAULT dark:text-neutral-light">Detected Key: <code className="bg-neutral-light dark:bg-neutral-darkest p-1 rounded text-xs">{detectedKey ? `${detectedKey.substring(0,5)}... (length: ${detectedKey.length})` : "N/A"}</code></p>}
       <p className="mt-4 sm:mt-6 text-xs text-neutral-dark dark:text-neutral-light">
        Please ensure your Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY) and Gemini API Key (GEMINI_API_KEY) are correctly configured in your <code>index.html</code> (for local dev) or environment variables (for deployment).
      </p>
    </div>
  </div>
);


const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user, loading, criticalDbError } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /><p className="ml-3">Authenticating...</p></div>;
  }
  
  if (criticalDbError) { // AuthProvider already handles displaying its own critical error. This is a fallback.
      return <CriticalErrorDisplay title="Application Critical Error" messages={[`A critical database error occurred: ${criticalDbError}`]} />;
  }

  if (!user) {
    console.log("App.tsx: ProtectedRoute - No user found. Navigating to /register. Current location:", location.pathname);
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  return children;
};

const App: React.FC = () => {
  const { user, loading, criticalDbError } = useAuth(); // AuthContext manages its own full-page critical error.

  // Check Supabase client initialization *after* AuthProvider has had a chance to initialize it.
  // AuthContext handles the main Supabase client status check. This is an additional safeguard.
  // The primary `criticalDbError` from `AuthContext` will take precedence.
  if (!supabase) {
    console.error("[App.tsx] Supabase client is null. This should ideally be caught by AuthContext or index.html script.");
    const detectedUrl = (window as any).SUPABASE_URL;
    const detectedKey = (window as any).SUPABASE_ANON_KEY;
    const messages = [
        "The Supabase client could not be initialized. This is a critical configuration issue.",
        `Please verify that <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> are correctly set in your <code>index.html</code> or environment variables. The values detected in <code>index.html</code> (if any) are shown below.`
    ];
    return <CriticalErrorDisplay title="Supabase Configuration Error" messages={messages} detectedUrl={detectedUrl} detectedKey={detectedKey}/>;
  }

  // AuthProvider already renders GenericCriticalErrorDisplay if criticalDbError is set and loading is false.
  // So, we don't need to re-render it here if AuthProvider is doing its job.
  // However, if loading is still true AND there's a criticalDbError, it means AuthProvider hasn't switched to its error display yet.
  // Or, if loading is false, and criticalDbError is set, AuthProvider *should* be handling it.
  // This check in App.tsx mainly acts as a safety net or if AuthProvider logic changes.
  if (criticalDbError && !loading) {
     // This implies AuthProvider is handling the display. We can return null or a minimal loader.
     // Or, if we want App.tsx to have its own display for errors *not* caught by AuthProvider (e.g., Supabase client is null above):
     // return <CriticalErrorDisplay title="Application Critical Error" messages={[`A critical error occurred: ${criticalDbError}`]} />;
     // For now, assume AuthProvider handles it if error is set and loading is false.
     return <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-neutral-lightest dark:bg-neutral-darkest"><Spinner size="lg"/><p className="mt-2">Waiting for error display...</p></div>;
  }


  if (loading) {
    return (
      <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-neutral-lightest dark:bg-neutral-darkest">
        <Spinner size="lg" />
        <p className="mt-3 text-lg text-primary-DEFAULT dark:text-primary-light">
          Loading Application...
        </p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/register" element={user && !criticalDbError ? <Navigate to="/dashboard" replace /> : <RegistrationPage />} />
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="group-chat" element={<GroupChatPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="video-call" element={<VideoCallPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  {/* <Route path="voice-notes" element={<VoiceNotesPage />} /> Deprecated */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} /> 
                </Routes>
              </Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </HashRouter>
  );
};

export default App;
