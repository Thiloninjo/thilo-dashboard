import { CONFIG } from "../config.js";
import { HabitItem } from "../types.js";

const BASE_URL = "https://habitica.com/api/v3";

async function habiticaFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "x-api-user": CONFIG.habitica.userId,
      "x-api-key": CONFIG.habitica.apiToken,
      "x-client": "thilo-dashboard",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function getDailies(): Promise<HabitItem[]> {
  const res = await habiticaFetch("/tasks/user?type=dailys");
  if (!res.ok) throw new Error(`Habitica API error: ${res.status}`);
  const json = await res.json();

  return json.data
    .filter((d: any) => d.isDue)
    .map((d: any) => ({
      id: d.id,
      text: d.text,
      type: "daily" as const,
      completed: d.completed,
      isDue: d.isDue,
      streak: d.streak || 0,
      isAntiHabit: d.text.toLowerCase().includes("kein") || d.text.toLowerCase().includes("nicht") || d.text.toLowerCase().includes("no "),
    }));
}

export async function getHabits(): Promise<HabitItem[]> {
  const res = await habiticaFetch("/tasks/user?type=habits");
  if (!res.ok) throw new Error(`Habitica API error: ${res.status}`);
  const json = await res.json();

  return json.data.map((h: any) => ({
    id: h.id,
    text: h.text,
    type: "habit" as const,
    completed: false,
    isDue: true,
    streak: h.counterUp || 0,
    isAntiHabit: h.up === false && h.down === true,
  }));
}

export async function getAllHabits(): Promise<HabitItem[]> {
  const [dailies, habits] = await Promise.all([getDailies(), getHabits()]);
  return [...dailies, ...habits];
}

export async function scoreHabit(taskId: string, direction: "up" | "down"): Promise<void> {
  const res = await habiticaFetch(`/tasks/${taskId}/score/${direction}`, { method: "POST" });
  if (!res.ok) throw new Error(`Habitica score error: ${res.status}`);
}
