import { getTodayEvents } from "./google-calendar.js";
import { getTodayTasks } from "./todoist.js";
import { getAllHabits } from "./habitica.js";
import { cacheSet } from "../cache.js";
import { broadcastApiUpdate } from "./file-watcher.js";

// Todoist: 450 req/15min limit — 15s safe for two instances (local + server)
const TODOIST_INTERVAL = 15_000;
// Calendar + Habitica change less often
const CALENDAR_INTERVAL = 30_000;
const HABITICA_INTERVAL = 120_000; // 2 minutes — habits don't change often

async function pollSource(name: string, fetcher: () => Promise<any>): Promise<void> {
  try {
    const data = await fetcher();
    cacheSet(name, data);
    broadcastApiUpdate(name as any);
  } catch (err) {
    // Only log if not a rate limit (429) — those are expected at high frequency
    if (!String(err).includes("429")) {
      console.error(`Poll failed for ${name}:`, err);
    }
  }
}

export function startPolling(): void {
  pollSource("calendar", getTodayEvents);
  pollSource("todoist", getTodayTasks);
  pollSource("habitica", getAllHabits);

  setInterval(() => pollSource("todoist", getTodayTasks), TODOIST_INTERVAL);
  setInterval(() => pollSource("calendar", getTodayEvents), CALENDAR_INTERVAL);
  setInterval(() => pollSource("habitica", getAllHabits), HABITICA_INTERVAL);
}
