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

// Auto-pull vault from GitHub every 30 seconds (picks up server-side SOP commits)
async function startVaultSync(): Promise<void> {
  const { simpleGit } = await import("simple-git");
  const git = simpleGit(CONFIG.vaultPath);

  setInterval(async () => {
    try {
      await git.pull("origin", "master", { "--quiet": null });
    } catch {}
  }, 30_000);
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
