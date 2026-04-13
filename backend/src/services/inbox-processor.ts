import { CONFIG } from "../config.js";
import { google } from "googleapis";
import { readFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";

// === Intent Detection via Claude Haiku ===

interface Intent {
  type: "task" | "calendar" | "complete" | "delete" | "sop" | "note";
  title: string;
  time?: string; // HH:MM
  date?: string; // YYYY-MM-DD
  searchTerm?: string; // for complete/delete: what to search for
  sopWorkspace?: string; // for sop: "Tennis-Ring-Lual" or "Cavy"
  sopFile?: string; // for sop: "Longform SOP.md"
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
- "sop": Best Practice, Tipp oder Learning fuer eine Video-Produktion SOP
- "note": Alles andere (Idee, Erkenntnis, Reflexion, unklar)

SOP-ERKENNUNG — verfuegbare SOPs:
Workspace "Tennis-Ring-Lual":
  - "Dreh Learnings.md" = Tennis Filming SOP (alles rund ums Tennis-Filmen, Kamera, Dreh)
  - "Longform SOP.md" = Longform SOP (lange Tennis-Videos, Edits)
  - "Tippvideo SOP.md" = Tippvideo SOP (kurze Tennis-Tipp-Videos)
  - "Trainingsvideo SOP.md" = Trainingsvideo SOP (Trainings-Clips)
  - "Studio-Video SOP.md" = Studio/Reaction Videos
  - "Quality Control SOP.md" = Quality Control (Maiks QC-Prozess)
Workspace "Cavy":
  - "Filming SOP.md" = Vlog Filming SOP (Vlog-Drehs, Daily Vlogs)
  - "Vlog Editing SOP.md" = Vlog Editing SOP (Vlog-Schnitt)

Bei "sop": Gib zusaetzlich "sopWorkspace" und "sopFile" an.
Beispiel: "Bei Langform-Videos immer Stativ mitnehmen" →
{"type":"sop","title":"Immer Stativ mitnehmen","sopWorkspace":"Tennis-Ring-Lual","sopFile":"Longform SOP.md"}

WICHTIG — Verschieben/Ändern:
Wenn jemand sagt "Termin X hat sich auf Y verschoben" oder "verschieb X auf Y", dann sind das ZWEI Intents:
1. {"type":"delete","searchTerm":"X"} — den alten Termin löschen
2. {"type":"calendar","title":"X","time":"neue Zeit","date":"neues Datum"} — neuen Termin erstellen
Beispiel: "Team-Meeting hat sich auf 16 Uhr verschoben" →
[{"type":"delete","title":"Team-Meeting","searchTerm":"Team-Meeting"},{"type":"calendar","title":"Team-Meeting","date":"2026-04-13","time":"16:00"}]

Antworte NUR mit einem JSON-Array:
[{"type":"...","title":"kurzer sauberer Titel","date":"YYYY-MM-DD","time":"HH:MM","searchTerm":"Suchbegriff fuer complete/delete","sopWorkspace":"nur bei sop","sopFile":"nur bei sop"}]

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
      sopWorkspace: json.sopWorkspace || undefined,
      sopFile: json.sopFile || undefined,
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

async function deleteItem(searchText: string): Promise<{ success: boolean; item?: string; source?: string; count?: number }> {
  const searchLower = searchText.toLowerCase();
  let deletedCount = 0;
  let deletedNames: string[] = [];

  // 1. Try Calendar — delete ALL matches
  try {
    const tokenRaw = await readFile(CONFIG.google.tokenPath, "utf-8");
    const tokens = JSON.parse(tokenRaw);
    const oauth2Client = new google.auth.OAuth2(CONFIG.google.clientId, CONFIG.google.clientSecret, CONFIG.google.redirectUri);
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000); // Only today

    const events = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
    });

    const matches = (events.data.items || []).filter((e) =>
      (e.summary || "").toLowerCase().includes(searchLower) ||
      searchLower.includes((e.summary || "").toLowerCase())
    );

    for (const match of matches) {
      if (match.id) {
        try {
          await calendar.events.delete({ calendarId: "primary", eventId: match.id });
          deletedCount++;
          deletedNames.push(match.summary || "");
        } catch {}
      }
    }
  } catch {}

  // 2. Try Todoist — delete ALL matches
  try {
    const res = await fetch("https://todoist.com/api/v1/tasks/filter?query=today%20%7C%20overdue", {
      headers: { Authorization: `Bearer ${CONFIG.todoist.apiToken}` },
    });
    if (res.ok) {
      const json = await res.json();
      const tasks = json.results || [];
      const matches = tasks.filter((t: any) =>
        t.content.toLowerCase().includes(searchLower) ||
        searchLower.includes(t.content.toLowerCase())
      );

      for (const match of matches) {
        try {
          const delRes = await fetch(`https://todoist.com/api/v1/tasks/${match.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${CONFIG.todoist.apiToken}` },
          });
          if (delRes.ok) {
            deletedCount++;
            deletedNames.push(match.content);
          }
        } catch {}
      }
    }
  } catch {}

  if (deletedCount > 0) {
    return {
      success: true,
      item: deletedCount > 1 ? `${deletedCount}x ${deletedNames[0]}` : deletedNames[0],
      source: "calendar/todoist",
      count: deletedCount,
    };
  }

  return { success: false };
}

async function addToSOP(title: string, workspace: string, sopFile: string): Promise<{ success: boolean }> {
  const { join } = await import("path");
  const { readFile: rf, writeFile: wf } = await import("fs/promises");
  const { simpleGit } = await import("simple-git");

  const vaultPath = CONFIG.vaultPath;
  const filePath = join(vaultPath, "4- Workspaces", workspace, "01_SOPs", sopFile);

  try {
    let content = await rf(filePath, "utf-8");
    const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });

    // Find Ausarbeitungs-Queue section and add entry
    const queueMatch = content.match(/## Ausarbeitungs-Queue\n/);
    if (queueMatch && queueMatch.index !== undefined) {
      const insertPos = queueMatch.index + queueMatch[0].length;
      content = content.slice(0, insertPos) + `- [ ] ${title}\n` + content.slice(insertPos);
    } else {
      // No queue section — append one
      content += `\n## Ausarbeitungs-Queue\n- [ ] ${title}\n`;
    }

    await wf(filePath, content, "utf-8");

    // Git commit
    const git = simpleGit(vaultPath);
    await git.add(filePath);
    await git.commit(`SOP ${sopFile.replace(".md", "")}: ${title} (Quelle: Spracheingabe ${today})`);

    // Push if possible
    try { await git.push(); } catch {}

    return { success: true };
  } catch (err) {
    console.error("SOP write failed:", err);
    return { success: false };
  }
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
    case "sop": {
      if (!intent.sopWorkspace || !intent.sopFile) {
        return { success: false, message: `SOP nicht erkannt fuer: "${intent.title}"` };
      }
      const result = await addToSOP(intent.title, intent.sopWorkspace, intent.sopFile);
      return {
        success: result.success,
        message: result.success
          ? `SOP: "${intent.title}" → ${intent.sopFile}`
          : `SOP konnte nicht aktualisiert werden`,
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
