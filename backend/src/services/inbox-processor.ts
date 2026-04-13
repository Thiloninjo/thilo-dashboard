import { CONFIG } from "../config.js";
import { google } from "googleapis";
import { readFile } from "fs/promises";

// === Intent Detection ===

interface Intent {
  type: "task" | "calendar" | "complete" | "unknown";
  content: string;
  time?: string; // HH:MM
  date?: string; // YYYY-MM-DD
}

const TODAY = () => new Date().toISOString().slice(0, 10);

function parseTime(text: string): string | undefined {
  // "um 17:00", "um 17 Uhr", "um 5", "17:00"
  const match = text.match(/(?:um\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:uhr)?/i);
  if (!match) return undefined;
  const hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  if (hours < 0 || hours > 23) return undefined;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseDate(text: string): string {
  const today = new Date();
  if (/morgen/i.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }
  if (/übermorgen/i.test(text)) {
    const day = new Date(today);
    day.setDate(day.getDate() + 2);
    return day.toISOString().slice(0, 10);
  }
  // "am Montag", "am Dienstag", etc.
  const days: Record<string, number> = {
    montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4,
    freitag: 5, samstag: 6, sonntag: 0,
  };
  const dayMatch = text.match(/(?:am\s+)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/i);
  if (dayMatch) {
    const targetDay = days[dayMatch[1].toLowerCase()];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    const target = new Date(today);
    target.setDate(target.getDate() + diff);
    return target.toISOString().slice(0, 10);
  }
  return TODAY();
}

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();

  // === COMPLETE: "X abgeschlossen/erledigt/fertig/gemacht/done" or "hab X gemacht" ===
  if (/(?:abgeschlossen|erledigt|fertig|abhaken|done|gemacht)\s*$/i.test(lower) ||
      /^(?:hab|habe)\s+.+\s+(?:erledigt|abgeschlossen|fertig|gemacht)/i.test(lower) ||
      /^(?:hab|habe)\s+(?:die|den|das|meine?)?\s*.+\s+(?:erledigt|abgeschlossen|fertig|gemacht)/i.test(lower)) {
    const content = text
      .replace(/\s*(?:abgeschlossen|erledigt|fertig|abhaken|done|gemacht)\s*$/i, "")
      .replace(/^(?:hab|habe)\s+(?:die|den|das|meine?)?\s*/i, "")
      .replace(/\s+(?:erledigt|abgeschlossen|fertig|gemacht)\s*$/i, "")
      .replace(/\s+für heute$/i, "")
      .trim();
    return { type: "complete", content };
  }

  // === CALENDAR: explicit "neuer Termin" prefix only ===
  if (/^(?:neuer?\s+)?termin[:\s]/i.test(lower)) {
    const content = text
      .replace(/^(?:neuer?\s+)?termin[:\s]*/i, "")
      .trim();
    const time = parseTime(text);
    const date = parseDate(text);
    return { type: "calendar", content, time, date };
  }

  // === TASK: explicit prefix only — "neue To-Do", "neue Task", "neue Aufgabe" ===
  if (/^(?:neue?[sr]?\s+)?(?:to[ -]?do|task|aufgabe)[:\s]/i.test(lower)) {
    const content = text
      .replace(/^(?:neue?[sr]?\s+)?(?:to[ -]?do|task|aufgabe)[:\s]*/i, "")
      .trim();
    const date = parseDate(text);
    const time = parseTime(text);
    return { type: "task", content, date, time };
  }

  // Default: NOT a task — just a note. Return "unknown" so it only goes to Obsidian.
  return { type: "unknown", content: text.trim() };
}

// === Actions ===

async function createTodoistTask(content: string, date: string, time?: string): Promise<{ success: boolean; id?: string }> {
  const dueString = time ? `${date}T${time}:00` : date;

  const res = await fetch("https://todoist.com/api/v1/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CONFIG.todoist.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      due_date: dueString,
    }),
  });

  if (!res.ok) return { success: false };
  const data = await res.json();
  return { success: true, id: data.id };
}

async function createCalendarEvent(summary: string, date: string, time?: string): Promise<{ success: boolean }> {
  try {
    const tokenRaw = await readFile(CONFIG.google.tokenPath, "utf-8");
    const tokens = JSON.parse(tokenRaw);

    const oauth2Client = new google.auth.OAuth2(
      CONFIG.google.clientId,
      CONFIG.google.clientSecret,
      CONFIG.google.redirectUri
    );
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    let start: any;
    let end: any;

    if (time) {
      const startDT = `${date}T${time}:00`;
      const endHour = parseInt(time.split(":")[0]) + 1;
      const endDT = `${date}T${String(endHour).padStart(2, "0")}:${time.split(":")[1]}:00`;
      start = { dateTime: startDT, timeZone: "Europe/Berlin" };
      end = { dateTime: endDT, timeZone: "Europe/Berlin" };
    } else {
      start = { date };
      end = { date };
    }

    await calendar.events.insert({
      calendarId: "primary",
      requestBody: { summary, start, end },
    });

    return { success: true };
  } catch (err) {
    console.error("Calendar event creation failed:", err);
    return { success: false };
  }
}

async function completeTask(searchText: string): Promise<{ success: boolean; task?: string; source?: string }> {
  const searchLower = searchText.toLowerCase();

  // 1. Try Habitica first (habits + dailies)
  try {
    const habRes = await fetch("https://habitica.com/api/v3/tasks/user?type=dailys", {
      headers: {
        "x-api-user": CONFIG.habitica.userId,
        "x-api-key": CONFIG.habitica.apiToken,
        "x-client": "thilo-dashboard",
      },
    });
    if (habRes.ok) {
      const habJson = await habRes.json();
      const dailies = habJson.data || [];
      const habitMatch = dailies.find((d: any) =>
        d.isDue && !d.completed && (
          d.text.toLowerCase().includes(searchLower) ||
          searchLower.includes(d.text.toLowerCase())
        )
      );
      if (habitMatch) {
        const scoreRes = await fetch(`https://habitica.com/api/v3/tasks/${habitMatch.id}/score/up`, {
          method: "POST",
          headers: {
            "x-api-user": CONFIG.habitica.userId,
            "x-api-key": CONFIG.habitica.apiToken,
            "x-client": "thilo-dashboard",
          },
        });
        if (scoreRes.ok) return { success: true, task: habitMatch.text, source: "habitica" };
      }
    }
  } catch {}

  // 2. Try Todoist
  try {
    const res = await fetch("https://todoist.com/api/v1/tasks/filter?query=today%20%7C%20overdue", {
      headers: { Authorization: `Bearer ${CONFIG.todoist.apiToken}` },
    });
    if (res.ok) {
      const json = await res.json();
      const tasks = json.results || [];
      const match = tasks.find((t: any) =>
        t.content.toLowerCase().includes(searchLower) ||
        searchLower.includes(t.content.toLowerCase())
      );
      if (match) {
        const closeRes = await fetch(`https://todoist.com/api/v1/tasks/${match.id}/close`, {
          method: "POST",
          headers: { Authorization: `Bearer ${CONFIG.todoist.apiToken}` },
        });
        if (closeRes.ok) return { success: true, task: match.content, source: "todoist" };
      }
    }
  } catch {}

  return { success: false };
}

// === Main Processor ===

export interface InboxResult {
  intent: Intent;
  success: boolean;
  message: string;
}

export async function processInboxMessage(text: string): Promise<InboxResult> {
  const intent = detectIntent(text);

  switch (intent.type) {
    case "task": {
      const result = await createTodoistTask(intent.content, intent.date || TODAY(), intent.time);
      return {
        intent,
        success: result.success,
        message: result.success
          ? `Task erstellt: "${intent.content}" (${intent.date}${intent.time ? ` ${intent.time}` : ""})`
          : "Task konnte nicht erstellt werden",
      };
    }

    case "calendar": {
      const result = await createCalendarEvent(intent.content, intent.date || TODAY(), intent.time);
      return {
        intent,
        success: result.success,
        message: result.success
          ? `Termin erstellt: "${intent.content}" (${intent.date}${intent.time ? ` ${intent.time}` : ""})`
          : "Termin konnte nicht erstellt werden",
      };
    }

    case "complete": {
      const result = await completeTask(intent.content);
      return {
        intent,
        success: result.success,
        message: result.success
          ? `Erledigt: "${result.task}"`
          : `Keine passende Task gefunden fuer "${intent.content}"`,
      };
    }

    default:
      return {
        intent,
        success: false,
        message: "Konnte nicht verstehen was zu tun ist",
      };
  }
}
