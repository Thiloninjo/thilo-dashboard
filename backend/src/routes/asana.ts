import { Router } from "express";
import { getAllMyAsanaTasks, getTaskDetail } from "../services/asana.js";

export const asanaRouter = Router();

asanaRouter.get("/tasks", async (_req, res) => {
  try {
    const tasks = await getAllMyAsanaTasks();
    res.json({ data: tasks, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Asana tasks", detail: String(err) });
  }
});

asanaRouter.get("/tasks/:id", async (req, res) => {
  try {
    const task = await getTaskDetail(req.params.id);
    res.json({ data: task });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Asana task detail", detail: String(err) });
  }
});
