import { google } from "googleapis";
import { readFile, writeFile } from "fs/promises";
import { CONFIG } from "../config.js";
import { CalendarEvent } from "../types.js";

const oauth2Client = new google.auth.OAuth2(
  CONFIG.google.clientId,
  CONFIG.google.clientSecret,
  CONFIG.google.redirectUri
);

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
}

export async function handleAuthCallback(code: string): Promise<void> {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  await writeFile(CONFIG.google.tokenPath, JSON.stringify(tokens), "utf-8");
}

export async function loadTokens(): Promise<boolean> {
  try {
    const raw = await readFile(CONFIG.google.tokenPath, "utf-8");
    oauth2Client.setCredentials(JSON.parse(raw));
    return true;
  } catch {
    return false;
  }
}

export async function getEventsForDate(date?: string): Promise<CalendarEvent[]> {
  const hasTokens = await loadTokens();
  if (!hasTokens) return [];

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const target = date ? new Date(date + "T00:00:00") : new Date();
  const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const SOP_KEYWORDS: Record<string, string> = {
    "tennis dreh": "Tennis Filming SOP",
    "vlog dreh": "Vlog Filming SOP",
    "tennis schnitt": "Tennis Editing SOP",
    "tennis edit": "Tennis Editing SOP",
    "vlog schnitt": "Vlog Editing SOP",
    "vlog edit": "Vlog Editing SOP",
  };

  return (response.data.items || []).map((event) => {
    const summary = event.summary || "Kein Titel";
    const summaryLower = summary.toLowerCase();
    const sopMatch = Object.entries(SOP_KEYWORDS).find(([keyword]) =>
      summaryLower.includes(keyword)
    );

    return {
      id: event.id || "",
      summary,
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      location: event.location || undefined,
      isAllDay: !event.start?.dateTime,
      meetLink: event.hangoutLink || undefined,
      sopMatch: sopMatch ? sopMatch[1] : undefined,
    };
  });
}

export const getTodayEvents = () => getEventsForDate();

// === Google Calendar Push Notifications (Webhook) ===
// Registers a watch channel that expires after ~7 days.
// Call this on server start and set a renewal timer.
const WEBHOOK_URL = "https://46-225-160-248.nip.io/webhooks/google-calendar";
let watchChannelId: string | null = null;
let watchResourceId: string | null = null;

export async function startCalendarWatch(): Promise<void> {
  const hasTokens = await loadTokens();
  if (!hasTokens) {
    console.log("[Calendar Watch] No tokens — skipping webhook registration");
    return;
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const channelId = `dashboard-${Date.now()}`;

  try {
    // Stop existing watch if any
    if (watchChannelId && watchResourceId) {
      try {
        await calendar.channels.stop({ requestBody: { id: watchChannelId, resourceId: watchResourceId } });
      } catch {}
    }

    const res = await calendar.events.watch({
      calendarId: "primary",
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: WEBHOOK_URL,
        // Expire in 7 days (max allowed)
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    watchChannelId = res.data.id || null;
    watchResourceId = res.data.resourceId || null;
    console.log(`[Calendar Watch] Registered — channel ${channelId}, expires in 7 days`);

    // Auto-renew 1 hour before expiration (every 6 days 23 hours)
    setTimeout(() => startCalendarWatch(), 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000);
  } catch (err) {
    console.error("[Calendar Watch] Failed to register:", err);
    // Retry in 5 minutes
    setTimeout(() => startCalendarWatch(), 5 * 60 * 1000);
  }
}
