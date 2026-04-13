import { readFile, readdir, rename, mkdir } from "fs/promises";
import { join, basename } from "path";
import { CONFIG } from "../config.js";
import { closeTodoistTask } from "./todoist.js";

const HANDY_NOTE_DIR = "1 - Meine Notizen/Handy Note Dump";
const ARCHIVE_DIR = "1 - Meine Notizen/Handy Note Dump/Archiv";

// ONLY explicit prefixes trigger task creation — no guessing
const TASK_PATTERNS = [
  /^(?:neue?[sr]?\s+)?(?:to[ -]?do|task|aufgabe)[:\s]+(.+?)(?:\.|$)/im,
];

// Not needed anymore since we only match explicit prefixes,
// but kept as safety net
const NOT_TASK_PATTERNS: RegExp[] = [];

interface ExtractedTask {
  content: string;
  sourceFile: string;
  sourceText: string;
}

function extractTasks(content: string, fileName: string): ExtractedTask[] {
  const text = content.trim();

  // Skip if it matches "not a task" patterns
  for (const pattern of NOT_TASK_PATTERNS) {
    if (pattern.test(text)) return [];
  }

  const tasks: ExtractedTask[] = [];

  for (const pattern of TASK_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let taskContent = match[1].trim();
      // Clean up: remove trailing filler words
      taskContent = taskContent.replace(/\s+(halt|eben|noch|quasi|sozusagen)$/i, "").trim();
      // Capitalize first letter
      taskContent = taskContent.charAt(0).toUpperCase() + taskContent.slice(1);

      if (taskContent.length > 5 && taskContent.length < 200) {
        tasks.push({
          content: taskContent,
          sourceFile: fileName,
          sourceText: text,
        });
      }
      break; // One task per note
    }
  }

  return tasks;
}

const TODOIST_BASE = "https://todoist.com/api/v1";

async function createTodoistTask(content: string): Promise<boolean> {
  const token = CONFIG.todoist.apiToken;
  if (!token) return false;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${TODOIST_BASE}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        due_date: today,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Track which files we've already processed this session
const processedFiles = new Set<string>();

export async function processNewHandyNotes(): Promise<string[]> {
  const dirPath = join(CONFIG.vaultPath, HANDY_NOTE_DIR);
  const archivePath = join(CONFIG.vaultPath, ARCHIVE_DIR);

  let files: string[];
  try {
    files = (await readdir(dirPath)).filter(
      (f) => f.startsWith("Handy Note from") && f.endsWith(".md")
    );
  } catch {
    return [];
  }

  const created: string[] = [];

  for (const file of files) {
    if (processedFiles.has(file)) continue;

    const filePath = join(dirPath, file);
    const content = await readFile(filePath, "utf-8");
    const tasks = extractTasks(content, file);

    for (const task of tasks) {
      const success = await createTodoistTask(task.content);
      if (success) {
        created.push(task.content);
        console.log(`[Handy-Note → Todoist] "${task.content}" (from ${file})`);
      }
    }

    processedFiles.add(file);
  }

  return created;
}

// Check for new notes every 10 seconds
export function startHandyNoteWatcher(): void {
  // Initial scan
  processNewHandyNotes();

  setInterval(processNewHandyNotes, 10_000);
}
