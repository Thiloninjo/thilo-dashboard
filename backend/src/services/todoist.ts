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

export async function closeTodoistTask(taskId: string): Promise<void> {
  const res = await todoistFetch(`/tasks/${taskId}/close`, { method: "POST" });
  if (!res.ok) throw new Error(`Todoist close error: ${res.status}`);
}

export async function reopenTodoistTask(taskId: string): Promise<void> {
  const res = await todoistFetch(`/tasks/${taskId}/reopen`, { method: "POST" });
  if (!res.ok) throw new Error(`Todoist reopen error: ${res.status}`);
}
