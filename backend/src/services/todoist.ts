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

export async function getTodayTasks(): Promise<TodoistTask[]> {
  const res = await todoistFetch("/tasks/filter?query=today%20%7C%20overdue");
  if (!res.ok) throw new Error(`Todoist API error: ${res.status}`);
  const json = await res.json();
  const tasks = json.results || json;

  return tasks
    .filter((t: any) => !t.checked)
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

export async function closeTodoistTask(taskId: string): Promise<void> {
  const res = await todoistFetch(`/tasks/${taskId}/close`, { method: "POST" });
  if (!res.ok) throw new Error(`Todoist close error: ${res.status}`);
}

export async function reopenTodoistTask(taskId: string): Promise<void> {
  const res = await todoistFetch(`/tasks/${taskId}/reopen`, { method: "POST" });
  if (!res.ok) throw new Error(`Todoist reopen error: ${res.status}`);
}
