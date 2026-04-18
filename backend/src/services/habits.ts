import { readFile, writeFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HABITS_PATH = resolve(__dirname, "../../data/habits.json");
const LOG_PATH = resolve(__dirname, "../../data/habit-log.json");

export interface HabitDef {
  id: string;
  text: string;
  icon: string;
  type: "positive" | "negative";
  frequency: string;
  createdAt: string;
}

export type HabitLog = Record<string, Record<string, boolean>>;

export interface HabitWithStatus {
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

async function readHabits(): Promise<HabitDef[]> {
  const raw = await readFile(HABITS_PATH, "utf-8");
  return JSON.parse(raw) as HabitDef[];
}

async function writeHabits(habits: HabitDef[]): Promise<void> {
  await writeFile(HABITS_PATH, JSON.stringify(habits, null, 2), "utf-8");
}

async function readLog(): Promise<HabitLog> {
  const raw = await readFile(LOG_PATH, "utf-8");
  return JSON.parse(raw) as HabitLog;
}

async function writeLog(log: HabitLog): Promise<void> {
  await writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf-8");
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function computeStreaks(
  habit: HabitDef,
  log: HabitLog,
  today: string
): { currentStreak: number; bestStreak: number } {
  const isNegative = habit.type === "negative";

  // For positive habits: completed = marked true in log
  // For negative habits: completed (good) = NOT marked in log
  function isCompletedGood(date: string): boolean {
    const dayLog = log[date] ?? {};
    if (isNegative) {
      return !dayLog[habit.id];
    }
    return !!dayLog[habit.id];
  }

  // Current streak: walk backwards from today
  // If today is not yet completed, skip it — don't break the streak just because the day isn't over
  const allDates = dateRange(habit.createdAt, today);
  let currentStreak = 0;
  for (let i = allDates.length - 1; i >= 0; i--) {
    const date = allDates[i];
    if (date === today && !isCompletedGood(date)) {
      continue;
    }
    if (isCompletedGood(date)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Best streak: scan all days from creation
  let bestStreak = 0;
  let run = 0;
  for (const date of allDates) {
    if (isCompletedGood(date)) {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 0;
    }
  }

  return { currentStreak, bestStreak };
}

export async function getAllHabitsWithStatus(): Promise<HabitWithStatus[]> {
  const [habits, log] = await Promise.all([readHabits(), readLog()]);
  const today = todayStr();

  return habits.map((habit) => {
    const { currentStreak, bestStreak } = computeStreaks(habit, log, today);
    const isNegative = habit.type === "negative";
    const markedToday = !!(log[today] ?? {})[habit.id];

    // For positive habits: completed = marked today
    // For negative habits: completed = marked today (meaning streak broken, bad thing done)
    const completed = markedToday;

    return {
      id: habit.id,
      text: habit.text,
      icon: habit.icon,
      type: "daily" as const,
      completed,
      isDue: true,
      streak: currentStreak,
      bestStreak,
      isAntiHabit: isNegative,
    };
  });
}

export async function scoreHabit(id: string, direction?: string): Promise<void> {
  const log = await readLog();
  const today = todayStr();
  if (!log[today]) log[today] = {};

  if (direction === "down") {
    delete log[today][id];
  } else {
    log[today][id] = true;
  }
  await writeLog(log);
}

export async function createHabit(habit: Omit<HabitDef, "createdAt"> & { createdAt?: string }): Promise<HabitDef> {
  const habits = await readHabits();
  if (habits.length >= 12) {
    throw new Error("Maximum of 12 habits reached");
  }
  const newHabit: HabitDef = {
    ...habit,
    createdAt: habit.createdAt ?? todayStr(),
  };
  habits.push(newHabit);
  await writeHabits(habits);
  return newHabit;
}

export async function updateHabit(
  id: string,
  updates: Partial<Pick<HabitDef, "text" | "icon" | "type">>
): Promise<HabitDef> {
  const habits = await readHabits();
  const idx = habits.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error(`Habit not found: ${id}`);
  habits[idx] = { ...habits[idx], ...updates };
  await writeHabits(habits);
  return habits[idx];
}

export async function deleteHabit(id: string): Promise<void> {
  const habits = await readHabits();
  const filtered = habits.filter((h) => h.id !== id);
  if (filtered.length === habits.length) throw new Error(`Habit not found: ${id}`);
  await writeHabits(filtered);
  // Log history is preserved intentionally
}
