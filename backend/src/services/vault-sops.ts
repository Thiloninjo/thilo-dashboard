import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { Workspace, SOPSummary, SOPDetail } from "../types.js";
import { CONFIG } from "../config.js";

const CHECKBOX_REGEX = /^- \[([ x])\] (.+)$/;
const LESSON_REGEX = /^- \((.+?)\) (.+)$/;

export function parseSOPDetail(content: string): SOPDetail {
  const titleMatch = content.match(/^# (.+)$/m);
  const name = titleMatch ? titleMatch[1] : "Unbenannte SOP";

  const sections = content.split(/^(?=## )/m);

  const quickCheckSection = sections.find((s) => s.match(/^## Quick-Check/)) || "";
  const lessonsSection = sections.find((s) => s.startsWith("## Lessons Learned")) || "";
  const queueSection = sections.find((s) => s.match(/^## Ausarbeitungs-Queue/)) || "";
  const fullSopSection = sections.find((s) => s.match(/^## Vollst/)) || "";

  const quickCheck = quickCheckSection
    .split("\n")
    .map((l) => l.match(CHECKBOX_REGEX))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ text: m[2].trim(), checked: m[1] === "x" }));

  const lessonsLearned = lessonsSection
    .split("\n")
    .map((l) => l.match(LESSON_REGEX))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ date: m[1], text: m[2].trim() }));

  const queue = queueSection
    .split("\n")
    .map((l) => l.match(CHECKBOX_REGEX))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ text: m[2].trim(), checked: m[1] === "x" }));

  return { name, quickCheck, lessonsLearned, queue, fullSop: fullSopSection };
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const basePath = join(CONFIG.vaultPath, "4- Workspaces");
  const entries = await readdir(basePath, { withFileTypes: true });

  const workspaces: Workspace[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sopDir = join(basePath, entry.name, "01_SOPs");
    try {
      const sopFiles = (await readdir(sopDir)).filter((f) => f.endsWith(".md"));
      const stats = await stat(sopDir);
      workspaces.push({
        name: entry.name,
        path: entry.name,
        sopCount: sopFiles.length,
        lastUpdated: stats.mtime.toISOString(),
      });
    } catch {
      // No 01_SOPs directory — skip
    }
  }
  return workspaces;
}

export async function getSOPsForWorkspace(workspace: string): Promise<SOPSummary[]> {
  const sopDir = join(CONFIG.vaultPath, "4- Workspaces", workspace, "01_SOPs");
  const files = (await readdir(sopDir)).filter((f) => f.endsWith(".md"));

  const summaries: SOPSummary[] = [];
  for (const file of files) {
    const filePath = join(sopDir, file);
    const content = await readFile(filePath, "utf-8");
    const detail = parseSOPDetail(content);
    const stats = await stat(filePath);
    summaries.push({
      name: detail.name,
      fileName: file,
      lastUpdated: stats.mtime.toISOString(),
      quickCheckCount: detail.quickCheck.length,
      queueCount: detail.queue.filter((q) => !q.checked).length,
    });
  }
  return summaries;
}

export async function getSOPDetail(workspace: string, sopFile: string): Promise<SOPDetail> {
  const filePath = join(CONFIG.vaultPath, "4- Workspaces", workspace, "01_SOPs", sopFile);
  const content = await readFile(filePath, "utf-8");
  return parseSOPDetail(content);
}
