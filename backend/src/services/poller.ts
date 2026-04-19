import { getTodayEvents } from "./google-calendar.js";
import { getTodayTasks } from "./todoist.js";
import { cacheSet } from "../cache.js";
import { broadcastApiUpdate } from "./file-watcher.js";
import WebSocket from "ws";

const TODOIST_INTERVAL = 10_000;
const CALENDAR_INTERVAL = 60_000; // Longer since we have webhook now

const HETZNER_BASE = "https://46-225-160-248.nip.io";
const HETZNER_WS = "wss://46-225-160-248.nip.io/ws";

async function fetchHetznerHabits(): Promise<any> {
  const res = await fetch(`${HETZNER_BASE}/api/habits`);
  if (!res.ok) throw new Error(`Hetzner habits: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// Source-specific fetchers for re-polling when Hetzner pushes an update
const sourceFetchers: Record<string, () => Promise<any>> = {
  habitica: fetchHetznerHabits,
  calendar: getTodayEvents,
  todoist: getTodayTasks,
};

// Connect to Hetzner WebSocket — instant push for ALL sources
function connectHetznerWS(): void {
  let ws: WebSocket;
  let reconnectTimer: ReturnType<typeof setTimeout>;

  function connect() {
    ws = new WebSocket(HETZNER_WS);

    ws.on("open", () => {
      console.log("[Hetzner WS] Connected — live sync for all sources");
    });

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "api-updated" && msg.source) {
          const fetcher = sourceFetchers[msg.source];
          if (!fetcher) return;
          // Re-fetch from source and broadcast locally
          const data = await fetcher();
          const changed = cacheSet(msg.source, data);
          if (changed) {
            broadcastApiUpdate(msg.source);
          }
        } else if (msg.type === "vault-pull") {
          // Hetzner pushed a vault change — pull it locally
          console.log("[Hetzner WS] vault-pull received — pulling vault...");
          try {
            const { simpleGit } = await import("simple-git");
            const { CONFIG } = await import("../config.js");
            const git = simpleGit(CONFIG.vaultPath);
            await git.pull();
            console.log("[Hetzner WS] Vault pull complete");
          } catch (err) {
            console.error("[Hetzner WS] Vault pull failed:", err);
          }
        }
      } catch {}
    });

    ws.on("close", () => {
      console.log("[Hetzner WS] Disconnected — reconnecting in 5s");
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5_000);
    });

    ws.on("error", () => {
      ws.close();
    });
  }

  connect();
}

async function pollSource(name: string, fetcher: () => Promise<any>): Promise<void> {
  try {
    const data = await fetcher();
    const changed = cacheSet(name, data);
    // Only broadcast when data actually changed
    if (changed) {
      broadcastApiUpdate(name as any);
    }
  } catch (err) {
    if (!String(err).includes("429")) {
      console.error(`Poll failed for ${name}:`, err);
    }
  }
}

export async function startPolling(): Promise<void> {
  await Promise.allSettled([
    pollSource("calendar", getTodayEvents),
    pollSource("todoist", getTodayTasks),
  ]);
  console.log("[Poller] Initial fetch complete");

  if (process.env.DASHBOARD_SERVER) {
    // Server: Todoist + Calendar webhooks handle updates — no polling needed
    // Only poll calendar as backup (webhook registration can expire)
    setInterval(() => pollSource("calendar", getTodayEvents), CALENDAR_INTERVAL);
  } else {
    // Locally: no webhooks, so poll both + connect to Hetzner WS for habits
    pollSource("habitica", fetchHetznerHabits);
    connectHetznerWS();
    setInterval(() => pollSource("todoist", getTodayTasks), TODOIST_INTERVAL);
    setInterval(() => pollSource("calendar", getTodayEvents), CALENDAR_INTERVAL);
  }
}
