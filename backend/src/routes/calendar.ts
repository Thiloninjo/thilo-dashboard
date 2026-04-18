import { Router } from "express";
import { getEventsForDate } from "../services/google-calendar.js";
import { generateBriefingAudio, generateBriefingText } from "../services/dreh-briefing-audio.js";
import { cacheGet } from "../cache.js";

export const calendarRouter = Router();

calendarRouter.get("/today", async (_req, res) => {
  try {
    // Serve from poller cache if available (instant response)
    const cached = cacheGet("calendar");
    if (cached) return res.json(cached);
    // Cache empty (first request before poller ran) — fetch live
    const events = await getEventsForDate();
    res.json({ data: events, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

calendarRouter.get("/date/:date", async (req, res) => {
  try {
    const events = await getEventsForDate(req.params.date);
    res.json({ data: events, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

calendarRouter.get("/dreh-context", async (_req, res) => {
  try {
    // Local date strings — system runs in local timezone
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const [todayEvents, tomorrowEvents] = await Promise.all([
      getEventsForDate(todayStr),
      getEventsForDate(tomorrowStr),
    ]);

    // Matches: "Tennis-Dreh", "Tennis Dreh", "Tennisdreh", "Tennis drehen", etc.
    const drehPattern = /tennis[- ]?dreh/;
    const isDreh = (e: any) => e.summary.toLowerCase().match(drehPattern);

    const isDrehToday = todayEvents.some(isDreh);
    const isDrehTomorrow = tomorrowEvents.some(isDreh);

    const drehEventToday = todayEvents.find(isDreh);
    const drehEventTomorrow = tomorrowEvents.find(isDreh);

    res.json({
      data: {
        isDrehToday,
        isDrehTomorrow,
        drehEventToday: drehEventToday || null,
        drehEventTomorrow: drehEventTomorrow || null,
        vorabendChecklist: isDrehTomorrow ? [
          "Drehplan fertig und auf iPad heruntergeladen",
          "Equipment-Checkliste vollständig durchgegangen",
          "Alle Akkus, Powerbank, Akku-Lampe und Mikrofone an Strom",
          "Speicherkarte geleert und formatiert",
          "Linse gesäubert",
          "✅ Drehtag-Vorbereitungen abgeschlossen",
        ] : [],
        morgenChecklist: isDrehToday ? [
          "Equipment ins Auto laden (Kamera erst beim Losfahren)",
          "Checkliste abhaken — erst fertig wenn alles abgehakt",
          "Linse prüfen bevor Kamera das erste Mal startet",
          "✅ Drehtag-Checkliste abgeschlossen",
        ] : [],
      },
      lastUpdated: new Date().toISOString(),
      isStale: false,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dreh context" });
  }
});

// Create calendar event (from drag-and-drop)
calendarRouter.post("/create-event", async (req, res) => {
  try {
    const { summary, start, end } = req.body;
    const { google } = await import("googleapis");
    const { readFile } = await import("fs/promises");
    const { CONFIG } = await import("../config.js");
    const tokenRaw = await readFile(CONFIG.google.tokenPath, "utf-8");
    const oauth2Client = new google.auth.OAuth2(CONFIG.google.clientId, CONFIG.google.clientSecret, CONFIG.google.redirectUri);
    oauth2Client.setCredentials(JSON.parse(tokenRaw));
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        start: { dateTime: start, timeZone: "Europe/Berlin" },
        end: { dateTime: end, timeZone: "Europe/Berlin" },
      },
    });
    res.json({ success: true, eventId: event.data.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create event", detail: String(err) });
  }
});

// Update calendar event time (for drag within timeline)
calendarRouter.patch("/update-event/:id", async (req, res) => {
  try {
    const { start, end } = req.body;
    const { google } = await import("googleapis");
    const { readFile } = await import("fs/promises");
    const { CONFIG } = await import("../config.js");
    const tokenRaw = await readFile(CONFIG.google.tokenPath, "utf-8");
    const oauth2Client = new google.auth.OAuth2(CONFIG.google.clientId, CONFIG.google.clientSecret, CONFIG.google.redirectUri);
    oauth2Client.setCredentials(JSON.parse(tokenRaw));
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.patch({
      calendarId: "primary",
      eventId: req.params.id,
      requestBody: {
        start: { dateTime: start, timeZone: "Europe/Berlin" },
        end: { dateTime: end, timeZone: "Europe/Berlin" },
      },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update event", detail: String(err) });
  }
});

// Delete calendar event (for drag back to tasks)
calendarRouter.delete("/delete-event/:id", async (req, res) => {
  try {
    const { google } = await import("googleapis");
    const { readFile } = await import("fs/promises");
    const { CONFIG } = await import("../config.js");
    const tokenRaw = await readFile(CONFIG.google.tokenPath, "utf-8");
    const oauth2Client = new google.auth.OAuth2(CONFIG.google.clientId, CONFIG.google.clientSecret, CONFIG.google.redirectUri);
    oauth2Client.setCredentials(JSON.parse(tokenRaw));
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({ calendarId: "primary", eventId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event", detail: String(err) });
  }
});

// Create todoist task (from dragging event back)
calendarRouter.post("/create-todoist-task", async (req, res) => {
  try {
    const { content, due_date } = req.body;
    const { CONFIG } = await import("../config.js");
    const result = await fetch("https://todoist.com/api/v1/tasks", {
      method: "POST",
      headers: { Authorization: `Bearer ${CONFIG.todoist.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content, due_string: due_date }),
    });
    const json = await result.json();
    res.json({ success: true, id: json.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create task", detail: String(err) });
  }
});

// Dreh briefing text preview
calendarRouter.get("/dreh-briefing/text", async (_req, res) => {
  try {
    const text = await generateBriefingText();
    res.json({ data: text });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate briefing text", detail: String(err) });
  }
});

// Dreh briefing audio — generates MP3 and streams it
calendarRouter.get("/dreh-briefing/audio", async (_req, res) => {
  try {
    const audioPath = await generateBriefingAudio();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const { createReadStream } = await import("fs");
    createReadStream(audioPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate briefing audio", detail: String(err) });
  }
});
