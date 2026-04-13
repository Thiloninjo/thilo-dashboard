import { simpleGit } from "simple-git";
import { ChangeLogEntry } from "../types.js";
import { CONFIG } from "../config.js";

const SOP_COMMIT_REGEX = /^SOP (.+?): (.+?) \(Quelle: (.+)\)$/;

export function parseCommitLine(line: string): ChangeLogEntry | null {
  const parts = line.split("|");
  if (parts.length < 3) return null;

  const [hash, subject, dateStr] = parts;
  const match = subject.match(SOP_COMMIT_REGEX);
  if (!match) return null;

  return {
    hash: hash.trim(),
    sopName: match[1],
    description: match[2],
    source: match[3],
    date: dateStr.trim().slice(0, 10),
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
