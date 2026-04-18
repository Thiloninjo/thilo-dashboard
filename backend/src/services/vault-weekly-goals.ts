import { readFile } from "fs/promises";
import { join } from "path";
import { WeeklyGoals, WeeklyGoal } from "../types.js";
import { CONFIG } from "../config.js";

const CHECKBOX_REGEX = /^- \[([ x])\] (.+)$/;
const DATE_RANGE_REGEX = /\((.+?)\)/;

function parseGoals(section: string): WeeklyGoal[] {
  return section
    .split("\n")
    .map((line) => line.match(CHECKBOX_REGEX))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ text: m[2].trim(), completed: m[1] === "x" }));
}

export function parseWeeklyGoals(content: string, weekNumber: number, year: number): WeeklyGoals {
  const sections = content.split(/^(?=## )/m);
  const teamSection = sections.find((s) => s.startsWith("## Team Weekly Goals")) || "";
  const personalSection = sections.find((s) => s.startsWith("## Personal Weekly Goals")) || "";
  const headerMatch = content.match(DATE_RANGE_REGEX);
  const dateRange = headerMatch ? headerMatch[1] : "";

  return {
    weekNumber,
    year,
    dateRange,
    team: parseGoals(teamSection),
    personal: parseGoals(personalSection),
  };
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function readCurrentWeekGoals(): Promise<WeeklyGoals> {
  const now = new Date();
  const weekNumber = getISOWeekNumber(now);
  const year = now.getFullYear();
  const fileName = `KW${weekNumber}-${year}.md`;
  const filePath = join(CONFIG.vaultPath, "4 - Projekte", "Dashboard", "weekly-goals", fileName);

  try {
    const content = (await readFile(filePath, "utf-8")).replace(/\r/g, "");
    return parseWeeklyGoals(content, weekNumber, year);
  } catch {
    return { weekNumber, year, dateRange: "", team: [], personal: [] };
  }
}
