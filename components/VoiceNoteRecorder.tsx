
import React, { useState, useCallback } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { MicrophoneIcon, StopCircleIcon, ArrowUpTrayIcon, PaperAirplaneIcon, TrashIcon } from './icons/HeroIcons';
import Spinner from './Spinner';
import { Department } from '../types'; // Assuming Department enum is available

interface VoiceNoteRecorderProps {
  onProcessAudio: (file: File, targetDepartments: Department[]) => Promise<void>;
  isProcessing: boolean;
  availableDepartments: Department[]; // Departments the user can send to (includes ALL_DEPARTMENTS for admin)
  currentChatDepartment?: Department; // If opened from a specific chat
  allowBroadcast?: boolean; // If admin, can they select ALL_DEPARTMENTS
}

const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ 
    onProcessAudio, 
    isProcessing, 
    availableDepartments,
    currentChatDepartment,
    allowBroadcast = false
}) => {
  const { isRecording, startRecording, stopRecording, audioBlob, clearAudio } = useAudioRecorder();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  // Default to current chat department if provided, otherwise empty or pre-select 'All Departments' for admin broadcast scenario
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>(currentChatDepartment ? [currentChatDepartment] : []);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    clearAudio(); 
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDepartmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dept = event.target.value as Department;
    setSelectedDepartments(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };
  
  const handleSelectAllDepartments = () => {
    if (selectedDepartments.includes(Department.ALL_DEPARTMENTS)) {
      setSelectedDepartments(currentChatDepartment ? [currentChatDepartment] : []);
    } else {
      setSelectedDepartments([Department.ALL_DEPARTMENTS]);
    }
  };


  const handleSubmit = async () => {
    const audioToProcess = audioBlob ? new File([audioBlob], "recorded_audio.webm", { type: audioBlob.type }) : uploadedFile;
    if (!audioToProcess) {
      alert("Please record or upload an audio file.");
      return;
    }
    if (selectedDepartments.length === 0) {
      alert("Please select at least one target department.");
      return;
    }
    await onProcessAudio(audioToProcess, selectedDepartments);
  };
  
  const handleClear = () => {
    clearAudio();
    setUploadedFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const displayDepartments = allowBroadcast ? availableDepartments : availableDepartments.filter(d => d !== Department.ALL_DEPARTMENTS);
  
  const isRecordButtonDisabled = isProcessing || !!uploadedFile;
  const isUploadLabelDisabled = isProcessing || isRecording;

  return (
    <div className="bg-neutral-lightest dark:bg-neutral-dark shadow-xl rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-neutral-darkest dark:text-neutral-lightest mb-3">Record or Upload Voice Note</h3>
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isRecordButtonDisabled}
            className={`flex items-center justify-center px-5 py-2.5 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark w-full sm:w-auto transition-all duration-150 ease-in-out transform active:scale-95
                        ${isRecording ? 'bg-danger-DEFAULT hover:bg-danger-dark focus:ring-danger-DEFAULT animate-pulse-record-shadow' : 'bg-primary-DEFAULT hover:bg-primary-dark focus:ring-primary-DEFAULT'}
                        disabled:bg-neutral-400 disabled:dark:bg-neutral-600 disabled:text-neutral-200 disabled:dark:text-neutral-400 disabled:hover:bg-neutral-400 disabled:dark:hover:bg-neutral-600 disabled:cursor-not-allowed`}
          >
            {isRecording ? <StopCircleIcon className="h-5 w-5 mr-2" /> : <MicrophoneIcon className="h-5 w-5 mr-2" />}
            {isRecording ? 'Stop' : 'Record'}
          </button>
          <span className="text-neutral-DEFAULT dark:text-neutral-light text-sm">OR</span>
          <label htmlFor="audio-upload-modal" 
            className={`flex items-center justify-center px-5 py-2.5 border-2 border-dashed border-neutral-DEFAULT/30 dark:border-neutral-darkest/50 rounded-md w-full sm:w-auto transition-all duration-150 ease-in-out transform active:scale-95
                        ${isUploadLabelDisabled 
                            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 border-neutral-300 dark:border-neutral-600 cursor-not-allowed hover:border-neutral-300 dark:hover:border-neutral-600' 
                            : 'cursor-pointer hover:border-primary-DEFAULT dark:hover:border-primary-light'}`}
            >
            <ArrowUpTrayIcon className={`h-5 w-5 mr-2 ${isUploadLabelDisabled ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-DEFAULT dark:text-neutral-light'}`} />
            <span className={`${isUploadLabelDisabled ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-dark dark:text-neutral-lightest'}`}>Upload Audio</span>
            <input 
              id="audio-upload-modal" 
              ref={fileInputRef}
              name="audio-upload-modal" 
              type="file" 
              accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a" 
              className="sr-only" 
              onChange={handleFileUpload}
              disabled={isUploadLabelDisabled}
            />
          </label>
        </div>
        {(audioBlob || uploadedFile) && !isProcessing && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-neutral-dark dark:text-neutral-light">
              {audioBlob ? `Recorded: ${(audioBlob.size / 1024).toFixed(1)}KB` : `Uploaded: ${uploadedFile?.name}`}
            </p>
            <button onClick={handleClear} className="text-sm text-danger-DEFAULT hover:text-danger-dark flex items-center transition-colors duration-150 ease-in-out">
              <TrashIcon className="h-4 w-4 mr-1"/> Clear
            </button>
          </div>
        )}
      </div>

      {!currentChatDepartment && ( // Only show department selection if not in a specific chat context OR if broadcast is allowed
        <div>
          <h4 className="text-md font-medium text-neutral-darkest dark:text-neutral-lightest mb-2">Target Department(s)</h4>
          {allowBroadcast && availableDepartments.includes(Department.ALL_DEPARTMENTS) && (
             <div className="mb-2">
                <label className="flex items-center space-x-2 p-2 border border-neutral-DEFAULT/30 dark:border-neutral-darkest/50 rounded-md hover:border-primary-DEFAULT dark:hover:border-primary-light cursor-pointer transition-colors duration-150 ease-in-out bg-amber-light/20 dark:bg-amber-dark/20">
                    <input
                        type="checkbox"
                        value={Department.ALL_DEPARTMENTS}
                        checked={selectedDepartments.includes(Department.ALL_DEPARTMENTS)}
                        onChange={handleSelectAllDepartments}
                        disabled={isProcessing}
                        className="rounded text-primary-DEFAULT focus:ring-primary-light dark:bg-neutral-darkest dark:border-neutral-darkest/70"
                    />
                    <span className="text-sm font-semibold text-amber-dark dark:text-amber-light">{Department.ALL_DEPARTMENTS} (Broadcast)</span>
                </label>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayDepartments.filter(dept => dept !== Department.ALL_DEPARTMENTS).map(dept => ( // Filter out ALL_DEPARTMENTS here as it's handled above
              <label key={dept} className={`flex items-center space-x-2 p-2 border border-neutral-DEFAULT/30 dark:border-neutral-darkest/50 rounded-md hover:border-primary-DEFAULT dark:hover:border-primary-light cursor-pointer transition-colors duration-150 ease-in-out ${selectedDepartments.includes(Department.ALL_DEPARTMENTS) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input 
                  type="checkbox" 
                  value={dept}
                  checked={selectedDepartments.includes(dept)}
                  onChange={handleDepartmentChange}
                  disabled={isProcessing || selectedDepartments.includes(Department.ALL_DEPARTMENTS)}
                  className="rounded text-primary-DEFAULT focus:ring-primary-light dark:bg-neutral-darkest dark:border-neutral-darkest/70"
                />
                <span className="text-sm text-neutral-dark dark:text-neutral-lightest">{dept}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isProcessing || (!audioBlob && !uploadedFile) || selectedDepartments.length === 0}
        className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-secondary-DEFAULT hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-secondary-DEFAULT 
                   disabled:bg-neutral-400 disabled:dark:bg-neutral-600 disabled:text-neutral-200 disabled:dark:text-neutral-400 disabled:hover:bg-neutral-400 disabled:dark:hover:bg-neutral-600 disabled:cursor-not-allowed
                   transition-all duration-150 ease-in-out transform active:scale-95"
      >
        {isProcessing ? <Spinner size="sm" color="text-white"/> : <PaperAirplaneIcon className="h-5 w-5 mr-2" />}
        {isProcessing ? 'Processing...' : 'Transcribe, Translate & Send'}
      </button>
    </div>
  );
};

export default VoiceNoteRecorder;