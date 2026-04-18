import express from "express";
import cors from "cors";
import { createServer } from "http";
import { resolve } from "path";
import { CONFIG } from "./config.js";
import { tasksRouter } from "./routes/tasks.js";
import { authRouter } from "./routes/auth.js";
import { calendarRouter } from "./routes/calendar.js";
import { habitsRouter } from "./routes/habits.js";
import { weeklyGoalsRouter } from "./routes/weekly-goals.js";
import { changelogRouter } from "./routes/changelog.js";
import { sopsRouter } from "./routes/sops.js";
import { inboxRouter } from "./routes/inbox.js";
import { healthDataRouter } from "./routes/health-data.js";
import { asanaRouter } from "./routes/asana.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { startFileWatcher } from "./services/file-watcher.js";
import { startPolling } from "./services/poller.js";
import { isReady } from "./cache.js";
// Handy-Note-Watcher disabled locally — runs on server only
// import { startHandyNoteWatcher } from "./services/handy-note-watcher.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (_req, res) => {
  const ready = isReady();
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "starting", vaultPath: CONFIG.vaultPath });
});
app.use("/auth", authRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/weekly-goals", weeklyGoalsRouter);
app.use("/api/changelog", changelogRouter);
app.use("/api/sops", sopsRouter);
app.use("/api/inbox", inboxRouter);
app.use("/api/health-data", healthDataRouter);
app.use("/api/asana", asanaRouter);
app.use("/webhooks", webhooksRouter);

// Serve Streaks PWA as static files
app.use("/habits", express.static(resolve(import.meta.dirname || __dirname, "../public/habits")));
app.get("/habits/*", (_req, res) => {
  res.sendFile(resolve(import.meta.dirname || __dirname, "../public/habits/index.html"));
});

const server = createServer(app);
startFileWatcher(server);
startPolling().catch((err) => console.error("[Poller] Startup error:", err));

// Register Google Calendar webhook (server only — needs public HTTPS URL)
if (process.env.DASHBOARD_SERVER) {
  import("./services/google-calendar.js").then((m) => m.startCalendarWatch()).catch((err) => console.error("[Calendar Watch] Failed:", err));
}
// startHandyNoteWatcher(); // Disabled — server handles this

server.listen(CONFIG.port, () => {
  console.log(`Dashboard backend running on http://localhost:${CONFIG.port}`);
  console.log(`Watching vault: ${CONFIG.vaultPath}`);
});
