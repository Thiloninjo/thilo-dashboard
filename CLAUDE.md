# Dashboard

Thilos persönliches Dashboard — Schaltzentrale die Tasks, Kalender, Weekly Goals, Habits und SOPs visualisiert. Permanent an auf dem ersten Bildschirm (Chrome Kiosk).

## Tech Stack

- **Backend:** Express.js + TypeScript (Port 3001)
- **Frontend:** React 19 + Vite + Tailwind CSS (Port 5173, nur dev)
- **Habits PWA:** React 19, gebaut nach `backend/public/habits/`, served unter `/habits/`
- **Design:** iOS 26 Liquid Glass (dark, glassmorphism, Framer Motion)

## Deployment

| Umgebung | Was läuft | Vault-Zugriff |
|---|---|---|
| **Lokal (PC)** | Backend + Frontend + Cloudflare Tunnel | Dateisystem direkt |
| **Hetzner (46-225-160-248)** | Backend + Habits PWA | Git pull (Webhook + 30s Fallback) |

Autostart: `scripts/start-silent.vbs` via Windows Startup → Backend → Frontend → Tunnel → Chrome Kiosk.

Env-Variable `DASHBOARD_SERVER` ist nur auf Hetzner gesetzt — aktiviert Calendar Webhooks, deaktiviert Todoist-Polling (Webhook übernimmt).

## Vault-Pfade im Backend

Das Backend liest aus dem Vault über `CONFIG.vaultPath`. Aktuelle Pfade:
- SOPs: `1 - Workspaces/*/01_SOPs/`
- Tasks: `--Aufgaben--.md`
- Weekly Goals: `4 - Projekte/Dashboard/weekly-goals/KW{n}-{year}.md`
- Handy Notes: `2 - Meine Notizen/Handy Note Dump/`

**Wichtig:** Vault-Dateien auf Windows haben `\r\n`. Alle Regex-Parser müssen `.replace(/\r/g, "")` verwenden.

## API-Architektur

Frontend `api.ts`: Local first (`/api` via Vite Proxy → :3001), Hetzner als Fallback.
WebSocket: File Watcher (Chokidar) broadcastet `vault-changed`, Poller broadcastet `api-updated`.
Cache: In-memory LRU mit `CachedResponse<T>` Wrapper.

## Webhooks (Hetzner)

- `/webhooks/todoist` — Todoist App (alle Events subscribed)
- `/webhooks/google-calendar` — Calendar API watch()
- `/webhooks/github` — Instant vault pull bei Push

## Konventionen

- Sprache: Deutsch im UI, Englisch im Code
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`)
- Keine Dateien im Vault ändern ohne Bestätigung (außer `weekly-goals/` und Dashboard-eigene Dateien)
