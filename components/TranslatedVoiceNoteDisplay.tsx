import React, { useState, useEffect } from 'react';
import { VoiceNoteData, Department } from '../types'; // Updated to use VoiceNoteData
import { PencilIcon, CheckIcon } from './icons/HeroIcons';

interface TranslatedVoiceNoteDisplayProps {
  noteData: VoiceNoteData;
  sentToDepartments?: Department[]; // Optional, if displaying a broadcasted note's targets
  onSaveEditedTranslation?: (editedText: string) => void;
  isEditable?: boolean;
}

const TranslatedVoiceNoteDisplay: React.FC<TranslatedVoiceNoteDisplayProps> = ({ noteData, sentToDepartments, onSaveEditedTranslation, isEditable = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(noteData.translatedText);

  useEffect(() => {
    setEditedText(noteData.translatedText);
  }, [noteData.translatedText]);

  const handleSave = () => {
    if (onSaveEditedTranslation) {
      onSaveEditedTranslation(editedText);
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-neutral-lightest dark:bg-neutral-dark shadow-lg rounded-lg p-4 my-2 space-y-3">
      <div>
        <h5 className="text-xs font-semibold text-neutral-dark dark:text-neutral-lightest mb-1">Original Transcription</h5>
        <p className="text-xs text-neutral-DEFAULT dark:text-neutral-light bg-neutral-light dark:bg-neutral-darkest p-2 rounded-md min-h-[40px] whitespace-pre-wrap">{noteData.originalTranscription || "N/A"}</p>
        <p className="text-xs text-neutral-DEFAULT dark:text-neutral-light mt-1">Detected Language: <span className="font-medium">{noteData.detectedLanguage || "N/A"}</span></p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <h5 className="text-xs font-semibold text-neutral-dark dark:text-neutral-lightest">Translated Text (English)</h5>
          {isEditable && !isEditing && onSaveEditedTranslation && (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-xs text-primary-DEFAULT hover:text-primary-dark dark:text-primary-light dark:hover:text-indigo-300 flex items-center"
              aria-label="Edit translation"
            >
              <PencilIcon className="h-3 w-3 mr-1" /> Edit
            </button>
          )}
          {isEditable && isEditing && onSaveEditedTranslation && (
             <button 
              onClick={handleSave}
              className="text-xs text-secondary-DEFAULT hover:text-secondary-dark flex items-center"
              aria-label="Save translation"
            >
              <CheckIcon className="h-3 w-3 mr-1" /> Save
            </button>
          )}
        </div>
        {isEditing && onSaveEditedTranslation ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={3}
            className="w-full p-2 text-xs border border-neutral-DEFAULT/30 dark:border-neutral-darkest/50 rounded-md focus:ring-primary-DEFAULT focus:border-primary-DEFAULT dark:bg-neutral-darkest dark:text-neutral-lightest"
            aria-label="Edited translation text area"
          />
        ) : (
          <p className="text-sm text-neutral-darkest dark:text-neutral-lightest bg-neutral-light dark:bg-neutral-darkest p-2 rounded-md min-h-[40px] whitespace-pre-wrap">{editedText || "N/A"}</p>
        )}
      </div>
      
      {sentToDepartments && sentToDepartments.length > 0 && (
        <div>
            <h5 className="text-xs font-semibold text-neutral-dark dark:text-neutral-lightest mb-1">Sent To</h5>
            <div className="flex flex-wrap gap-1">
                {sentToDepartments.map(dept => (
                    <span key={dept} className="px-1.5 py-0.5 bg-primary-light/30 text-primary-dark dark:bg-primary-dark/50 dark:text-primary-lightest text-xs font-medium rounded-full">{dept}</span>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default TranslatedVoiceNoteDisplay;