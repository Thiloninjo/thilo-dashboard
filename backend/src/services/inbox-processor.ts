import { CONFIG } from "../config.js";
import { google } from "googleapis";
import { readFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";

// === Intent Detection via Claude Haiku ===

interface Intent {
  type: "task" | "calendar" | "complete" | "delete" | "note";
  title: string;
  time?: string; // HH:MM
  date?: string; // YYYY-MM-DD
  searchTerm?: string; // for complete/delete: what to search for
}

const TODAY = () => new Date().toISOString().slice(0, 10);
const NOW_TIME = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

async function detectIntents(text: string): Promise<Intent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return [{ type: "note", title: text }];
  }

  const anthropic = new Anthropic({ apiKey });

  const today = TODAY();
  const now = NOW_TIME();

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Du bist ein Intent-Parser. Analysiere diese Spracheingabe und gib ein JSON-ARRAY zurück.

Die Eingabe kann MEHRERE Aktionen enthalten! "Ich muss Blumen gießen und um 18 Uhr ins Gym" = 2 Intents.

Heutiges Datum: ${today}
Aktuelle Uhrzeit: ${now}

Eingabe: "${text}"

Mögliche Intents:
- "task": Etwas das erledigt werden muss (To-Do, Aufgabe, "ich muss noch...")
- "calendar": Ein Termin mit Zeit/Datum (Meeting, Arzt, Fitnessstudio, Event)
- "complete": Etwas wurde erledigt/abgehakt ("hab X gemacht", "X erledigt", "X fertig", "X genommen")
- "delete": Etwas soll gelöscht/entfernt werden ("lösch X", "nimm X raus", "X absagen")
- "note": Alles andere (Idee, Erkenntnis, Reflexion, unklar)

Antworte NUR mit einem JSON-Array:
[{"type":"...","title":"kurzer sauberer Titel","date":"YYYY-MM-DD","time":"HH:MM","searchTerm":"Suchbegriff fuer complete/delete"}]

Regeln:
- IMMER ein Array zurückgeben, auch bei nur einem Intent: [{"type":"task",...}]
- "title": Kurz und sauber, ohne Füllwörter. "Ich muss heute noch Blumen gießen" → "Blumen gießen"
- "date": Wenn kein Datum genannt, nimm heute (${today}). "morgen" = nächster Tag. "Montag" = nächster Montag.
- "time": Nur wenn eine Uhrzeit genannt wird. "um 18" = "18:00". Keine Zeit → weglassen.
- "searchTerm": Bei complete/delete: der Name der Task/des Termins zum Suchen. "Hab Planks gemacht" → "Plank"
- Wenn jemand sagt "ich muss X" oder "X nicht vergessen" → "task", nicht "note"
- "Fitnessstudio um 18" → "calendar" mit time "18:00"
- Mehrere Aktionen in einer Eingabe → mehrere Objekte im Array

NUR JSON-Array, kein anderer Text.`
    }],
  });

  try {
    const content = response.content[0];
    if (content.type !== "text") return [{ type: "note", title: text }];

    console.log("[Inbox AI] Raw:", content.text);
    let jsonStr = content.text.trim();
    // Extract JSON array from response
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrMatch) jsonStr = arrMatch[0];

    const arr = JSON.parse(jsonStr);
    if (!Array.isArray(arr) || arr.length === 0) return [{ type: "note", title: text }];

    console.log("[Inbox AI] Parsed:", arr.length, "intents");
    return arr.map((json: any) => ({
      type: json.type || "note",
      title: json.title || text,
      time: json.time || undefined,
      date: json.date || TODAY(),
      searchTerm: json.searchTerm || json.title || text,
    }));
  } catch (err) {
    console.error("[Inbox AI] Parse error:", err);
    return [{ type: "note", title: text }];
  }
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

async function deleteItem(searchText: string): Promise<{ success: boolean; item?: string; source?: string }> {
  const searchLower = searchText.toLowerCase();

  // 1. Try Calendar
  try {
    const tokenRaw = await readFile(CONFIG.google.tokenPath, "utf-8");
    const tokens = JSON.parse(tokenRaw);
    const oauth2Client = new google.auth.OAuth2(CONFIG.google.clientId, CONFIG.google.clientSecret, CONFIG.google.redirectUri);
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 48 * 60 * 60 * 1000);

    const events = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
    });

    const match = (events.data.items || []).find((e) =>
      (e.summary || "").toLowerCase().includes(searchLower) ||
      searchLower.includes((e.summary || "").toLowerCase())
    );

    if (match && match.id) {
      await calendar.events.delete({ calendarId: "primary", eventId: match.id });
      return { success: true, item: match.summary || "", source: "calendar" };
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
        const delRes = await fetch(`https://todoist.com/api/v1/tasks/${match.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${CONFIG.todoist.apiToken}` },
        });
        if (delRes.ok) return { success: true, item: match.content, source: "todoist" };
      }
    }
  } catch {}

  return { success: false };
}

// === Main Processor ===

export interface InboxResult {
  intents: Intent[];
  results: { intent: Intent; success: boolean; message: string }[];
  success: boolean;
  message: string;
}

async function executeIntent(intent: Intent): Promise<{ success: boolean; message: string }> {
  switch (intent.type) {
    case "task": {
      const result = await createTodoistTask(intent.title, intent.date || TODAY(), intent.time);
      return {
        success: result.success,
        message: result.success
          ? `Task: "${intent.title}" (${intent.date}${intent.time ? ` ${intent.time}` : ""})`
          : "Task konnte nicht erstellt werden",
      };
    }
    case "calendar": {
      const result = await createCalendarEvent(intent.title, intent.date || TODAY(), intent.time);
      return {
        success: result.success,
        message: result.success
          ? `Termin: "${intent.title}" (${intent.date}${intent.time ? ` ${intent.time}` : ""})`
          : "Termin konnte nicht erstellt werden",
      };
    }
    case "complete": {
      const result = await completeTask(intent.searchTerm || intent.title);
      return {
        success: result.success,
        message: result.success
          ? `Erledigt: "${result.task}"`
          : `Nicht gefunden: "${intent.searchTerm}"`,
      };
    }
    case "delete": {
      const result = await deleteItem(intent.searchTerm || intent.title);
      return {
        success: result.success,
        message: result.success
          ? `Geloescht: "${result.item}"`
          : `Nicht gefunden: "${intent.searchTerm}"`,
      };
    }
    case "note":
    default:
      return { success: true, message: `Notiz: "${intent.title}"` };
  }
}

export async function processInboxMessage(text: string): Promise<InboxResult> {
  const intents = await detectIntents(text);

  const results = [];
  for (const intent of intents) {
    const result = await executeIntent(intent);
    results.push({ intent, ...result });
  }

  const allSuccess = results.every((r) => r.success);
  const messages = results.map((r) => r.message);

  return {
    intents,
    results,
    success: allSuccess,
    message: messages.join(" | "),
  };
}
