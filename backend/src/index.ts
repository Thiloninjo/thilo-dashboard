import express from "express";
import cors from "cors";
import { createServer } from "http";
import { CONFIG } from "./config.js";
import { tasksRouter } from "./routes/tasks.js";
import { authRouter } from "./routes/auth.js";
import { calendarRouter } from "./routes/calendar.js";
import { habitsRouter } from "./routes/habits.js";
import { weeklyGoalsRouter } from "./routes/weekly-goals.js";
import { changelogRouter } from "./routes/changelog.js";
import { sopsRouter } from "./routes/sops.js";
import { inboxRouter } from "./routes/inbox.js";
import { startFileWatcher } from "./services/file-watcher.js";
import { startPolling } from "./services/poller.js";
// Handy-Note-Watcher disabled locally — runs on server only
// import { startHandyNoteWatcher } from "./services/handy-note-watcher.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", vaultPath: CONFIG.vaultPath });
});
app.use("/auth", authRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/weekly-goals", weeklyGoalsRouter);
app.use("/api/changelog", changelogRouter);
app.use("/api/sops", sopsRouter);
app.use("/api/inbox", inboxRouter);

const server = createServer(app);
startFileWatcher(server);
startPolling();
// startHandyNoteWatcher(); // Disabled — server handles this

server.listen(CONFIG.port, () => {
  console.log(`Dashboard backend running on http://localhost:${CONFIG.port}`);
  console.log(`Watching vault: ${CONFIG.vaultPath}`);
});
