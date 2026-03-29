export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum SubmissionStatus {
  Submitted = 'Submitted',
  NotSubmitted = 'Not Submitted',
}

export type View = 'dashboard' | 'schedule' | 'tasks' | 'quizzes' | 'assignments' | 'notes' | 'profile' | 'pomodoro';

export type Language = 'en' | 'ar';

export interface Class {
  id: string;
  subject: string;
  time: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  color: string;
  instructor: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  dueDate: string;
  createdAt?: string;
}

export interface Quiz {
  id: string;
  subject: string;
  date: string;
  materialsUrl?: string;
  createdAt?: string;
  completed?: boolean;
}

export interface Assignment {
  id: string;
  subject: string;
  title: string;
  description: string;
  status: SubmissionStatus;
  file?: File;
  dueDate: string;
  createdAt?: string;
}

export interface Note {
  id: string;
  subject: string;
  title: string;
  content: string;
  lastUpdated: string;
  createdAt?: string;
  isPublic?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AnyItem = Class | Task | Quiz | Assignment | Note;
export type ModalContent = {
  view: 'schedule' | 'tasks' | 'quizzes' | 'assignments' | 'notes';
  item?: AnyItem;
};
