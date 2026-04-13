import { Router } from "express";
import { getTodayEvents } from "../services/google-calendar.js";

export const calendarRouter = Router();

calendarRouter.get("/today", async (_req, res) => {
  try {
    const events = await getTodayEvents();
    res.json({ data: events, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});
