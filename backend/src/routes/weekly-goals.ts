import { Router } from "express";
import { readCurrentWeekGoals } from "../services/vault-weekly-goals.js";

export const weeklyGoalsRouter = Router();

weeklyGoalsRouter.get("/", async (_req, res) => {
  try {
    const goals = await readCurrentWeekGoals();
    res.json({ data: goals, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to read weekly goals" });
  }
});
