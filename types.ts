export enum UserRole {
  USER = 'User',
  ADMIN = 'Admin',
}

// Reflects data combined from Supabase auth.users and a custom 'profiles' table
export interface User {
  id: string; // Supabase auth.user.id (UUID string)
  name: string; // From profiles table
  email: string; // From auth.users or profiles table
  // password?: string; // Password is not stored on the client with Supabase
  role: UserRole; // From profiles table
  department: Department; // From profiles table
  // Supabase often uses app_metadata (for protected info) or user_metadata (for public info)
  // These might be available on the SupabaseUser object directly or via JWT.
  // For simplicity, we'll assume our AuthContext hydrates these into the User object.
}

export enum Department {
  LS = 'LS',
  OFFICE = 'Office',
  HOUSE = 'House',
  MANAGER = 'Manager',
  ALL_BOSS = 'All Boss',
  EL_NIDO = 'El Nido',
  ALL_DEPARTMENTS = 'All Departments' // For admin broadcasts/calls
}

export interface VoiceNoteData {
  originalAudioUrl?: string;
  originalTranscription: string; 
  detectedLanguage: string; 
  translatedText: string; 
  summary?: string;
}

export interface ChatMessage {
  id: string; // UUID from Supabase
  sender_id: string; // User ID of the sender (from auth.users)
  sender_name: string; // Denormalized name of the sender (from profiles)
  department: Department;
  type: 'text' | 'voice';
  text_content?: string; // Column name in Supabase table for text messages
  voice_note_data?: VoiceNoteData; // Column name in Supabase (JSONB)
  timestamp: Date; // Supabase TIMESTAMPTZ
  isOwnMessage?: boolean; // UI helper, not stored in DB
}

export enum TaskStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

export interface Task {
  id: string; // UUID from Supabase
  title: string;
  description?: string; // Optional description
  assignedTo: Department; // Supabase column: assigned_to_department
  dueDate: Date; // Supabase column: due_date (TIMESTAMPTZ)
  status: TaskStatus;
  createdBy: string; // Supabase column: created_by_user_id (UUID string)
  created_at?: Date; // Supabase column: created_at (TIMESTAMPTZ), optional in type
}


export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: GroundingChunkWeb;
}
