import { CONFIG } from "../config.js";
import { TodoistTask } from "../types.js";

const BASE_URL = "https://todoist.com/api/v1";

async function todoistFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CONFIG.todoist.apiToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function getTasksForDate(date?: string): Promise<TodoistTask[]> {
  // Todoist filter: use natural language date format
  let query: string;
  if (!date) {
    query = "today | overdue";
  } else {
    // Format as "Apr 16 2026" for Todoist
    const d = new Date(date + "T12:00:00");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    query = `${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
  }
  const res = await todoistFetch(`/tasks/filter?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Todoist API error: ${res.status}`);
  const json = await res.json();
  const tasks = json.results || json;

  return tasks
    .filter((t: any) => {
      if (t.checked) return false;
      // If filtering by specific date, only return exact matches
      if (date && t.due?.date) {
        const taskDate = t.due.date.slice(0, 10);
        return taskDate === date;
      }
      return true;
    })
    .map((t: any) => ({
      id: t.id,
      content: t.content,
      completed: false,
      dueDate: t.due?.date?.slice(0, 10) || undefined,
      dueTime: t.due?.date?.includes("T") ? t.due.date : undefined,
      priority: t.priority,
      labels: t.labels || [],
      source: "todoist" as const,
    }));
}

export const getTodayTasks = () => getTasksForDate();

// Fetch all recurring tasks and check if they'd occur on the given date
async function getRecurringTasksForDate(date: string): Promise<TodoistTask[]> {
  const res = await todoistFetch("/tasks/filter?query=recurring");
  if (!res.ok) return [];
  const json = await res.json();
  const tasks = json.results || json || [];
  const targetDate = new Date(date + "T12:00:00");

  return tasks
    .filter((t: any) => {
      if (!t.due?.is_recurring || !t.due?.date || t.checked) return false;
      const dueStr = t.due.string?.toLowerCase() || "";
      const firstDue = new Date(t.due.date.slice(0, 10) + "T12:00:00");

      // "every 2 weeks" pattern
      const biweekly = dueStr.match(/every\s+2\s+weeks/i);
      if (biweekly) {
        const diffMs = targetDate.getTime() - firstDue.getTime();
        const diffDays = Math.round(diffMs / 86400000);
        return diffDays >= 0 && diffDays % 14 === 0;
      }

      // "every week" / "every monday" etc
      const weekly = dueStr.match(/every\s+(week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/i);
      if (weekly) {
        const diffMs = targetDate.getTime() - firstDue.getTime();
        const diffDays = Math.round(diffMs / 86400000);
        return diffDays >= 0 && diffDays % 7 === 0;
      }

      // "every day"
      if (dueStr.includes("every day") || dueStr.includes("daily")) {
        return targetDate >= firstDue;
      }

      // "every month"
      if (dueStr.includes("every month")) {
        return targetDate.getDate() === firstDue.getDate() && targetDate >= firstDue;
      }

      return false;
    })
    .map((t: any) => ({
      id: t.id,
      content: t.content,
      completed: false,
      dueDate: date,
      priority: t.priority,
      labels: t.labels || [],
      source: "todoist" as const,
    }));
}

export async function getTasksForDateWithRecurring(date: string): Promise<TodoistTask[]> {
  const [regular, recurring] = await Promise.all([
    getTasksForDate(date),
    getRecurringTasksForDate(date),
  ]);

  // Deduplicate — don't add recurring if already in regular results
  const regularIds = new Set(regular.map(t => t.id));
  const extra = recurring.filter(t => !regularIds.has(t.id));
  return [...regular, ...extra];
}

export async function closeTodoistTask(taskId: string): Promise<void> {
  const res = await todoistFetch(`/tasks/${taskId}/close`, { method: "POST" });
  if (!res.ok) throw new Error(`Todoist close error: ${res.status}`);
}

export async function reopenTodoistTask(taskId: string): Promise<void> {
  const res = await todoistFetch(`/tasks/${taskId}/reopen`, { method: "POST" });
  if (!res.ok) throw new Error(`Todoist reopen error: ${res.status}`);
}
