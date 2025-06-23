import React from 'react';
import { ChatMessage } from '../types';
import TranslatedVoiceNoteDisplay from './TranslatedVoiceNoteDisplay';
import { MicrophoneIcon }  from './icons/HeroIcons';

interface ChatItemProps {
  message: ChatMessage;
}

const ChatItem: React.FC<ChatItemProps> = ({ message }) => {
  const isOwn = message.isOwnMessage;
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in-slide-up`}>
      <div 
        className={`max-w-md lg:max-w-lg px-3 py-2 rounded-xl shadow-md ${
          isOwn 
            ? 'bg-red-600 text-white dark:bg-danger-dark dark:text-white rounded-br-none' // Use red-600 for light, danger-dark (red-700) for dark
            : 'bg-secondary-light text-secondary-dark dark:bg-secondary-dark dark:text-teal-50 rounded-bl-none'
        }`}
      >
        {!isOwn && (
          <p className={`text-xs font-semibold mb-1 ${isOwn ? '' : 'text-teal-600 dark:text-teal-300'}`}>{message.sender_name}</p>
        )}
        
        {message.type === 'voice' && message.voice_note_data ? (
          <div>
            <div className="flex items-center text-sm mb-1">
                <MicrophoneIcon className={`h-4 w-4 mr-2 ${
                    isOwn 
                        ? 'text-white opacity-75' // Updated for visibility
                        : 'text-teal-700 dark:text-teal-100'
                }`}/> 
                <span>Voice Note</span>
            </div>
            <TranslatedVoiceNoteDisplay 
                noteData={message.voice_note_data} 
                isEditable={false} // Editing typically happens before sending
            />
          </div>
        ) : (
          <p className="text-base font-medium whitespace-pre-wrap">{message.text_content}</p>
        )}

        <p className={`text-xs mt-1.5 ${
            isOwn 
                ? 'text-white opacity-75' // Updated for visibility
                : 'text-teal-500 dark:text-teal-400'
            } text-right`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default ChatItem;