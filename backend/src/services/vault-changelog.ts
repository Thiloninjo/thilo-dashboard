import { simpleGit } from "simple-git";
import { ChangeLogEntry } from "../types.js";
import { CONFIG } from "../config.js";

const SOP_COMMIT_REGEX = /^(?:SOP|SOP-Hinweis) (.+?): (.+?) \(Quelle: (.+)\)$/;

// Map SOP names from commits to workspace/file
const SOP_MAP: Record<string, { workspace: string; file: string }> = {
  "Dreh Learnings": { workspace: "Tennis-Ring-Lual", file: "Tennis Filming SOP.md" },
  "Tennis Filming": { workspace: "Tennis-Ring-Lual", file: "Tennis Filming SOP.md" },
  "Tennis Filming SOP": { workspace: "Tennis-Ring-Lual", file: "Tennis Filming SOP.md" },
  "Longform SOP": { workspace: "Tennis-Ring-Lual", file: "Longform SOP.md" },
  "Tippvideo SOP": { workspace: "Tennis-Ring-Lual", file: "Tippvideo SOP.md" },
  "Trainingsvideo SOP": { workspace: "Tennis-Ring-Lual", file: "Trainingsvideo SOP.md" },
  "Studio-Video SOP": { workspace: "Tennis-Ring-Lual", file: "Studio-Video SOP.md" },
  "Quality Control SOP": { workspace: "Tennis-Ring-Lual", file: "Quality Control SOP.md" },
  "Filming SOP": { workspace: "Cavy", file: "Vlog Filming SOP.md" },
  "Vlog Filming SOP": { workspace: "Cavy", file: "Vlog Filming SOP.md" },
  "Tennis Editing SOP": { workspace: "Tennis-Ring-Lual", file: "Tennis Editing SOP.md" },
  "Tennis Editing": { workspace: "Tennis-Ring-Lual", file: "Tennis Editing SOP.md" },
  "Vlog Editing SOP": { workspace: "Cavy", file: "Vlog Editing SOP.md" },
};

export function parseCommitLine(line: string): ChangeLogEntry | null {
  const parts = line.split("|");
  if (parts.length < 3) return null;

  const [hash, subject, dateStr] = parts;
  const match = subject.match(SOP_COMMIT_REGEX);
  if (!match) return null;

  const sopInfo = SOP_MAP[match[1]];

  return {
    hash: hash.trim(),
    sopName: match[1],
    description: match[2],
    source: match[3],
    date: dateStr.trim().slice(0, 10),
    workspace: sopInfo?.workspace,
    sopFile: sopInfo?.file,
  };
}

export async function getChangeLog(limit = 50): Promise<ChangeLogEntry[]> {
  const git = simpleGit(CONFIG.vaultPath);
  const log = await git.raw(["log", "--format=%H|%s|%ai", "-n", String(limit * 3)]);

  return log
    .trim()
    .split("\n")
    .map(parseCommitLine)
    .filter((entry): entry is ChangeLogEntry => entry !== null)
    .slice(0, limit);
}
