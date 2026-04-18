# Dashboard Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Dashboard work reliably on every PC restart with zero manual intervention — no blank cards, no lost data, no silent failures.

**Architecture:** Two-layer fix: (1) Backend gets a real health endpoint and the startup script polls it before launching frontend/Chrome, (2) Frontend `apiFetch` gets retry-with-backoff so transient failures self-heal. Together these eliminate the two root causes: race conditions on startup and silent error swallowing.

**Tech Stack:** Express.js, React 19, VBScript (startup), TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/index.ts` | Modify | Health endpoint reports actual readiness |
| `frontend/src/lib/api.ts` | Modify | Retry with exponential backoff |
| `frontend/src/lib/ws.ts` | Modify | Exponential backoff on reconnect |
| `scripts/start-silent.vbs` | Modify | Health-check loop replaces sleep timer |
| `scripts/wait-for-backend.ps1` | Create | PowerShell health-check poller |

---

### Task 1: Backend Health Endpoint — Report Actual Readiness

The current `/api/health` just returns `{ status: "ok" }` immediately, even before the poller has fetched any data. We need it to report whether the backend is actually ready to serve.

**Files:**
- Modify: `backend/src/index.ts:26-28`
- Modify: `backend/src/services/poller.ts:84-86`
- Modify: `backend/src/cache.ts`

- [ ] **Step 1: Add `isReady()` to cache**

In `backend/src/cache.ts`, add a function that checks if initial data has been loaded:

```typescript
export function cacheHas(key: string): boolean {
  return store.has(key);
}

export function isReady(): boolean {
  // Backend is ready when at least calendar and todoist have been fetched once
  return store.has("calendar") && store.has("todoist");
}
```

Add these two functions after the existing `cacheGet` function.

- [ ] **Step 2: Track initial poll completion in poller**

In `backend/src/services/poller.ts`, change the initial polls from fire-and-forget to awaited, so the cache is populated before we report ready:

Replace lines 84-86:
```typescript
export function startPolling(): void {
  pollSource("calendar", getTodayEvents);
  pollSource("todoist", getTodayTasks);
```

With:
```typescript
export async function startPolling(): Promise<void> {
  await Promise.allSettled([
    pollSource("calendar", getTodayEvents),
    pollSource("todoist", getTodayTasks),
  ]);
  console.log("[Poller] Initial fetch complete");
```

- [ ] **Step 3: Update health endpoint to report readiness**

In `backend/src/index.ts`, replace lines 26-28:

```typescript
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", vaultPath: CONFIG.vaultPath });
});
```

With:
```typescript
import { isReady } from "./cache.js";

app.get("/api/health", (_req, res) => {
  const ready = isReady();
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "starting", vaultPath: CONFIG.vaultPath });
});
```

Note: The `import` goes at the top with the other imports.

- [ ] **Step 4: Await startPolling in index.ts**

In `backend/src/index.ts`, the `startPolling()` call on line 49 is fire-and-forget. Since we now `await` the initial fetch, update line 49:

Replace:
```typescript
startPolling();
```

With:
```typescript
startPolling().catch((err) => console.error("[Poller] Startup error:", err));
```

This keeps it non-blocking (server starts listening immediately) but logs errors. The health endpoint will report `503` until the initial polls complete.

- [ ] **Step 5: Test manually**

```bash
cd "C:\Users\thilo\Obsidian Vaults\Claude Life\4 - Projekte\Dashboard\backend"
npm run dev &
sleep 1
curl -s -w "\nHTTP: %{http_code}\n" http://localhost:3001/api/health
# Expected: { "status": "starting" } HTTP: 503 (if pollers haven't finished)
# After a few seconds:
curl -s -w "\nHTTP: %{http_code}\n" http://localhost:3001/api/health
# Expected: { "status": "ok" } HTTP: 200
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.ts backend/src/cache.ts backend/src/services/poller.ts
git commit -m "feat: health endpoint reports actual readiness (503 until initial data loaded)"
```

---

### Task 2: Startup Script — Health-Check Loop Replaces Sleep Timer

Replace the `WScript.Sleep 5000` with a PowerShell script that polls `/api/health` until it returns 200. Only then launch frontend and Chrome.

**Files:**
- Create: `scripts/wait-for-backend.ps1`
- Modify: `scripts/start-silent.vbs`

- [ ] **Step 1: Create PowerShell health-check script**

Create `scripts/wait-for-backend.ps1`:

```powershell
# Wait for backend to be fully ready (health returns 200)
$url = "http://localhost:3001/api/health"
$maxAttempts = 60  # 60 * 1s = 60 seconds max
$attempt = 0

while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $body = $response.Content | ConvertFrom-Json
            if ($body.status -eq "ok") {
                Write-Host "Backend ready after $attempt seconds"
                exit 0
            }
        }
    } catch {}
    Start-Sleep -Seconds 1
    $attempt++
}

Write-Host "Backend not ready after $maxAttempts seconds"
exit 1
```

- [ ] **Step 2: Update start-silent.vbs to use health-check**

Replace the entire content of `scripts/start-silent.vbs`:

```vbs
' Start Dashboard silently — no visible terminal windows
' Uses health-check polling instead of fixed sleep timers

Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

Dim scriptDir
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Start backend (completely hidden)
WshShell.Run "cmd /c cd /d """ & scriptDir & "\..\backend"" && npm run dev", 0, False

' Wait for backend to be ACTUALLY ready (polls /api/health until 200)
Dim exitCode
exitCode = WshShell.Run("powershell -ExecutionPolicy Bypass -File """ & scriptDir & "\wait-for-backend.ps1""", 0, True)

If exitCode <> 0 Then
  ' Backend didn't start — abort
  WScript.Quit 1
End If

' Start frontend (completely hidden)
WshShell.Run "cmd /c cd /d """ & scriptDir & "\..\frontend"" && npm run dev", 0, False

' Wait for Vite dev server (3 seconds is reliable for Vite)
WScript.Sleep 3000

' Start Cloudflare Tunnel (completely hidden)
WshShell.Run "cmd /c cloudflared tunnel --url http://localhost:3001 2>&1 | findstr trycloudflare > """ & scriptDir & "\..\tunnel-url.txt""", 0, False

' Open Chrome in app mode
Dim localAppData
localAppData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
WshShell.Run """C:\Program Files\Google\Chrome\Application\chrome.exe"" --kiosk --app=http://localhost:5173 --window-position=0,0 --disable-session-crashed-bubble --noerrdialogs --disable-infobars --user-data-dir=""" & localAppData & "\ThiloDashboard\chrome-profile""", 1, False

Set WshShell = Nothing
```

Key changes:
- Backend start is the same
- `WScript.Sleep 5000` replaced by PowerShell health-check (waits up to 60s, typically 3-5s)
- Frontend sleep reduced to 3s (Vite is fast and reliable)
- Chrome only opens after both backend AND frontend are ready

- [ ] **Step 3: Test the startup sequence**

Kill all running dashboard processes, then:
```bash
cd "C:\Users\thilo\Obsidian Vaults\Claude Life\4 - Projekte\Dashboard"
powershell -ExecutionPolicy Bypass -File scripts/wait-for-backend.ps1
# Expected: "Backend ready after N seconds" (N = 3-8 typically)
```

- [ ] **Step 4: Commit**

```bash
git add scripts/wait-for-backend.ps1 scripts/start-silent.vbs
git commit -m "feat: startup uses health-check polling instead of fixed sleep timers"
```

---

### Task 3: Frontend `apiFetch` — Retry with Exponential Backoff

The core fix: instead of one try local → one try Hetzner → give up, we retry with backoff.

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Rewrite apiFetch with retry logic**

Replace the entire content of `frontend/src/lib/api.ts`:

```typescript
const SERVER_BASE = "https://46-225-160-248.nip.io/api";
const LOCAL_BASE = "/api";
const AUTH_HEADER = "Bearer thilo-dashboard-2026-secret";
const SERVER_TIMEOUT = 5_000;
const MAX_RETRIES = 3;
const BACKOFF_BASE = 1_000; // 1s, 2s, 4s

async function tryFetch<T>(url: string, options?: RequestInit, timeout?: number): Promise<T | null> {
  try {
    const controller = timeout ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : undefined;
    const res = await fetch(url, {
      ...options,
      signal: controller?.signal,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (timer) clearTimeout(timer);
    if (res.ok) return res.json();
  } catch {}
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Local first, Hetzner fallback, retry with backoff on total failure
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // For mutations (POST/PATCH/DELETE), don't retry — just try local then Hetzner
  const method = options?.method?.toUpperCase() || "GET";
  const isMutation = method !== "GET";

  const attempts = isMutation ? 1 : MAX_RETRIES;

  for (let i = 0; i < attempts; i++) {
    // Try local backend first
    const local = await tryFetch<T>(`${LOCAL_BASE}${path}`, options);
    if (local !== null) return local;

    // Fallback to Hetzner
    const server = await tryFetch<T>(`${SERVER_BASE}${path}`, {
      ...options,
      headers: { Authorization: AUTH_HEADER, ...options?.headers },
    }, SERVER_TIMEOUT);
    if (server !== null) return server;

    // Backoff before retry (skip on last attempt)
    if (i < attempts - 1) {
      await sleep(BACKOFF_BASE * Math.pow(2, i));
    }
  }

  throw new Error(`API unreachable after ${attempts} attempts: ${path}`);
}
```

Key changes:
- GET requests retry 3 times with 1s/2s/4s backoff (total ~10s worst case)
- Mutations (POST/PATCH/DELETE) try once local + once Hetzner (no retry to avoid double-submits)
- `tryFetch` helper handles both local and server calls cleanly
- Still throws on total failure — consumers handle that

- [ ] **Step 2: Test with backend running**

Open browser DevTools console, navigate to dashboard. All cards should load. Check Network tab for clean 200 responses.

- [ ] **Step 3: Test with backend temporarily stopped**

Stop backend, wait 5s, start backend again. Frontend should recover within ~10s (retry kicks in).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: apiFetch retries GET requests with exponential backoff (1s/2s/4s)"
```

---

### Task 4: WebSocket — Exponential Backoff on Reconnect

Currently reconnects every 3s forever. Add backoff that resets on successful connection.

**Files:**
- Modify: `frontend/src/lib/ws.ts`

- [ ] **Step 1: Add exponential backoff to WebSocket reconnect**

Replace the entire content of `frontend/src/lib/ws.ts`:

```typescript
type WSHandler = (message: any) => void;
const handlers = new Set<WSHandler>();

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout>;
let reconnectAttempt = 0;
const MAX_BACKOFF = 30_000; // Cap at 30s

function getBackoff(): number {
  const delay = Math.min(1_000 * Math.pow(2, reconnectAttempt), MAX_BACKOFF);
  reconnectAttempt++;
  return delay;
}

function connect(): void {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onopen = () => {
    reconnectAttempt = 0; // Reset backoff on successful connection
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handlers.forEach((h) => h(message));
    } catch {}
  };

  ws.onclose = () => {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, getBackoff());
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function onWSMessage(handler: WSHandler): () => void {
  handlers.add(handler);
  if (!ws) connect();
  return () => handlers.delete(handler);
}
```

Key changes:
- Backoff: 1s → 2s → 4s → 8s → 16s → 30s cap
- Resets to 1s on successful connection
- `onmessage` wrapped in try/catch (prevents crash on malformed JSON)
- `onerror` uses `ws?.close()` (null-safe)

- [ ] **Step 2: Test**

Stop backend. Watch DevTools console — reconnect attempts should space out (1s, 2s, 4s...). Start backend. WebSocket should reconnect and reset backoff.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/ws.ts
git commit -m "feat: WebSocket reconnect with exponential backoff (1s-30s, resets on success)"
```

---

### Task 5: Frontend — Loading States Instead of Blank Cards

When data hasn't loaded yet, show "Laden..." instead of empty content.

**Files:**
- Modify: `frontend/src/pages/Heute.tsx:28-58`

- [ ] **Step 1: Add loading state to Heute component**

In `frontend/src/pages/Heute.tsx`, add a loading state after the existing state declarations (after line 37):

```typescript
const [loaded, setLoaded] = useState(false);
```

Then update `fetchAll` to set loaded after first successful fetch. Change lines 43-58:

```typescript
  const fetchAll = useCallback(async () => {
    const [cal, vault, todoist, asana, hab, wg] = await Promise.all([
      apiFetch<CachedResponse<CalendarEvent[]>>("/calendar/today").catch(() => null),
      apiFetch<CachedResponse<Task[]>>("/tasks?date=" + todayDate).catch(() => null),
      apiFetch<CachedResponse<Task[]>>("/tasks/todoist").catch(() => null),
      apiFetch<CachedResponse<Task[]>>("/asana/tasks").catch(() => null),
      apiFetch<CachedResponse<HabitItem[]>>("/habits").catch(() => null),
      apiFetch<CachedResponse<WeeklyGoals>>("/weekly-goals").catch(() => null),
    ]);
    if (cal) setEvents(cal.data);
    if (vault) setVaultTasks(vault.data);
    if (todoist) setTodoistTasks(todoist.data);
    if (asana) setAsanaTasks(asana.data);
    if (hab) setRawHabits(hab.data);
    if (wg) setGoals(wg.data);
    if (!loaded) setLoaded(true);
  }, [loaded]);
```

- [ ] **Step 2: Show loading indicator in render**

Find the `return (` in `Heute.tsx` and add a loading overlay at the very beginning of the returned JSX (as the first child inside the outermost element). This depends on the existing JSX structure. Add before the first card:

```tsx
{!loaded && (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
    <div className="text-white/60 text-sm font-medium animate-pulse">Dashboard laden...</div>
  </div>
)}
```

This shows a subtle loading overlay that disappears once the first successful fetch completes. The overlay sits on top of the existing cards and fades away naturally.

- [ ] **Step 3: Test**

Restart backend. Refresh page. Should see "Dashboard laden..." briefly, then cards populate.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Heute.tsx
git commit -m "feat: loading state on Heute page instead of blank cards"
```

---

## Summary

| Task | What | Impact |
|------|------|--------|
| 1 | Health endpoint reports actual readiness | Backend tells startup script when it's truly ready |
| 2 | Startup script polls health instead of sleeping | No more race conditions on boot |
| 3 | apiFetch retries with backoff | Transient failures self-heal in ~10s |
| 4 | WebSocket exponential backoff | No reconnect storms, clean recovery |
| 5 | Loading states | User sees "Laden..." instead of blank nothing |

Tasks 1+2 eliminate startup race conditions. Task 3 eliminates mid-session failures. Tasks 4+5 are polish that improve the experience.
