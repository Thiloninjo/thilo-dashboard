import { Router } from "express";
import { cacheSet } from "../cache.js";
import { broadcastApiUpdate, triggerVaultPull } from "../services/file-watcher.js";
import { getTodayEvents } from "../services/google-calendar.js";
import { getTodayTasks } from "../services/todoist.js";

export const webhooksRouter = Router();

// === Todoist Webhook ===
// Register at: https://developer.todoist.com/sync/v9/#webhooks
// URL: https://46-225-160-248.nip.io/webhooks/todoist
webhooksRouter.post("/todoist", async (_req, res) => {
  // Todoist sends a POST when tasks change — re-fetch and broadcast
  try {
    const tasks = await getTodayTasks();
    const changed = cacheSet("todoist", tasks);
    if (changed) broadcastApiUpdate("todoist");
    console.log("[Webhook] Todoist update received");
  } catch (err) {
    console.error("[Webhook] Todoist re-fetch failed:", err);
  }
  res.sendStatus(200);
});

// === Google Calendar Push Notification ===
// Set up via Calendar API watch() — see below
// URL: https://46-225-160-248.nip.io/webhooks/google-calendar
webhooksRouter.post("/google-calendar", async (req, res) => {
  // Google sends X-Goog-Resource-State header
  const state = req.headers["x-goog-resource-state"];
  if (state === "sync") {
    // Initial sync confirmation — just acknowledge
    return res.sendStatus(200);
  }

  // Event changed — re-fetch and broadcast
  try {
    const events = await getTodayEvents();
    const changed = cacheSet("calendar", events);
    if (changed) broadcastApiUpdate("calendar");
    console.log("[Webhook] Google Calendar update received");
  } catch (err) {
    console.error("[Webhook] Calendar re-fetch failed:", err);
  }
  res.sendStatus(200);
});

// === GitHub Push Webhook ===
// Register at: https://github.com/Thiloninjo/claude-life-vault/settings/hooks
// URL: https://46-225-160-248.nip.io/webhooks/github
// Content type: application/json, Events: Just the push event
webhooksRouter.post("/github", async (req, res) => {
  const event = req.headers["x-github-event"];
  if (event !== "push") return res.sendStatus(200);

  console.log("[Webhook] GitHub push received — pulling vault...");
  const hadChanges = await triggerVaultPull();
  if (hadChanges) {
    console.log("[Webhook] Vault updated with new changes");
  }
  res.sendStatus(200);
});
