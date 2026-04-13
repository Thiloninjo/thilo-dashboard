// === Calendar ===
export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
  meetLink?: string;
  sopMatch?: string;
}

// === Tasks ===
export interface VaultTask {
  id: number;
  description: string;
  completed: boolean;
  dueDate?: string;
  completedDate?: string;
  source: "vault";
}

export interface TodoistTask {
  id: string;
  content: string;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  priority: number;
  labels: string[];
  source: "todoist";
}

export type Task = VaultTask | TodoistTask;

// === Habits ===
export interface HabitItem {
  id: string;
  text: string;
  type: "daily" | "habit";
  completed: boolean;
  isDue: boolean;
  streak: number;
  isAntiHabit: boolean;
}

// === Weekly Goals ===
export interface WeeklyGoal {
  text: string;
  completed: boolean;
}

export interface WeeklyGoals {
  weekNumber: number;
  year: number;
  dateRange: string;
  team: WeeklyGoal[];
  personal: WeeklyGoal[];
}

// === Change-Log ===
export interface ChangeLogEntry {
  hash: string;
  sopName: string;
  description: string;
  source: string;
  date: string;
}

// === SOPs ===
export interface Workspace {
  name: string;
  path: string;
  sopCount: number;
  lastUpdated: string;
}

export interface SOPSummary {
  name: string;
  fileName: string;
  lastUpdated: string;
  quickCheckCount: number;
  queueCount: number;
}

export interface SOPDetail {
  name: string;
  quickCheck: { text: string; checked: boolean }[];
  lessonsLearned: { date: string; text: string }[];
  queue: { text: string; checked: boolean }[];
  fullSop: string;
}

// === API Response Wrapper ===
export interface CachedResponse<T> {
  data: T;
  lastUpdated: string;
  isStale: boolean;
}

// === WebSocket Messages ===
export type WSMessage =
  | { type: "vault-changed"; file: string; priority: "high" | "low" }
  | { type: "api-updated"; source: "calendar" | "todoist" | "habitica" }
  | { type: "error"; message: string };
