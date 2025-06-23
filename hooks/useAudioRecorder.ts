import { useState, useRef, useCallback } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null; // For local playback if needed
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearAudio: () => void;
}

const POTENTIAL_MIME_TYPES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4', // May not be universally supported for recording
    'audio/aac',
];

const getSupportedMimeType = (): string => {
    for (const mimeType of POTENTIAL_MIME_TYPES) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
        }
    }
    return 'audio/webm'; // Fallback
};


export const useAudioRecorder = (): AudioRecorderState => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (isRecording || typeof navigator === 'undefined' || !navigator.mediaDevices) {
        console.warn("Recording already in progress or mediaDevices not supported.");
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            setAudioBlob(blob);
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
        }
        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioBlob(null); 
      setAudioUrl(null);
    } catch (err) {
      console.error("Error starting recording:", err);
      let message = "Could not start recording.";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            message = "Microphone access denied. Please allow microphone access in your browser settings.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            message = "No microphone found. Please ensure a microphone is connected and enabled.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            message = "Microphone is already in use or cannot be accessed.";
        }
      }
      alert(message);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Note: stream tracks are stopped in onstop handler
    }
  }, [isRecording]);

  const clearAudio = useCallback(() => {
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl); // Clean up object URL
    }
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];
    // If a stream was active and not stopped (e.g., error before onstop), try to stop tracks.
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorderRef.current = null; // Ensure recorder is reset
    setIsRecording(false); // Ensure recording state is false
  }, [audioUrl]);

  return { isRecording, audioBlob, audioUrl, startRecording, stopRecording, clearAudio };
};