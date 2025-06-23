
import { GoogleGenAI, Part, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT } from '../constants';
import { VoiceNoteData } from '../types'; // Using VoiceNoteData as the expected output structure

// API key MUST be obtained exclusively from process.env.API_KEY
const API_KEY_FOR_GEMINI = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (API_KEY_FOR_GEMINI && API_KEY_FOR_GEMINI.trim() !== "") {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY_FOR_GEMINI });
    console.log("Gemini API client initialized successfully using process.env.API_KEY.");
  } catch (error: any) {
    console.error("Error initializing GoogleGenAI with process.env.API_KEY:", error.message);
    ai = null;
  }
} else {
  console.warn(
    "Gemini API client could not be initialized. " +
    "process.env.API_KEY is missing, empty, or invalid. This is a required environment variable."
  );
}


/**
 * Helper function to convert a File object to a GoogleGenAI.Part object.
 * @param file The file to convert.
 * @returns A promise that resolves to the Generative AI Part.
 */
async function fileToGenerativePart(file: File): Promise<Part> {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result) {
            resolve((reader.result as string).split(',')[1]);
        } else {
            reject(new Error("File could not be read for base64 conversion."));
        }
    };
    reader.onerror = () => {
        reject(new Error("FileReader error while reading file."));
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
}

/**
 * Processes an audio file using the Google Gemini API to get transcription,
 * language detection, and English translation.
 * @param audioFile The audio file to process.
 * @returns A Promise that resolves to a VoiceNoteData object.
 */
export const processAudioWithGemini = async (audioFile: File): Promise<Partial<VoiceNoteData>> => {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. process.env.API_KEY might be missing or invalid. Please check app configuration and ensure the API_KEY environment variable is set correctly.");
  }

  try {
    console.log("Attempting to process audio with Gemini...");

    const audioDataPart = await fileToGenerativePart(audioFile);

    const promptTextPart = {
        text: `
        You are an expert multilingual audio processing assistant.
        The provided audio needs to be processed.

        Task:
        1. Transcribe the audio. If the audio is unclear or empty, state "[Transcription unavailable]".
        2. Identify the language of the transcribed text. If the language cannot be reliably identified, state "Unknown".
        3. Translate the original transcribed text into English. If the transcription is "[Transcription unavailable]", the translation should also be "[Transcription unavailable]".
        4. Provide a concise summary of the English translation (1-2 sentences). If the translation is "[Transcription unavailable]", the summary should be "N/A".
        5. Return the result as a VALID JSON object with the following exact keys: "originalTranscription", "detectedLanguage", "translatedText", "summary".
        
        Example JSON output format:
        {
          "originalTranscription": "こんにちは、世界。",
          "detectedLanguage": "Japanese",
          "translatedText": "Hello, world.",
          "summary": "A simple greeting."
        }

        Ensure the entire response is only the JSON object, without any markdown fences (like \`\`\`json) or other explanatory text.
        If the audio is very short or contains no discernible speech, provide appropriate values like "[No speech detected]" for transcription.
      `,
    };
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT, 
      contents: [ { parts: [promptTextPart, audioDataPart] } ],
      config: {
        responseMimeType: "application/json",
      }
    });
    
    if (!response || !response.text) {
        console.error("Gemini API returned an empty or invalid response object/text.", response);
        throw new Error("Received empty or invalid response from AI.");
    }

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr) as Omit<VoiceNoteData, 'originalAudioUrl'>; 
       if (
        typeof parsedData.originalTranscription === 'undefined' ||
        typeof parsedData.detectedLanguage === 'undefined' ||
        typeof parsedData.translatedText === 'undefined'
      ) {
        console.error("Parsed JSON is missing required fields for VoiceNoteData:", parsedData, "Raw JSON string:", jsonStr);
        throw new Error("Received malformed JSON response from AI (missing fields).");
      }
      return parsedData;
    } catch (e: any) {
      console.error("Failed to parse JSON response from Gemini:", e, "Raw text from AI:", response.text, "Processed JSON string:", jsonStr);
      const fallbackSummary = "Could not generate summary due to parsing error.";
       if (response.text && response.text.toLowerCase().includes("error")) {
         return {
          originalTranscription: "[Error in AI response]",
          detectedLanguage: "Unknown",
          translatedText: `AI returned an error: ${response.text.substring(0,100)}...`,
          summary: fallbackSummary
        };
      }
      return {
        originalTranscription: "[Unparseable AI response]",
        detectedLanguage: "Unknown",
        translatedText: `Could not parse AI response. Raw: ${response.text.substring(0, 100)}...`,
        summary: fallbackSummary
      };
    }

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    if (error.message && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
        throw new Error("Invalid or missing Gemini API Key. Please verify the process.env.API_KEY and ensure it has permissions for the Gemini API.");
    }
     if (error.message && error.message.includes('Quota')) {
        throw new Error("Gemini API quota exceeded. Please check your quota limits.");
    }
    throw new Error(`Gemini API request failed: ${error.message || 'Unknown error'}`);
  }
};