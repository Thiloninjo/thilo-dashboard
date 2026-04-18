import { CONFIG } from "../config.js";

const BASE_URL = "https://app.asana.com/api/1.0";

async function asanaFetch(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${CONFIG.asana.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Asana API error: ${res.status}`);
  return res.json();
}

export interface AsanaTask {
  id: string;
  content: string;
  completed: boolean;
  dueDate: string | null;
  source: "asana";
  project?: string;
  section?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  modifiedAt?: string;
  permalink?: string;
  subtasks?: { id: string; name: string; completed: boolean }[];
  parent?: string;
}

export async function getMyTasks(): Promise<AsanaTask[]> {
  const workspaceGid = CONFIG.asana.workspaceGid;
  const userGid = "me";

  const json = await asanaFetch(
    `/user_task_lists/${userGid}/tasks?completed_since=now&opt_fields=gid,name,due_on,completed,assignee_section.name,projects.name&workspace=${workspaceGid}&limit=100`
  );

  // Fallback: use search endpoint if user_task_lists doesn't work
  return json.data.map((t: any) => ({
    id: t.gid,
    content: t.name,
    completed: t.completed || false,
    dueDate: t.due_on || null,
    source: "asana" as const,
    project: t.projects?.[0]?.name,
    section: t.assignee_section?.name,
  }));
}

export async function getMyTasksViaSearch(): Promise<AsanaTask[]> {
  const workspaceGid = CONFIG.asana.workspaceGid;

  const json = await asanaFetch(
    `/workspaces/${workspaceGid}/tasks/search?assignee.any=me&completed=false&opt_fields=gid,name,due_on,completed,assignee_section.name,projects.name,notes,tags.name,created_at,modified_at,permalink_url,num_subtasks,parent.name&limit=100`
  );

  return json.data.map((t: any) => ({
    id: t.gid,
    content: t.name,
    completed: t.completed || false,
    dueDate: t.due_on || null,
    source: "asana" as const,
    project: t.projects?.[0]?.name,
    section: t.assignee_section?.name,
    notes: t.notes || "",
    tags: t.tags?.map((tag: any) => tag.name) || [],
    createdAt: t.created_at,
    modifiedAt: t.modified_at,
    permalink: t.permalink_url,
    parent: t.parent?.name,
  }));
}

export async function getTaskDetail(taskId: string): Promise<any> {
  const json = await asanaFetch(
    `/tasks/${taskId}?opt_fields=gid,name,notes,html_notes,due_on,due_at,completed,completed_at,assignee.name,projects.name,tags.name,custom_fields,created_at,modified_at,num_subtasks,parent.name,permalink_url`
  );

  // Also fetch subtasks
  let subtasks: any[] = [];
  try {
    const subJson = await asanaFetch(`/tasks/${taskId}/subtasks?opt_fields=gid,name,completed`);
    subtasks = subJson.data || [];
  } catch { /* ignore */ }

  const t = json.data;
  return {
    id: t.gid,
    content: t.name,
    completed: t.completed || false,
    dueDate: t.due_on || null,
    source: "asana",
    project: t.projects?.[0]?.name,
    notes: t.notes || "",
    htmlNotes: t.html_notes || "",
    tags: t.tags?.map((tag: any) => tag.name) || [],
    createdAt: t.created_at,
    modifiedAt: t.modified_at,
    permalink: t.permalink_url,
    parent: t.parent?.name,
    subtasks: subtasks.map((s: any) => ({ id: s.gid, name: s.name, completed: s.completed })),
    customFields: t.custom_fields || [],
  };
}

export async function getAllMyAsanaTasks(): Promise<AsanaTask[]> {
  try {
    return await getMyTasksViaSearch();
  } catch {
    // Fallback
    return await getMyTasks();
  }
}
