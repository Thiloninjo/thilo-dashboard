import { readFile, writeFile, rename } from "fs/promises";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
import { VaultTask } from "../types.js";
import { CONFIG } from "../config.js";

const TASK_REGEX = /^- \[([ x])\] (.+?)(?:\s*📅\s*(\d{4}-\d{2}-\d{2}))?(?:\s*✅\s*(\d{4}-\d{2}-\d{2}))?$/u;

export function parseTasks(content: string): VaultTask[] {
  const lines = content.split("\n");
  const tasks: VaultTask[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(TASK_REGEX);
    if (match) {
      tasks.push({
        id: i + 1,
        description: match[2].trim(),
        completed: match[1] === "x",
        dueDate: match[3] || undefined,
        completedDate: match[4] || undefined,
        source: "vault",
      });
    }
  }

  return tasks;
}

export function toggleTask(content: string, lineNumber: number): string {
  const lines = content.split("\n");
  const idx = lineNumber - 1;
  const line = lines[idx];
  if (!line) return content;

  const match = line.match(TASK_REGEX);
  if (!match) return content;

  const wasCompleted = match[1] === "x";
  const today = new Date().toISOString().slice(0, 10);

  if (wasCompleted) {
    lines[idx] = line
      .replace("- [x]", "- [ ]")
      .replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/, "");
  } else {
    lines[idx] = line.replace("- [ ]", "- [x]") + ` ✅ ${today}`;
  }

  return lines.join("\n");
}

export async function readTasks(): Promise<VaultTask[]> {
  const filePath = join(CONFIG.vaultPath, "--Aufgaben--.md");
  const content = (await readFile(filePath, "utf-8")).replace(/\r/g, "");
  return parseTasks(content);
}

export async function toggleVaultTask(lineNumber: number): Promise<VaultTask[]> {
  const filePath = join(CONFIG.vaultPath, "--Aufgaben--.md");
  const content = (await readFile(filePath, "utf-8")).replace(/\r/g, "");
  const updated = toggleTask(content, lineNumber);

  const tmpPath = join(dirname(filePath), `.aufgaben-tmp-${randomUUID()}.md`);
  await writeFile(tmpPath, updated, "utf-8");
  await rename(tmpPath, filePath);

  return parseTasks(updated);
}
