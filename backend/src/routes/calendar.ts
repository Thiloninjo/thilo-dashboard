import { Router } from "express";
import { getEventsForDate } from "../services/google-calendar.js";

export const calendarRouter = Router();

calendarRouter.get("/today", async (_req, res) => {
  try {
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
