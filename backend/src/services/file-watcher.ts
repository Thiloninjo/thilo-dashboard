import chokidar from "chokidar";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { relative } from "path";
import { WebSocketServer, WebSocket } from "ws";
import { CONFIG } from "../config.js";
import { WSMessage } from "../types.js";

const contentHashes = new Map<string, string>();
let wss: WebSocketServer;

function broadcast(message: WSMessage): void {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

async function hasContentChanged(filePath: string): Promise<boolean> {
  try {
    const content = await readFile(filePath, "utf-8");
    const hash = createHash("md5").update(content).digest("hex");
    const prev = contentHashes.get(filePath);
    contentHashes.set(filePath, hash);
    return hash !== prev;
  } catch {
    return false;
  }
}

const HIGH_PRIORITY_PATTERNS = [
  "--Aufgaben--.md",
  "01_SOPs/",
  "weekly-goals/",
];

function getPriority(relativePath: string): "high" | "low" {
  return HIGH_PRIORITY_PATTERNS.some((p) => relativePath.includes(p)) ? "high" : "low";
}

// Auto-pull vault from GitHub — only on server (env DASHBOARD_SERVER=1), not local
// Locally, tsx watch would restart the backend on every pulled file change → cache wipe → data reset
let gitInstance: any = null;

async function startVaultSync(): Promise<void> {
  if (!process.env.DASHBOARD_SERVER) return;

  const { simpleGit } = await import("simple-git");
  gitInstance = simpleGit(CONFIG.vaultPath);

  // Fallback polling every 30s (in case webhook misses something)
  setInterval(async () => {
    try {
      await gitInstance.pull("origin", "master", { "--quiet": null });
    } catch {}
  }, 30_000);
}

// Triggered by GitHub webhook — instant pull instead of waiting for 30s interval
export async function triggerVaultPull(): Promise<boolean> {
  if (!gitInstance) return false;
  try {
    const result = await gitInstance.pull("origin", "master", { "--quiet": null });
    return result.files.length > 0;
  } catch {
    return false;
  }
}

export function startFileWatcher(server: import("http").Server): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected" }));
  });

  // Start auto-pull for server-side changes
  startVaultSync();

  const watcher = chokidar.watch(CONFIG.vaultPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ignored: [
      "**/.obsidian/**",
      "**/.git/**",
      "**/.trash/**",
      "**/node_modules/**",
      "**/.superpowers/**",
    ],
  });

  watcher.on("change", async (filePath) => {
    const rel = relative(CONFIG.vaultPath, filePath);
    if (!(await hasContentChanged(filePath))) return;

    broadcast({ type: "vault-changed", file: rel, priority: getPriority(rel) });
  });
}

export function broadcastApiUpdate(source: "calendar" | "todoist" | "habitica"): void {
  broadcast({ type: "api-updated", source });
}
