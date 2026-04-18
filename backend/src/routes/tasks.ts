import { Router } from "express";
import { readTasks, toggleVaultTask } from "../services/vault-tasks.js";
import { getTodayTasks, getTasksForDate, getTasksForDateWithRecurring, closeTodoistTask, reopenTodoistTask } from "../services/todoist.js";
import { cacheGet, cacheSet } from "../cache.js";

export const tasksRouter = Router();

tasksRouter.get("/", async (_req, res) => {
  try {
    const tasks = await readTasks();
    const dateFilter = _req.query.date as string | undefined;
    const filtered = dateFilter
      ? tasks.filter((t) => t.dueDate === dateFilter)
      : tasks;
    res.json({ data: filtered, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to read tasks" });
  }
});

tasksRouter.patch("/:id", async (req, res) => {
  try {
    const lineNumber = parseInt(req.params.id);
    const tasks = await toggleVaultTask(lineNumber);
    res.json({ data: tasks, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle task" });
  }
});

tasksRouter.get("/todoist", async (_req, res) => {
  try {
    // Serve from poller cache if available (instant response)
    const cached = cacheGet("todoist");
    if (cached) return res.json(cached);
    const tasks = await getTodayTasks();
    res.json({ data: tasks, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Todoist tasks" });
  }
});

tasksRouter.get("/todoist/date/:date", async (req, res) => {
  try {
    const tasks = await getTasksForDateWithRecurring(req.params.date);
    res.json({ data: tasks, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Todoist tasks" });
  }
});

tasksRouter.patch("/todoist/:id", async (req, res) => {
  try {
    const { completed } = req.body;
    if (completed) {
      await closeTodoistTask(req.params.id);
    } else {
      await reopenTodoistTask(req.params.id);
    }
    const tasks = await getTodayTasks();
    cacheSet("todoist", tasks);
    res.json({ data: tasks, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to update Todoist task" });
  }
});
