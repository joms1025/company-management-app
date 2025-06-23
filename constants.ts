import { Department, UserRole, User } from './types';

export const ALL_DEPARTMENTS_LIST: Department[] = [
  Department.LS,
  Department.OFFICE,
  Department.HOUSE,
  Department.MANAGER,
  // Department.ALL_BOSS, // All Boss might be a conceptual group, not a selectable chat channel for non-admins
  Department.EL_NIDO,
];

// Departments available for general chat. Admins might have more options.
export const CHAT_ENABLED_DEPARTMENTS: Department[] = [
  Department.LS,
  Department.OFFICE,
  Department.HOUSE,
  Department.MANAGER,
  Department.EL_NIDO,
  Department.ALL_DEPARTMENTS, // For Admin broadcasts
];

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';
export const GEMINI_MODEL_IMAGE = 'imagen-3.0-generate-002';

export const MOCK_USERS: User[] = [
  { id: 'user1', name: 'John Doe', email: 'john.doe@example.com', role: UserRole.USER, department: Department.HOUSE },
  { id: 'admin1', name: 'Alice Admin', email: 'alice.admin@example.com', role: UserRole.ADMIN, department: Department.MANAGER }, // First Admin
  { id: 'user3', name: 'Bob User', email: 'bob.user@example.com', role: UserRole.USER, department: Department.OFFICE },
  { id: 'user4', name: 'Carol Guest', email: 'carol.guest@example.com', role: UserRole.USER, department: Department.LS },
  { id: 'admin2', name: 'Dave Supervisor', email: 'dave.supervisor@example.com', role: UserRole.ADMIN, department: Department.ALL_DEPARTMENTS }, // Second Admin, department can be conceptual for admin
];

// Initial user can be set in AuthContext, or handled by a login flow.
// For demo, AuthContext might pick the first user or first admin.
// export const DEFAULT_USER_ID = 'user1'; 
// export const ADMIN_USER_ID = 'admin1';

export const SYSTEM_SENDER_ID = 'system';
export const SYSTEM_SENDER_NAME = 'System Notification';