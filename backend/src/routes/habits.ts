import { Router } from "express";
import { getAllHabits, scoreHabit } from "../services/habitica.js";

export const habitsRouter = Router();

habitsRouter.get("/", async (_req, res) => {
  try {
    const habits = await getAllHabits();
    res.json({ data: habits, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

habitsRouter.post("/:id/score", async (req, res) => {
  try {
    const direction = (req.body.direction || "up") as "up" | "down";
    await scoreHabit(req.params.id, direction);
    const habits = await getAllHabits();
    res.json({ data: habits, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to score habit" });
  }
});
