import { Router } from "express";
import { getAllHabitsWithStatus, scoreHabit, createHabit, updateHabit, deleteHabit } from "../services/habits.js";
import { broadcastApiUpdate } from "../services/file-watcher.js";
import { cacheGet } from "../cache.js";

const HETZNER_BASE = "https://46-225-160-248.nip.io";
const isServer = !!process.env.DASHBOARD_SERVER;
console.log(`[Habits] isServer=${isServer}, DASHBOARD_SERVER=${process.env.DASHBOARD_SERVER}`);

// On local: proxy habits requests to Hetzner (single source of truth)
// On server: use local file-based service directly
async function hetznerFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${HETZNER_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`Hetzner API error: ${res.status}`);
  return res.json();
}

export const habitsRouter = Router();

habitsRouter.get("/", async (_req, res) => {
  try {
    if (isServer) {
      const habits = await getAllHabitsWithStatus();
      return res.json({ data: habits, lastUpdated: new Date().toISOString(), isStale: false });
    }
    // Local: serve from poller cache (polled from Hetzner)
    const cached = cacheGet("habitica");
    if (cached) return res.json(cached);
    // Cache empty — fetch live from Hetzner
    const data = await hetznerFetch("/api/habits");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

habitsRouter.post("/:id/score", async (req, res) => {
  try {
    if (isServer) {
      const direction = (req.body.direction || "up") as "up" | "down";
      await scoreHabit(req.params.id, direction);
      const habits = await getAllHabitsWithStatus();
      broadcastApiUpdate("habitica");
      return res.json({ data: habits, lastUpdated: new Date().toISOString(), isStale: false });
    }
    // Local: forward to Hetzner
    const data = await hetznerFetch(`/api/habits/${req.params.id}/score`, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    broadcastApiUpdate("habitica");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to score habit" });
  }
});

habitsRouter.put("/", async (req, res) => {
  try {
    if (isServer) {
      const { id, text, icon, type } = req.body;
      const habits = await getAllHabitsWithStatus();
      if (habits.some((h) => h.id === id)) {
        await updateHabit(id, { text, icon, type });
      } else {
        await createHabit({ id, text, icon, type });
      }
      const updated = await getAllHabitsWithStatus();
      broadcastApiUpdate("habitica");
      return res.json({ data: updated, lastUpdated: new Date().toISOString(), isStale: false });
    }
    // Local: forward to Hetzner
    const data = await hetznerFetch("/api/habits", {
      method: "PUT",
      body: JSON.stringify(req.body),
    });
    broadcastApiUpdate("habitica");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to save habit", detail: String(err) });
  }
});

habitsRouter.delete("/:id", async (req, res) => {
  try {
    if (isServer) {
      await deleteHabit(req.params.id);
      const habits = await getAllHabitsWithStatus();
      broadcastApiUpdate("habitica");
      return res.json({ data: habits, lastUpdated: new Date().toISOString(), isStale: false });
    }
    // Local: forward to Hetzner
    const data = await hetznerFetch(`/api/habits/${req.params.id}`, { method: "DELETE" });
    broadcastApiUpdate("habitica");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete habit" });
  }
});
