import supabase from '../supabaseClient';
import { Task, TaskStatus, ChatMessage, Department, UserRole, VoiceNoteData } from '../types';
import { SYSTEM_SENDER_ID, SYSTEM_SENDER_NAME } from '../constants';

// --- Tasks ---
export const getTasksForDepartment = async (department: Department, userRole?: UserRole): Promise<Task[]> => {
  if (!supabase) throw new Error("Supabase client not initialized.");
  
  let query = supabase.from('tasks').select('*');

  if (userRole !== UserRole.ADMIN) { // Non-admins only see their department's tasks
    query = query.eq('assigned_to_department', department);
  } else if (department !== 'ALL' as any) { // Admins can filter by specific department
    query = query.eq('assigned_to_department', department);
  }
  // If admin and department is 'ALL', no department filter is applied to fetch all tasks.

  query = query.order('due_date', { ascending: true })
               .order('status', { ascending: true }); 

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }
  
  return data.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedTo: t.assigned_to_department as Department,
      dueDate: new Date(t.due_date), 
      status: t.status as TaskStatus,
      createdBy: t.created_by_user_id,
      created_at: t.created_at ? new Date(t.created_at) : undefined
  })) as Task[];
};

export const addTask = async (taskData: Omit<Task, 'id' | 'status' | 'createdBy'> & { createdByUserId: string }): Promise<Task> => {
  if (!supabase) throw new Error("Supabase client not initialized.");
  
  const taskToInsert = {
    title: taskData.title,
    description: taskData.description,
    assigned_to_department: taskData.assignedTo,
    due_date: taskData.dueDate.toISOString(),
    status: TaskStatus.PENDING, 
    created_by_user_id: taskData.createdByUserId,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(taskToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error adding task:", error);
    throw error;
  }
  return { 
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to_department as Department,
      dueDate: new Date(data.due_date),
      status: data.status as TaskStatus,
      createdBy: data.created_by_user_id,
      created_at: data.created_at ? new Date(data.created_at) : undefined
  } as Task;
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<Task> => {
  if (!supabase) throw new Error("Supabase client not initialized.");
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
   return { 
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to_department as Department,
      dueDate: new Date(data.due_date),
      status: data.status as TaskStatus,
      createdBy: data.created_by_user_id,
      created_at: data.created_at ? new Date(data.created_at) : undefined
  } as Task;
};

// --- Chat Messages ---
export const getMessagesForDepartment = async (department: Department, currentUserId: string): Promise<ChatMessage[]> => {
  if (!supabase) throw new Error("Supabase client not initialized.");
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('department', department)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
  return data.map(msg => ({
    id: msg.id,
    sender_id: msg.sender_id,
    sender_name: msg.sender_name,
    department: msg.department as Department,
    type: msg.type as 'text' | 'voice',
    text_content: msg.text_content,
    voice_note_data: msg.voice_note_data as VoiceNoteData | undefined,
    timestamp: new Date(msg.timestamp),
    isOwnMessage: msg.sender_id === currentUserId,
  })) as ChatMessage[];
};

export const getRecentMessagesForDepartment = async (department: Department, currentUserId: string): Promise<ChatMessage[]> => {
  if (!supabase) throw new Error("Supabase client not initialized.");

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('department', department)
    .order('timestamp', { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error fetching recent messages:", error);
    throw error;
  }
  return data.map(msg => ({
    id: msg.id,
    sender_id: msg.sender_id,
    sender_name: msg.sender_name,
    department: msg.department as Department,
    type: msg.type as 'text' | 'voice',
    text_content: msg.text_content,
    voice_note_data: msg.voice_note_data as VoiceNoteData | undefined,
    timestamp: new Date(msg.timestamp),
    isOwnMessage: msg.sender_id === currentUserId,
  })).reverse() as ChatMessage[];
};


export const addMessageToDepartment = async (
  department: Department, 
  messageData: {
    senderId: string;
    senderName: string;
    type: 'text' | 'voice';
    textContent?: string;
    voiceNoteData?: VoiceNoteData;
  }
): Promise<ChatMessage> => {
  if (!supabase) throw new Error("Supabase client not initialized.");

  const messageToInsert = {
    sender_id: messageData.senderId,
    sender_name: messageData.senderName,
    department: department,
    type: messageData.type,
    text_content: messageData.textContent,
    voice_note_data: messageData.voiceNoteData,
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(messageToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error adding message:", error);
    throw error;
  }
   return {
    id: data.id,
    sender_id: data.sender_id,
    sender_name: data.sender_name,
    department: data.department as Department,
    type: data.type as 'text' | 'voice',
    text_content: data.text_content,
    voice_note_data: data.voice_note_data as VoiceNoteData | undefined,
    timestamp: new Date(data.timestamp),
    isOwnMessage: data.sender_id === messageData.senderId,
  } as ChatMessage;
};

export const addSystemNotificationToDepartment = async (department: Department, text: string): Promise<ChatMessage | null> => {
   if (!supabase) throw new Error("Supabase client not initialized.");
   
   const systemMessage = {
    sender_id: SYSTEM_SENDER_ID, 
    sender_name: SYSTEM_SENDER_NAME,
    department: department,
    type: 'text' as 'text',
    text_content: `System: ${text}`,
    timestamp: new Date().toISOString(),
   };

   try {
     const { data, error } = await supabase
      .from('chat_messages')
      .insert(systemMessage)
      .select()
      .single();

      if (error) {
        console.error("Error adding system notification:", error);
        return null; 
      }
      return {
        id: data.id,
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        department: data.department as Department,
        type: data.type as 'text' | 'voice',
        text_content: data.text_content,
        voice_note_data: undefined,
        timestamp: new Date(data.timestamp),
        isOwnMessage: data.sender_id === SYSTEM_SENDER_ID, 
      } as ChatMessage;

   } catch (e) {
      console.error("Caught exception adding system notification:", e);
      return null;
   }
};
