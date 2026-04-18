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

export interface CachedResponse<T> {
  data: T;
  lastUpdated: string;
  isStale: boolean;
}
