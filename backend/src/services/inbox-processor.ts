import { CONFIG } from "../config.js";
import { google } from "googleapis";
import { readFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { getAllHabitsWithStatus, scoreHabit } from "./habits.js";
import { getTodayEvents } from "./google-calendar.js";
import { getTodayTasks } from "./todoist.js";
import { cacheSet } from "../cache.js";
import { broadcastApiUpdate } from "./file-watcher.js";

// Simple dedup: ignore identical messages within 60 seconds
const recentMessages = new Map<string, number>(); // text → timestamp
const DEDUP_WINDOW_MS = 60_000;

function isDuplicate(text: string): boolean {
  const key = text.trim().toLowerCase();
  const now = Date.now();

  // Clean old entries
  for (const [k, ts] of recentMessages) {
    if (now - ts > DEDUP_WINDOW_MS) recentMessages.delete(k);
  }

  if (recentMessages.has(key)) return true;
  recentMessages.set(key, now);
  return false;
}

// === Intent Detection: Keywords first, AI fallback ===

interface Intent {
  type: "task" | "calendar" | "complete" | "delete" | "sop" | "sop_hint" | "note";
  title: string;
  time?: string; // HH:MM
  date?: string; // YYYY-MM-DD
  searchTerm?: string; // for complete/delete: what to search for
  sopWorkspace?: string; // for sop: "Tennis-Ring-Lual" or "Cavy"
  sopFile?: string; // for sop: "Longform SOP.md"
  source?: "keyword" | "ai"; // how the intent was detected
}

// Normalize text for matching — ignore hyphens, spaces, case
function normalize(text: string): string {
  return text.toLowerCase().replace(/[-–—_]/g, " ").replace(/\s+/g, " ").trim();
}

// Word-boundary-aware matching: checks if search words appear as whole words in text
function fuzzyMatch(text: string, search: string): boolean {
  const normText = normalize(text);
  const normSearch = normalize(search);

  // Exact match
  if (normText === normSearch) return true;

  // Check if all search words appear as word boundaries in text
  const searchWords = normSearch.split(" ").filter(w => w.length > 1);
  if (searchWords.length === 0) return false;

  return searchWords.every(word => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    return regex.test(normText);
  });
}

const TODAY = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; };
const NOW_TIME = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

// === PHASE 1: Keyword-based detection (100% reliable, no AI) ===

interface KeywordRule {
  type: Intent["type"];
  patterns: RegExp[];
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    type: "task",
    patterns: [
      /\b(neue aufgabe|neuer task|neues todo|neues to do|neue to-do)[:\s]/i,
      /\b(nicht vergessen|denk dran|erinner mich)[:\s]/i,
      /\b(setz auf die liste|pack auf die liste)[:\s]/i,
    ],
  },
  {
    type: "calendar",
    patterns: [
      /\b(neuer termin|kalendereintrag|kalender eintrag)[:\s]/i,
      /\b(trag in den kalender|mach.{0,10}kalendereintrag)/i,
    ],
  },
  {
    type: "complete",
    patterns: [
      /\b(erledigt|fertig|done|abgehakt|gecheckt)[:\s]/i,
      /\b(habit|habits)[:\s]/i,
    ],
  },
  {
    type: "delete",
    patterns: [
      /\b(lösch|loesch|lösche|entfern|cancel|streich|nimm raus)[:\s]/i,
      /\b(absagen|canceln|stornieren)[:\s]/i,
    ],
  },
  {
    type: "sop",
    patterns: [
      /\b(sop|s\.o\.p\.?|es o pe|sop eintrag|sop.update|in die checkliste)[:\s]/i,
      /\b(trag in die sop|pack in die sop|merk dir f[uü]r die sop)/i,
    ],
  },
];

// Extract time from text: "um 14 Uhr" → "14:00", "um 9:30" → "09:30"
function extractTime(text: string): string | undefined {
  // "um 14 Uhr 30" / "um 14:30" / "um 14 Uhr"
  const m1 = text.match(/um (\d{1,2})[\s:]?(?:uhr\s*)?(\d{2})?\s*(?:uhr)?/i);
  if (m1) {
    const h = parseInt(m1[1]);
    const min = m1[2] ? parseInt(m1[2]) : 0;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  // "14:30" standalone
  const m2 = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m2) return `${String(parseInt(m2[1])).padStart(2, "0")}:${m2[2]}`;
  return undefined;
}

// Extract date from text: "morgen", "übermorgen", weekday names
function extractDate(text: string): string {
  const lower = text.toLowerCase();
  const today = new Date();

  if (lower.includes("übermorgen") || lower.includes("uebermorgen")) {
    const d = new Date(today); d.setDate(d.getDate() + 2);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  if (lower.includes("morgen")) {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  const weekdays = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
  for (let i = 0; i < weekdays.length; i++) {
    if (lower.includes(weekdays[i])) {
      const todayDay = today.getDay();
      let diff = i - todayDay;
      if (diff <= 0) diff += 7; // next week
      const d = new Date(today); d.setDate(d.getDate() + diff);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  }

  return TODAY();
}

// Strip the keyword trigger from text to get clean title (works anywhere in text)
function stripTrigger(text: string): string {
  const triggers = /\b(neue aufgabe|neuer task|neues todo|neues to do|neue to-do|neuer termin|kalendereintrag|kalender eintrag|trag in den kalender|erledigt|fertig|done|abgehakt|gecheckt|habit|habits|lösch|loesch|lösche|entfern|cancel|streich|nimm raus|absagen|canceln|stornieren|sop|s\.o\.p\.?|es o pe|sop eintrag|sop.update|in die checkliste|trag in die sop|pack in die sop|nicht vergessen|denk dran|erinner mich|setz auf die liste|pack auf die liste)[:\s]*/gi;
  return text
    .replace(triggers, " ")
    .replace(/\s*(um \d{1,2}[\s:]?\d{0,2}\s*(?:uhr)?|morgen|übermorgen|uebermorgen|heute|genommen|gemacht|geschafft|fertig|ist done)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Check if text contains any trigger keyword (used to skip AI call when no trigger found)
function hasTriggerKeyword(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return KEYWORD_RULES.some(rule => rule.patterns.some(p => p.test(lower)));
}

// === PHASE 2: AI with strict trigger whitelist (no freestyle interpretation) ===

// These are the ONLY words that allow the AI to assign a non-note intent.
// If none of these appear in the text, the AI MUST return "note".
const TRIGGER_WHITELIST = {
  task: ["neue aufgabe", "neuer task", "neues todo", "neues to do", "neue to-do", "nicht vergessen", "denk dran", "erinner mich", "muss noch", "muss ich noch"],
  calendar: ["neuer termin", "termin um", "kalendereintrag", "trag in den kalender"],
  complete: ["erledigt", "fertig", "done", "abgehakt", "gecheckt", "gemacht", "genommen", "geschafft", "habit", "habits"],
  delete: ["lösch", "loesch", "streich", "cancel", "absagen", "canceln", "fällt aus", "faellt aus", "gecancelt", "abgesagt"],
  shift: ["verschoben", "verlegt", "verschiebt", "geändert auf", "geaendert auf", "statt"],
  sop: ["sop", "s.o.p", "es o pe", "trag in die sop", "pack in die sop"],
};

async function detectIntentsAI(text: string): Promise<Intent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return [{ type: "note", title: text, source: "ai" }];
  }

  // Pre-check: does the text contain ANY trigger word at all?
  const lower = text.toLowerCase();
  const hasTriggerInWhitelist = Object.values(TRIGGER_WHITELIST).some(triggers =>
    triggers.some(t => lower.includes(t))
  );
  const hasTriggerInKeywords = hasTriggerKeyword(text);

  // No trigger word found anywhere → skip AI entirely, save the API call
  if (!hasTriggerInWhitelist && !hasTriggerInKeywords) {
    console.log("[Inbox] No trigger word found → note (AI skipped)");
    return [{ type: "note", title: text, source: "keyword" }];
  }

  const anthropic = new Anthropic({ apiKey });
  const today = TODAY();
  const now = NOW_TIME();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6-latest",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Du bist ein Intent-Parser fuer Spracheingaben. Du darfst Intents NUR vergeben wenn ein TRIGGER-WORT vorkommt.

Datum: ${today} (${new Date().toLocaleDateString("de-DE", { weekday: "long" })})
Wochentage: ${(() => { const d = new Date(); const days = []; for (let i = 0; i < 7; i++) { const dd = new Date(d); dd.setDate(d.getDate() + i); days.push(dd.toLocaleDateString("de-DE", { weekday: "long" }) + " = " + dd.getFullYear() + "-" + String(dd.getMonth()+1).padStart(2,"0") + "-" + String(dd.getDate()).padStart(2,"0")); } return days.join(", "); })()}
Uhrzeit: ${now}

Eingabe: "${text}"

## TRIGGER-WHITELIST (NUR diese Woerter erlauben einen Intent!)

task: "neue aufgabe", "neuer task", "neues todo", "nicht vergessen", "denk dran", "erinner mich", "muss noch", "muss ich noch"
calendar: "neuer termin", "termin um", "kalendereintrag", "trag in den kalender"
complete: "erledigt", "fertig", "done", "abgehakt", "gemacht", "genommen", "geschafft", "habit", "habits"
delete: "lösch", "streich", "cancel", "absagen", "fällt aus", "gecancelt", "abgesagt"
sop: "sop", "s.o.p.", "sop eintrag", "trag in die sop", "pack in die sop"
  → Wenn der User EXPLIZIT "SOP" sagt = type "sop" (geht in Ausarbeitungs-Queue)
sop_hint: NUR wenn etwas wie ein Learning/Best Practice klingt, aber der User NICHT "SOP" gesagt hat
  → Das kommt nur vor wenn ein anderer Trigger (z.B. "beim dreh") vorhanden ist. Im Zweifel: "sop" wenn "SOP" im Text steht.

## VERSCHIEBE-LOGIK (Trigger: "verschoben", "verlegt", "statt", "geändert auf")

Wenn ein Verschiebe-Trigger vorkommt → ZWEI Intents:
1. delete (den alten Eintrag)
2. calendar (den neuen Eintrag mit neuer Zeit/Datum)

Beispiel: "Zahnarzt hat sich auf 16 Uhr verschoben" → [delete Zahnarzt, calendar Zahnarzt 16:00]

## ABSOLUTE REGEL

Kein Trigger-Wort aus der Whitelist gefunden → IMMER "note". KEINE Ausnahme.
"War heute um 14 beim Zahnarzt" → note (kein Trigger!)
"Hatte ne gute Idee" → note (kein Trigger!)
"Morgen um 10 Tennis" → note (kein Trigger! "morgen um 10" ist KEIN Trigger)

## OUTPUT

JSON-Array. NUR JSON, kein anderer Text.
[{"type":"...","title":"kurzer sauberer Titel","date":"YYYY-MM-DD","time":"HH:MM","searchTerm":"bei complete/delete"}]

- "title": Kurz, sauber, ohne Fuellwoerter
- "date": Wenn kein Datum → heute (${today})
- "time": Nur wenn Uhrzeit genannt
- "searchTerm": Bei complete/delete — der Name zum Suchen
- Bei sop/sop_hint: zusaetzlich "sopWorkspace" und "sopFile"

SOP-Zuordnung (waehle die passendste Datei basierend auf dem Inhalt):
Workspace "Tennis-Ring-Lual":
  - "Dreh Learnings.md" — Allgemeine Dreh-Learnings, Equipment, Kamera, Licht, Vorbereitung
  - "Longform SOP.md" — Long Form Content, YouTube Videos, Hooks
  - "Tippvideo SOP.md" — Tennis-Tippvideos
  - "Trainingsvideo SOP.md" — Tennis-Trainingsvideos
  - "Studio-Video SOP.md" — Studio-Aufnahmen
  - "Editing SOP.md" — Schnitt, Post-Production fuer Tennis
  - "Quality Control SOP.md" — Qualitaetskontrolle
Workspace "Cavy":
  - "Filming SOP.md" — Vlog Filming, M23 Vlogs
  - "Vlog Editing SOP.md" — Vlog Schnitt
Workspace "Thilo":
  - "High-Level Editor.md" — Allgemeine Editor-Skills, Workflow-Optimierung
  - "SOP Sammlung - Alle Quellen.md" — Uebergreifende Best Practices`
    }],
  });

  try {
    const content = response.content[0];
    if (content.type !== "text") return [{ type: "note", title: text, source: "ai" }];

    console.log("[Inbox AI] Raw:", content.text);
    let jsonStr = content.text.trim();

    // Handle both single object and array responses
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (arrMatch) jsonStr = arrMatch[0];
    else if (objMatch) jsonStr = `[${objMatch[0]}]`;

    const arr = JSON.parse(jsonStr);
    const items = Array.isArray(arr) ? arr : [arr];

    if (items.length === 0) return [{ type: "note", title: text, source: "ai" }];

    console.log("[Inbox AI] Parsed:", items.length, "intents");
    return items.map((json: any) => ({
      type: json.type || "note",
      title: json.title || text,
      time: json.time || undefined,
      date: json.date || TODAY(),
      searchTerm: json.searchTerm || json.title || text,
      sopWorkspace: json.sopWorkspace || undefined,
      sopFile: json.sopFile || undefined,
      source: "ai" as const,
    }));
  } catch (err) {
    console.error("[Inbox AI] Parse error:", err);
    return [{ type: "note", title: text, source: "ai" }];
  }
}

// === Main intent detection ===
// ALL requests go through AI for clean title formatting.
// Trigger whitelist pre-check saves API cost when no trigger is present.

async function detectIntents(text: string): Promise<Intent[]> {
  return detectIntentsAI(text);
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
      const [h, m] = time.split(":").map(Number);
      const endDate = new Date(2000, 0, 1, h + 1, m);
      const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      const endDT = endDate.getDate() > 1
        ? `${date}T23:59:00`
        : `${date}T${endTime}:00`;
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
  // 1. Try own Habits app first (habits.json + habit-log.json)
  try {
    const habits = await getAllHabitsWithStatus();
    console.log(`[Inbox] Habits loaded: ${habits.length} habits, searching for "${searchText}"`);
    console.log(`[Inbox] Habits: ${habits.map(h => `${h.id}="${h.text}" isDue=${h.isDue} completed=${h.completed}`).join(", ")}`);
    // First try uncompleted habits
    let habitMatch = habits.find((h) =>
      h.isDue && !h.completed && (
        fuzzyMatch(h.text, searchText) ||
        fuzzyMatch(searchText, h.text) ||
        fuzzyMatch(h.id, searchText) ||
        fuzzyMatch(searchText, h.id)
      )
    );
    // Also match already-completed habits (idempotent — user says "done" twice, that's fine)
    if (!habitMatch) {
      habitMatch = habits.find((h) =>
        fuzzyMatch(h.text, searchText) ||
        fuzzyMatch(searchText, h.text) ||
        fuzzyMatch(h.id, searchText) ||
        fuzzyMatch(searchText, h.id)
      );
    }
    if (habitMatch) {
      console.log(`[Inbox] Habit match: "${habitMatch.text}" (${habitMatch.id}) completed=${habitMatch.completed}`);
      if (!habitMatch.completed) {
        await scoreHabit(habitMatch.id, "up");
      }
      return { success: true, task: habitMatch.text, source: "habits" };
    }
    console.log(`[Inbox] No habit match found for "${searchText}"`);
  } catch (err) {
    console.error("[Inbox] Habits score failed:", err);
  }

  // 2. Try Todoist
  try {
    const res = await fetch("https://todoist.com/api/v1/tasks/filter?query=today%20%7C%20overdue", {
      headers: { Authorization: `Bearer ${CONFIG.todoist.apiToken}` },
    });
    if (res.ok) {
      const json = await res.json();
      const tasks = json.results || [];
      const match = tasks.find((t: any) =>
        fuzzyMatch(t.content, searchText) ||
        fuzzyMatch(searchText, t.content)
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

async function deleteItem(searchText: string, date?: string): Promise<{ success: boolean; item?: string; source?: string; count?: number }> {
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

    // Search today + tomorrow to catch near-future events
    const targetDate = date ? new Date(date + "T00:00:00") : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 2 * 24 * 60 * 60 * 1000);

    const events = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
    });

    const matches = (events.data.items || []).filter((e) =>
      fuzzyMatch(e.summary || "", searchText) ||
      fuzzyMatch(searchText, e.summary || "")
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
    const filterDate = date || new Date().toISOString().slice(0, 10);
    const res = await fetch(`https://todoist.com/api/v1/tasks/filter?query=${encodeURIComponent(`due: ${filterDate} | overdue`)}`, {
      headers: { Authorization: `Bearer ${CONFIG.todoist.apiToken}` },
    });
    if (res.ok) {
      const json = await res.json();
      const tasks = json.results || [];
      const matches = tasks.filter((t: any) =>
        fuzzyMatch(t.content, searchText) ||
        fuzzyMatch(searchText, t.content)
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

async function addToSOP(title: string, workspace: string, sopFile: string, hintOnly: boolean): Promise<{ success: boolean }> {
  const { join } = await import("path");
  const { readFile: rf, writeFile: wf } = await import("fs/promises");
  const { simpleGit } = await import("simple-git");

  const vaultPath = CONFIG.vaultPath;
  const filePath = join(vaultPath, "1 - Workspaces", workspace, "01_SOPs", sopFile);

  try {
    let content = await rf(filePath, "utf-8");
    const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });

    if (hintOnly) {
      // Add to Claude-Notizen block (hint, not confirmed)
      const claudeBlock = content.match(/## Claude-Notizen\n/);
      if (claudeBlock && claudeBlock.index !== undefined) {
        const insertPos = claudeBlock.index + claudeBlock[0].length;
        content = content.slice(0, insertPos) + `- (${today}) Moeglicherweise relevant: ${title}\n` + content.slice(insertPos);
      } else {
        content += `\n## Claude-Notizen\n- (${today}) Moeglicherweise relevant: ${title}\n`;
      }
    } else {
      // Add to Ausarbeitungs-Queue (explicit command)
      const queueMatch = content.match(/## Ausarbeitungs-Queue\n/);
      if (queueMatch && queueMatch.index !== undefined) {
        const insertPos = queueMatch.index + queueMatch[0].length;
        content = content.slice(0, insertPos) + `- [ ] ${title}\n` + content.slice(insertPos);
      } else {
        content += `\n## Ausarbeitungs-Queue\n- [ ] ${title}\n`;
      }
    }

    await wf(filePath, content, "utf-8");

    const git = simpleGit(vaultPath);
    await git.add(filePath);
    const prefix = hintOnly ? "SOP-Hinweis" : "SOP";
    await git.commit(`${prefix} ${sopFile.replace(".md", "")}: ${title} (Quelle: Spracheingabe ${today})`);

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
      const result = await deleteItem(intent.searchTerm || intent.title, intent.date);
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
      const result = await addToSOP(intent.title, intent.sopWorkspace, intent.sopFile, false);
      return {
        success: result.success,
        message: result.success
          ? `SOP Queue: "${intent.title}" → ${intent.sopFile}`
          : `SOP konnte nicht aktualisiert werden`,
      };
    }
    case "sop_hint": {
      if (!intent.sopWorkspace || !intent.sopFile) {
        return { success: true, message: `Notiz: "${intent.title}"` };
      }
      const result = await addToSOP(intent.title, intent.sopWorkspace, intent.sopFile, true);
      return {
        success: result.success,
        message: result.success
          ? `SOP Hinweis: "${intent.title}" → ${intent.sopFile} (Claude-Notizen)`
          : `Hinweis konnte nicht gespeichert werden`,
      };
    }
    case "note":
    default: {
      // Save note to Vault inbox for later processing via /handy-notes
      const { join } = await import("path");
      const { writeFile: wf } = await import("fs/promises");

      const vaultPath = CONFIG.vaultPath;
      const now = new Date();
      const dateStr = now.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }).replace(/\./g, ".");
      const timeStr = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }).replace(":", "-");
      const fileName = `Handy Note from ${dateStr}, ${timeStr}.md`;
      const filePath = join(vaultPath, "2 - Meine Notizen", "Handy Note Dump", fileName);

      try {
        await wf(filePath, `${intent.title}\n`, "utf-8");
        return { success: true, message: `Notiz gespeichert: "${intent.title}"` };
      } catch {
        return { success: true, message: `Notiz: "${intent.title}" (nicht gespeichert)` };
      }
    }
  }
}

export async function processInboxMessage(text: string): Promise<InboxResult> {
  if (isDuplicate(text)) {
    return {
      intents: [],
      results: [],
      success: true,
      message: "Duplikat ignoriert (gleiche Nachricht innerhalb 60s)",
    };
  }

  const intents = await detectIntents(text);

  const results = [];
  for (const intent of intents) {
    const result = await executeIntent(intent);
    results.push({ intent, ...result });
  }

  // Broadcast updates immediately instead of waiting for Google/Todoist webhooks
  const successTypes = new Set(results.filter(r => r.success).map(r => r.intent.type));
  if (successTypes.has("calendar") || successTypes.has("delete")) {
    // Re-fetch calendar and broadcast so dashboard updates within seconds
    try {
      const events = await getTodayEvents();
      cacheSet("calendar", events);
      broadcastApiUpdate("calendar");
      console.log("[Inbox] Calendar broadcast triggered");
    } catch {}
  }
  if (successTypes.has("task") || successTypes.has("delete")) {
    try {
      const tasks = await getTodayTasks();
      cacheSet("todoist", tasks);
      broadcastApiUpdate("todoist");
      console.log("[Inbox] Todoist broadcast triggered");
    } catch {}
  }
  if (successTypes.has("complete")) {
    try {
      broadcastApiUpdate("habitica"); // "habitica" is the cache key the frontend listens to for habits
      console.log("[Inbox] Habits broadcast triggered");
    } catch {}
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
