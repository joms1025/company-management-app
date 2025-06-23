
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Department, ChatMessage, UserRole, VoiceNoteData } from '../types';
import { CHAT_ENABLED_DEPARTMENTS, SYSTEM_SENDER_ID, SYSTEM_SENDER_NAME } from '../constants';
import { getMessagesForDepartment, addMessageToDepartment, addSystemNotificationToDepartment } from '../services/mockDataService';
import { processAudioWithGemini } from '../services/geminiService';
import ChatItem from '../components/ChatItem';
import Modal from '../components/Modal';
import VoiceNoteRecorder from '../components/VoiceNoteRecorder';
import Spinner from '../components/Spinner';
import { PaperAirplaneIcon, MicrophoneIcon, XMarkIcon, MegaphoneIcon } from '../components/icons/HeroIcons';

const GroupChatPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const availableDepartments = React.useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) {
      return CHAT_ENABLED_DEPARTMENTS;
    }
    return CHAT_ENABLED_DEPARTMENTS.includes(user.department) && user.department !== Department.ALL_DEPARTMENTS 
           ? [user.department] 
           : [];
  }, [user]);

  useEffect(() => {
    if (user && availableDepartments.length > 0 && !selectedDepartment) {
      // Set initial department: user's own if not admin, or first available if admin
      const initialDept = user.role === UserRole.ADMIN ? availableDepartments[0] : (availableDepartments.includes(user.department) ? user.department : availableDepartments[0]);
      setSelectedDepartment(initialDept);
    } else if (user && availableDepartments.length === 0) {
      setSelectedDepartment(null); 
    }
  }, [user, availableDepartments, selectedDepartment]);
  
  const fetchMessages = useCallback(async () => {
    if (selectedDepartment && user) {
      setLoadingMessages(true);
      setChatError(null);
      try {
        const newMsgs = await getMessagesForDepartment(selectedDepartment, user.id);
        setMessages(newMsgs);
      } catch (e: any) {
        console.error("Error fetching messages:", e);
        setChatError(`Failed to load messages: ${e.message}`);
        setMessages([]); 
      } finally {
        setLoadingMessages(false);
      }
    } else {
      setMessages([]); 
      setLoadingMessages(false); // Ensure loading is false if no department/user
    }
  }, [selectedDepartment, user]);

  useEffect(() => {
    fetchMessages();
    const intervalId = setInterval(fetchMessages, 5000); 
    return () => clearInterval(intervalId);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newMessage.trim() === '' || !selectedDepartment || !user) return;

    try {
      await addMessageToDepartment(selectedDepartment, {
        senderId: user.id,
        senderName: user.name,
        type: 'text',
        textContent: newMessage,
      });
      fetchMessages(); 
      setNewMessage('');
    } catch (err: any) {
      console.error("Error sending message:", err);
      setChatError(`Failed to send message: ${err.message}`);
    }
  };

  const handleProcessVoiceNote = async (audioFile: File, targetDepartments: Department[]) => {
    if (!user) {
      setVoiceError("User not authenticated.");
      return;
    }
    setIsProcessingVoice(true);
    setVoiceError(null);

    try {
      const processedData: Partial<VoiceNoteData> = await processAudioWithGemini(audioFile);
      const voiceNoteData: VoiceNoteData = {
        originalTranscription: processedData.originalTranscription || "[Transcription unavailable]",
        detectedLanguage: processedData.detectedLanguage || "Unknown",
        translatedText: processedData.translatedText || "[Translation unavailable]",
        summary: processedData.summary || undefined,
        originalAudioUrl: undefined 
      };

      const messagePayload = {
        senderId: user.id,
        senderName: user.name,
        type: 'voice' as 'voice',
        voiceNoteData,
      };
      
      const departmentsToNotify = targetDepartments.includes(Department.ALL_DEPARTMENTS)
        ? CHAT_ENABLED_DEPARTMENTS.filter(d => d !== Department.ALL_DEPARTMENTS)
        : targetDepartments;

      for (const dept of departmentsToNotify) {
        await addMessageToDepartment(dept, messagePayload);
      }
      
      if (targetDepartments.includes(Department.ALL_DEPARTMENTS) && selectedDepartment === Department.ALL_DEPARTMENTS) {
        await addSystemNotificationToDepartment(Department.ALL_DEPARTMENTS, `Voice note broadcasted to: ${departmentsToNotify.join(', ')}`);
      }
      
      fetchMessages(); 
      setIsVoiceModalOpen(false);

    } catch (err: any) {
      console.error("Error processing audio and sending voice note:", err);
      setVoiceError(err.message || "Failed to process voice note. Check console for details.");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  if (!user) return (
    <div className="flex justify-center items-center h-full">
      <Spinner size="lg" /><p className="ml-3 text-neutral-dark dark:text-neutral-light">Loading chat...</p>
    </div>
  );
  
  const currentSelectionIsBroadcast = selectedDepartment === Department.ALL_DEPARTMENTS;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-9rem)] bg-neutral-lightest dark:bg-neutral-dark shadow-xl rounded-lg overflow-hidden">
      <header className="bg-neutral-light dark:bg-neutral-darkest p-4 border-b border-neutral-DEFAULT/20 dark:border-neutral-dark/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <h1 className="text-xl font-semibold text-neutral-darkest dark:text-neutral-lightest mb-2 sm:mb-0">
                {currentSelectionIsBroadcast ? "Broadcast Voice Notes" : `Chat: ${selectedDepartment || 'Select Department'}`}
            </h1>
            {availableDepartments.length > 1 && (
            <div className="">
                <label htmlFor="dept-select" className="sr-only">Select Department</label>
                <select
                id="dept-select"
                value={selectedDepartment || ''}
                onChange={(e) => setSelectedDepartment(e.target.value as Department)}
                className="w-full sm:w-auto rounded-md border-neutral-DEFAULT/30 dark:border-neutral-darkest/70 shadow-sm focus:border-primary-DEFAULT focus:ring-1 focus:ring-primary-DEFAULT dark:bg-neutral-dark dark:text-neutral-lightest text-sm p-2"
                >
                <option value="" disabled>Select department...</option>
                {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept === Department.ALL_DEPARTMENTS ? "📢 All Departments (Broadcast VN)" : dept}</option>
                ))}
                </select>
            </div>
            )}
        </div>
        {!selectedDepartment && availableDepartments.length === 0 && (
          <p className="text-sm text-neutral-DEFAULT dark:text-neutral-light mt-2">You are not part of any chat-enabled department.</p>
        )}
      </header>

      {selectedDepartment ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 bg-neutral-light dark:bg-neutral-darkest/70">
            {loadingMessages && (
                <div className="flex justify-center items-center py-10"><Spinner size="md"/><p className="ml-2">Loading messages...</p></div>
            )}
            {chatError && !loadingMessages && (
                 <div className="text-center p-3 my-3 bg-danger-light dark:bg-danger-dark/30 rounded-lg text-danger-dark dark:text-danger-light text-sm">{chatError}</div>
            )}
            {!loadingMessages && !chatError && messages.length === 0 && (
                <div className="text-center p-3 my-3 text-neutral-DEFAULT dark:text-neutral-light">No messages yet. Be the first to say something!</div>
            )}
            {currentSelectionIsBroadcast && user?.role === UserRole.ADMIN && !loadingMessages && (
                <div className="text-center p-3 mb-3 bg-amber-100 dark:bg-amber-600/20 rounded-lg text-amber-700 dark:text-amber-200 text-sm">
                    <MegaphoneIcon className="h-5 w-5 inline mr-2"/>
                    You are in broadcast mode for voice notes. Voice notes sent will go to ALL departments.
                </div>
            )}
            {messages.map(msg => (
              <ChatItem key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 sm:p-4 border-t border-neutral-DEFAULT/20 dark:border-neutral-dark/50 bg-neutral-light dark:bg-neutral-darkest">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {!currentSelectionIsBroadcast && (
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey ? handleSendMessage(e) : null}
                    placeholder={`Message #${selectedDepartment}... (Shift+Enter for new line)`}
                    className="flex-1 block w-full rounded-md border-neutral-DEFAULT/30 dark:border-neutral-darkest/70 shadow-sm focus:border-primary-DEFAULT focus:ring-1 focus:ring-primary-DEFAULT sm:text-sm dark:bg-neutral-dark dark:text-neutral-lightest p-2.5 placeholder-neutral-DEFAULT/70"
                    disabled={currentSelectionIsBroadcast}
                />
               )}
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className={`p-2.5 rounded-full ${currentSelectionIsBroadcast ? 'bg-amber-500 hover:bg-amber-600' : 'bg-secondary-DEFAULT hover:bg-secondary-dark'} text-white transition-all duration-150 ease-in-out transform active:scale-90 focus:outline-none focus:ring-2 ${currentSelectionIsBroadcast ? 'focus:ring-amber-400' : 'focus:ring-secondary-DEFAULT'} focus:ring-offset-2 dark:focus:ring-offset-neutral-darkest`}
                title="Record/Upload Voice Note"
                aria-label="Record or upload voice note"
              >
                <MicrophoneIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              {!currentSelectionIsBroadcast && (
                <button
                    type="submit"
                    onClick={handleSendMessage}
                    disabled={newMessage.trim() === '' || currentSelectionIsBroadcast}
                    className="p-2.5 rounded-full bg-primary-DEFAULT text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-DEFAULT focus:ring-offset-2 dark:focus:ring-offset-neutral-darkest 
                               disabled:bg-neutral-400 disabled:dark:bg-neutral-600 disabled:text-neutral-200 disabled:dark:text-neutral-400 disabled:hover:bg-neutral-400 disabled:dark:hover:bg-neutral-600 disabled:cursor-not-allowed
                               transition-all duration-150 ease-in-out transform active:scale-90"
                    title="Send Message"
                    aria-label="Send text message"
                >
                    <PaperAirplaneIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-neutral-DEFAULT dark:text-neutral-light">
            {availableDepartments.length > 0 ? "Select a department or broadcast channel to start." : "No chat departments available for you."}
          </p>
        </div>
      )}
      <Modal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} title={currentSelectionIsBroadcast ? "Record Broadcast Voice Note" : `Voice Note for ${selectedDepartment}`} size="lg">
        <VoiceNoteRecorder
          onProcessAudio={handleProcessVoiceNote}
          isProcessing={isProcessingVoice}
          availableDepartments={availableDepartments.filter(d => user?.role === UserRole.ADMIN ? true : d !== Department.ALL_DEPARTMENTS)}
          currentChatDepartment={currentSelectionIsBroadcast ? undefined : selectedDepartment!} 
          allowBroadcast={user?.role === UserRole.ADMIN}
        />
        {voiceError && (
          <div className="mt-3 bg-danger-light border border-danger-DEFAULT text-danger-dark px-3 py-2 rounded-md text-sm" role="alert">
            {voiceError}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GroupChatPage;