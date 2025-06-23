import React, { useState, useEffect, useCallback } from 'react';
import DashboardCard from '../components/DashboardCard';
import { useAuth } from '../contexts/AuthContext';
import { Task, ChatMessage, Department, TaskStatus, UserRole } from '../types';
import { getTasksForDepartment, getRecentMessagesForDepartment } from '../services/mockDataService';
import { ClipboardDocumentListIcon, ChatBubbleLeftRightIcon, MicrophoneIcon as MicrophoneOutlineIcon } from '../components/icons/HeroIcons';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (user) {
      setLoadingTasks(true);
      setLoadingMessages(true);
      setError(null);
      try {
        const tasksData = await getTasksForDepartment(user.department, user.role);
        setUserTasks(tasksData
                        .filter(task => task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS)
                        .slice(0, 3));
      } catch (e: any) {
        console.error("Failed to load tasks:", e);
        setError("Could not load tasks.");
      } finally {
        setLoadingTasks(false);
      }

      try {
        const messagesData = await getRecentMessagesForDepartment(user.department, user.id);
        setRecentMessages(messagesData.slice(0,3)); // Service already limits to 3 and reverses
      } catch (e: any) {
        console.error("Failed to load messages:", e);
        setError(prev => prev ? `${prev} And could not load messages.` : "Could not load messages.");
      } finally {
        setLoadingMessages(false);
      }
    } else {
      setLoadingTasks(false);
      setLoadingMessages(false);
      setUserTasks([]);
      setRecentMessages([]);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (!user || (loadingTasks && loadingMessages && !error && userTasks.length === 0 && recentMessages.length === 0)) { // Adjusted condition to prevent flash of content
    return (
        <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
        <p className="ml-3 text-neutral-dark dark:text-neutral-light">Loading dashboard...</p>
        </div>
    );
  }
  
  if (error && !loadingTasks && !loadingMessages && userTasks.length === 0 && recentMessages.length === 0) {
     return (
        <div className="flex justify-center items-center h-full text-danger-DEFAULT dark:text-danger-light">
        <p>{error} Please try refreshing.</p>
        </div>
    );
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-darkest dark:text-neutral-lightest">Welcome, {user?.name || 'User'}!</h1>
        <p className="text-lg text-neutral-DEFAULT dark:text-neutral-light mt-1">
          Here's a quick overview for your department: <span className="font-semibold text-primary-DEFAULT dark:text-primary-light">{user?.department || 'N/A'}</span>
        </p>
      </div>
      
      {error && <p className="text-sm text-danger-DEFAULT dark:text-danger-light p-2 bg-danger-light/20 rounded-md">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <DashboardCard 
            title="Active Tasks" 
            icon={<ClipboardDocumentListIcon />}
            iconBgColor="bg-amber-100 dark:bg-amber-500/30"
            iconTextColor="text-amber-600 dark:text-amber-300"
        >
          {loadingTasks ? <Spinner size="sm"/> : userTasks.length > 0 ? (
            <ul className="space-y-2.5">
              {userTasks.map(task => (
                <li key={task.id} className="text-sm p-2.5 bg-neutral-light dark:bg-neutral-darkest/70 rounded-md shadow-sm">
                  <Link to="/tasks" className="font-medium hover:underline text-neutral-darkest dark:text-neutral-lightest">{task.title}</Link> 
                  <span className="text-xs text-neutral-DEFAULT dark:text-neutral-light"> - Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No active tasks for your department.</p>
          )}
          <Link to="/tasks" className="mt-4 inline-block text-sm text-primary-DEFAULT dark:text-primary-light hover:underline font-semibold">View All Tasks &rarr;</Link>
        </DashboardCard>

        <DashboardCard 
            title="Recent Chat Activity" 
            icon={<ChatBubbleLeftRightIcon />}
            iconBgColor="bg-teal-100 dark:bg-teal-500/30"
            iconTextColor="text-teal-600 dark:text-teal-300"
        >
          {loadingMessages ? <Spinner size="sm"/> : recentMessages.length > 0 ? (
            <ul className="space-y-2.5">
              {recentMessages.map(msg => (
                <li key={msg.id} className="text-sm p-2.5 bg-neutral-light dark:bg-neutral-darkest/70 rounded-md shadow-sm">
                  <Link to="/group-chat" className="hover:underline">
                    <strong className="text-neutral-darkest dark:text-neutral-lightest">{msg.sender_name === user?.name ? "You" : msg.sender_name}:</strong> 
                    <span className="text-neutral-DEFAULT dark:text-neutral-light ml-1">
                      {msg.type === 'voice' && msg.voice_note_data ? ( 
                        <span className="italic">[Voice Note] {msg.voice_note_data.translatedText.substring(0,25)}...</span> 
                      ) : (
                         msg.text_content?.substring(0, 30)
                      )}
                      { (msg.text_content && msg.text_content.length > 30) || (msg.voice_note_data && msg.voice_note_data.translatedText.length > 25) ? "..." : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No recent messages in your department chat.</p>
          )}
           <Link to="/group-chat" className="mt-4 inline-block text-sm text-secondary-DEFAULT dark:text-secondary-light hover:underline font-semibold">Go to Chat &rarr;</Link>
        </DashboardCard>

        <DashboardCard 
            title="Send Voice Note" 
            icon={<MicrophoneOutlineIcon />}
            iconBgColor="bg-indigo-100 dark:bg-indigo-500/30"
            iconTextColor="text-indigo-600 dark:text-indigo-300"
        >
          <p className="text-sm mb-4">Record and send translated voice notes directly in your department chat.</p>
          <Link 
            to="/group-chat" 
            className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-DEFAULT hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-DEFAULT transition-transform transform active:scale-95 duration-150 ease-in-out"
          >
            Open Chat & Record
          </Link>
        </DashboardCard>
      </div>
    </div>
  );
};

export default DashboardPage;