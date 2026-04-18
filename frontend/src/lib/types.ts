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

export interface Task {
  id: number | string;
  description?: string;
  content?: string;
  completed: boolean;
  dueDate?: string;
  source: "vault" | "todoist" | "asana";
  priority?: number;
  labels?: string[];
}

export interface HabitItem {
  id: string;
  text: string;
  icon: string;
  type: "daily" | "habit";
  completed: boolean;
  isDue: boolean;
  streak: number;
  bestStreak: number;
  isAntiHabit: boolean;
}

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

export interface ChangeLogEntry {
  hash: string;
  sopName: string;
  description: string;
  source: string;
  date: string;
  workspace?: string;
  sopFile?: string;
}

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
  rawContent: string;
  quickCheck: { text: string; checked: boolean }[];
  lessonsLearned: { date: string; text: string }[];
  queue: { text: string; checked: boolean }[];
  fullSop: string;
}

export interface CachedResponse<T> {
  data: T;
  lastUpdated: string;
  isStale: boolean;
}
