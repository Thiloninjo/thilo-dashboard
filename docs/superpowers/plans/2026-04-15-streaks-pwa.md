# Streaks PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Habitica with a self-owned habit tracking PWA using the existing Dashboard backend, with live sync to the Dashboard via WebSocket.

**Architecture:** File-based data store (`habits.json` + `habit-log.json`) on the backend. New habits service replaces Habitica service. Separate Vite PWA app builds to `backend/public/habits/` as static files, served by Express. Same Liquid Glass design system as Dashboard.

**Tech Stack:** React 19, Vite, Tailwind CSS 4, Lucide React (icons), Framer Motion, Express (existing backend)

---

### Task 1: Backend — Habits Data Service

**Files:**
- Create: `4 - Projekte/Dashboard/backend/data/habits.json`
- Create: `4 - Projekte/Dashboard/backend/data/habit-log.json`
- Create: `4 - Projekte/Dashboard/backend/src/services/habits.ts`

- [ ] **Step 1: Create seed data files**

`backend/data/habits.json`:
```json
[
  {
    "id": "sleep",
    "text": "Vor 22 Uhr schlafen gehen",
    "icon": "moon",
    "type": "positive",
    "frequency": "daily",
    "createdAt": "2026-04-15"
  },
  {
    "id": "supplements",
    "text": "Supplements nehmen",
    "icon": "pill",
    "type": "positive",
    "frequency": "daily",
    "createdAt": "2026-04-15"
  },
  {
    "id": "plank",
    "text": "Plank",
    "icon": "dumbbell",
    "type": "positive",
    "frequency": "daily",
    "createdAt": "2026-04-15"
  }
]
```

`backend/data/habit-log.json`:
```json
{}
```

- [ ] **Step 2: Write the habits service**

`backend/src/services/habits.ts`:
```typescript
import { readFile, writeFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HABITS_PATH = resolve(__dirname, "../../data/habits.json");
const LOG_PATH = resolve(__dirname, "../../data/habit-log.json");

export interface HabitDef {
  id: string;
  text: string;
  icon: string;
  type: "positive" | "negative";
  frequency: "daily";
  createdAt: string;
}

export interface HabitLog {
  [date: string]: { [habitId: string]: true };
}

export interface HabitWithStatus {
  id: string;
  text: string;
  icon: string;
  type: "daily" | "habit";
  completed: boolean;
  isDue: boolean;
  streak: number;
  bestStreak: number;
  isAntiHabit: boolean;
}

function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function readHabits(): Promise<HabitDef[]> {
  const raw = await readFile(HABITS_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeHabits(habits: HabitDef[]): Promise<void> {
  await writeFile(HABITS_PATH, JSON.stringify(habits, null, 2));
}

async function readLog(): Promise<HabitLog> {
  const raw = await readFile(LOG_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeLog(log: HabitLog): Promise<void> {
  await writeFile(LOG_PATH, JSON.stringify(log, null, 2));
}

function isCompleted(log: HabitLog, date: string, habit: HabitDef): boolean {
  if (habit.type === "positive") {
    return !!log[date]?.[habit.id];
  }
  // Negative: completed (good) means NOT marked
  return !log[date]?.[habit.id];
}

function currentStreak(log: HabitLog, habit: HabitDef): number {
  const today = todayStr();
  let count = 0;
  // Start from yesterday if not yet completed today
  let day = isCompleted(log, today, habit) ? today : prevDay(today);

  while (isCompleted(log, day, habit)) {
    // For negative habits, only count days that exist in the log (or today/recent)
    // Don't count days before the habit was created
    if (day < habit.createdAt) break;
    count++;
    day = prevDay(day);
  }
  return count;
}

function bestStreak(log: HabitLog, habit: HabitDef): number {
  const dates = Object.keys(log).sort();
  if (dates.length === 0) return currentStreak(log, habit);

  let best = 0;
  let current = 0;
  const startDate = habit.createdAt || dates[0];
  const today = todayStr();

  // Walk day by day from creation to today
  let day = startDate;
  while (day <= today) {
    if (isCompleted(log, day, habit)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
    // Move to next day
    const d = new Date(day + "T12:00:00");
    d.setDate(d.getDate() + 1);
    day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  return best;
}

export async function getAllHabitsWithStatus(): Promise<HabitWithStatus[]> {
  const [habits, log] = await Promise.all([readHabits(), readLog()]);
  const today = todayStr();

  return habits.map((h) => ({
    id: h.id,
    text: h.text,
    icon: h.icon,
    type: h.type === "positive" ? "daily" as const : "habit" as const,
    completed: h.type === "positive" ? !!log[today]?.[h.id] : !!log[today]?.[h.id],
    isDue: true,
    streak: currentStreak(log, h),
    bestStreak: bestStreak(log, h),
    isAntiHabit: h.type === "negative",
  }));
}

export async function scoreHabit(habitId: string, direction: "up" | "down"): Promise<void> {
  const log = await readLog();
  const today = todayStr();

  if (direction === "up") {
    if (!log[today]) log[today] = {};
    log[today][habitId] = true;
  } else {
    if (log[today]) {
      delete log[today][habitId];
      if (Object.keys(log[today]).length === 0) delete log[today];
    }
  }

  await writeLog(log);
}

export async function createHabit(habit: { id: string; text: string; icon: string; type: "positive" | "negative" }): Promise<void> {
  const habits = await readHabits();
  if (habits.length >= 12) throw new Error("Maximum 12 habits");
  if (habits.some((h) => h.id === habit.id)) throw new Error("Habit ID already exists");

  habits.push({
    ...habit,
    frequency: "daily",
    createdAt: todayStr(),
  });
  await writeHabits(habits);
}

export async function updateHabit(id: string, updates: { text?: string; icon?: string; type?: "positive" | "negative" }): Promise<void> {
  const habits = await readHabits();
  const idx = habits.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Habit not found");

  if (updates.text) habits[idx].text = updates.text;
  if (updates.icon) habits[idx].icon = updates.icon;
  if (updates.type) habits[idx].type = updates.type;

  await writeHabits(habits);
}

export async function deleteHabit(id: string): Promise<void> {
  const habits = await readHabits();
  const filtered = habits.filter((h) => h.id !== id);
  if (filtered.length === habits.length) throw new Error("Habit not found");
  await writeHabits(filtered);
}
```

- [ ] **Step 3: Verify service compiles**

Run: `cd "4 - Projekte/Dashboard/backend" && npx tsc --noEmit 2>&1 | grep -v TS6059`
Expected: No errors related to habits.ts

- [ ] **Step 4: Commit**

```bash
git add "4 - Projekte/Dashboard/backend/data/habits.json" \
       "4 - Projekte/Dashboard/backend/data/habit-log.json" \
       "4 - Projekte/Dashboard/backend/src/services/habits.ts"
git commit -m "feat: add file-based habits service replacing Habitica"
```

---

### Task 2: Backend — Rewrite Habits Routes

**Files:**
- Modify: `4 - Projekte/Dashboard/backend/src/routes/habits.ts`
- Modify: `4 - Projekte/Dashboard/backend/src/services/poller.ts`
- Modify: `4 - Projekte/Dashboard/backend/src/config.ts`

- [ ] **Step 1: Rewrite habits route to use new service**

Replace entire `backend/src/routes/habits.ts`:
```typescript
import { Router } from "express";
import { getAllHabitsWithStatus, scoreHabit, createHabit, updateHabit, deleteHabit } from "../services/habits.js";
import { broadcastApiUpdate } from "../services/file-watcher.js";

export const habitsRouter = Router();

habitsRouter.get("/", async (_req, res) => {
  try {
    const habits = await getAllHabitsWithStatus();
    res.json({ data: habits, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

habitsRouter.post("/:id/score", async (req, res) => {
  try {
    const direction = (req.body.direction || "up") as "up" | "down";
    await scoreHabit(req.params.id, direction);
    const habits = await getAllHabitsWithStatus();
    broadcastApiUpdate("habitica");
    res.json({ data: habits, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to score habit" });
  }
});

habitsRouter.put("/", async (req, res) => {
  try {
    const { id, text, icon, type } = req.body;
    const habits = await getAllHabitsWithStatus();
    if (habits.some((h) => h.id === id)) {
      await updateHabit(id, { text, icon, type });
    } else {
      await createHabit({ id, text, icon, type });
    }
    const updated = await getAllHabitsWithStatus();
    broadcastApiUpdate("habitica");
    res.json({ data: updated, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to save habit", detail: String(err) });
  }
});

habitsRouter.delete("/:id", async (req, res) => {
  try {
    await deleteHabit(req.params.id);
    const habits = await getAllHabitsWithStatus();
    broadcastApiUpdate("habitica");
    res.json({ data: habits, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete habit" });
  }
});
```

- [ ] **Step 2: Remove Habitica from poller**

In `backend/src/services/poller.ts`, remove the Habitica import and polling:
- Remove: `import { getAllHabits } from "./habitica.js";`
- Remove: `pollSource("habitica", getAllHabits);` (initial call)
- Remove: `setInterval(() => pollSource("habitica", getAllHabits), HABITICA_INTERVAL);`
- Remove: `const HABITICA_INTERVAL = 60_000;`

- [ ] **Step 3: Remove Habitica config**

In `backend/src/config.ts`, remove the `habitica` block from CONFIG:
```typescript
// Remove this:
  habitica: {
    userId: process.env.HABITICA_USER_ID || "",
    apiToken: process.env.HABITICA_API_TOKEN || "",
  },
```

- [ ] **Step 4: Remove Habitica cache usage from habits route**

The old route imported `cacheGet` from cache.ts (added earlier this session). The new route no longer needs it since data is local files, not a polled cache.

- [ ] **Step 5: Verify backend compiles**

Run: `cd "4 - Projekte/Dashboard/backend" && npx tsc --noEmit 2>&1 | grep -v TS6059`
Expected: No errors

- [ ] **Step 6: Test endpoints manually**

Run: `curl -s http://localhost:3001/api/habits | head -200`
Expected: JSON with 3 habits (sleep, supplements, plank), each with streak/bestStreak

Run: `curl -s -X POST http://localhost:3001/api/habits/plank/score -H "Content-Type: application/json" -d '{"direction":"up"}'`
Expected: plank shows `completed: true`

Run: `curl -s -X POST http://localhost:3001/api/habits/plank/score -H "Content-Type: application/json" -d '{"direction":"down"}'`
Expected: plank shows `completed: false`

- [ ] **Step 7: Commit**

```bash
git add "4 - Projekte/Dashboard/backend/src/routes/habits.ts" \
       "4 - Projekte/Dashboard/backend/src/services/poller.ts" \
       "4 - Projekte/Dashboard/backend/src/config.ts"
git commit -m "feat: rewrite habits routes to use local file service, remove Habitica"
```

---

### Task 3: Backend — Serve PWA Static Files

**Files:**
- Modify: `4 - Projekte/Dashboard/backend/src/index.ts`

- [ ] **Step 1: Add static file serving for /habits/ route**

Add to `backend/src/index.ts` after the existing route registrations (before `const server = createServer(app)`):

```typescript
import { resolve as pathResolve } from "path";

// Serve Streaks PWA as static files
app.use("/habits", express.static(pathResolve(import.meta.dirname, "../public/habits")));
// SPA fallback — serve index.html for all /habits/* routes
app.get("/habits/*", (_req, res) => {
  res.sendFile(pathResolve(import.meta.dirname, "../public/habits/index.html"));
});
```

Note: `import.meta.dirname` is available in Node 21+. If the backend uses an older Node, use the `__dirname` pattern already in config.ts.

- [ ] **Step 2: Create the public/habits directory**

Run: `mkdir -p "4 - Projekte/Dashboard/backend/public/habits"`

- [ ] **Step 3: Commit**

```bash
git add "4 - Projekte/Dashboard/backend/src/index.ts"
git commit -m "feat: serve Streaks PWA static files from /habits/"
```

---

### Task 4: PWA — Project Scaffold

**Files:**
- Create: `4 - Projekte/Dashboard/habits-pwa/package.json`
- Create: `4 - Projekte/Dashboard/habits-pwa/tsconfig.json`
- Create: `4 - Projekte/Dashboard/habits-pwa/tsconfig.app.json`
- Create: `4 - Projekte/Dashboard/habits-pwa/vite.config.ts`
- Create: `4 - Projekte/Dashboard/habits-pwa/index.html`
- Create: `4 - Projekte/Dashboard/habits-pwa/src/main.tsx`
- Create: `4 - Projekte/Dashboard/habits-pwa/src/index.css`
- Create: `4 - Projekte/Dashboard/habits-pwa/src/lib/types.ts`
- Create: `4 - Projekte/Dashboard/habits-pwa/src/lib/api.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "habits-pwa",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "framer-motion": "^12.38.0",
    "lucide-react": "^0.500.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "tailwindcss": "^4.2.2",
    "typescript": "~6.0.2",
    "vite": "^8.0.4"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/habits/",
  build: {
    outDir: "../backend/public/habits",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

- [ ] **Step 3: Create tsconfig files**

`tsconfig.json`:
```json
{
  "references": [{ "path": "./tsconfig.app.json" }]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create index.html**

```html
<!doctype html>
<html lang="de" translate="no">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#0a0a0f" />
    <title>Streaks</title>
    <link rel="manifest" href="/habits/manifest.json" />
    <link rel="icon" href="/habits/icon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create PWA manifest**

Create `habits-pwa/public/manifest.json`:
```json
{
  "name": "Streaks",
  "short_name": "Streaks",
  "start_url": "/habits/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#0a0a0f",
  "icons": [
    {
      "src": "/habits/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    }
  ]
}
```

Create `habits-pwa/public/icon.svg` (simple flame icon):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="none" stroke="#30D158" stroke-width="6" stroke-linecap="round"/>
  <path d="M50 30 C50 30, 35 45, 35 55 C35 63, 42 70, 50 70 C58 70, 65 63, 65 55 C65 45, 50 30, 50 30Z" fill="#30D158"/>
</svg>
```

- [ ] **Step 6: Create index.css (Liquid Glass design system)**

`src/index.css`:
```css
@import "tailwindcss";

@font-face {
  font-family: 'SF Pro Display';
  src: local('SF Pro Display'), local('.SFNSDisplay-Regular'), local('SF Pro');
  font-weight: 100 900;
  font-style: normal;
}

@theme {
  --color-surface: rgba(255, 255, 255, 0.08);
  --color-surface-raised: rgba(255, 255, 255, 0.12);
  --color-border: rgba(255, 255, 255, 0.2);
  --color-text-primary: #FFFFFF;
  --color-text-muted: rgba(255, 255, 255, 0.5);
  --color-accent: #007AFF;
  --color-success: #30D158;
  --color-danger: #FF453A;
}

html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  min-height: 100vh;
  min-height: 100dvh;
}

body {
  background-color: #0a0a0f;
  color: #FFFFFF;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: transparent;
}

/* Safe area padding for notched phones */
.safe-top { padding-top: env(safe-area-inset-top, 20px); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 20px); }
```

- [ ] **Step 7: Create types and API client**

`src/lib/types.ts`:
```typescript
export interface HabitItem {
  id: string;
  text: string;
  icon: string;
  type: "daily" | "habit";
  completed: boolean;
  isDue: boolean;
  streak: number;
  bestStreak: number;
  isAntiHabit: boolean;
}

export interface CachedResponse<T> {
  data: T;
  lastUpdated: string;
  isStale: boolean;
}
```

`src/lib/api.ts`:
```typescript
const BASE = "/api";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 8: Create main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 9: Install dependencies**

Run: `cd "4 - Projekte/Dashboard/habits-pwa" && npm install`

- [ ] **Step 10: Commit**

```bash
git add "4 - Projekte/Dashboard/habits-pwa/"
git commit -m "feat: scaffold Streaks PWA project"
```

---

### Task 5: PWA — HabitRing Component

**Files:**
- Create: `4 - Projekte/Dashboard/habits-pwa/src/components/HabitRing.tsx`

- [ ] **Step 1: Build the ring component**

```tsx
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { icons } from "lucide-react";
import type { HabitItem } from "../lib/types";

interface Props {
  habit: HabitItem;
  onScore: (id: string, direction: "up" | "down") => void;
}

function LucideIcon({ name, size = 28, color = "white" }: { name: string; size?: number; color?: string }) {
  const IconComponent = (icons as any)[
    name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  ];
  if (!IconComponent) return <span style={{ fontSize: size, color }}>?</span>;
  return <IconComponent size={size} color={color} strokeWidth={1.8} />;
}

const RING_SIZE = 96;
const STROKE_WIDTH = 5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HabitRing({ habit, onScore }: Props) {
  const [showBurst, setShowBurst] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const isCompleted = habit.isAntiHabit ? !habit.completed : habit.completed;
  const isBroken = habit.isAntiHabit && habit.completed;

  const ringColor = isBroken
    ? "#FF453A"
    : isCompleted
    ? "#30D158"
    : "rgba(255,255,255,0.15)";

  const dashOffset = isCompleted || isBroken ? 0 : CIRCUMFERENCE;

  function handlePointerDown() {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      // Long press = undo
      if (habit.isAntiHabit) {
        onScore(habit.id, habit.completed ? "down" : "up");
      } else {
        if (habit.completed) onScore(habit.id, "down");
      }
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (didLongPress.current) return;

    // Tap = complete
    if (habit.isAntiHabit) {
      // Tap on anti-habit = "I broke it"
      if (!habit.completed) {
        onScore(habit.id, "up");
      }
    } else {
      if (!habit.completed) {
        onScore(habit.id, "up");
        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 600);
      }
    }
  }

  function handlePointerLeave() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative select-none"
        style={{ width: RING_SIZE, height: RING_SIZE, cursor: "pointer" }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* Background ring */}
        <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE_WIDTH}
          />
        </svg>

        {/* Animated progress ring */}
        <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </svg>

        {/* Icon centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <LucideIcon
            name={habit.icon || "circle"}
            size={28}
            color={isCompleted || isBroken ? ringColor : "rgba(255,255,255,0.5)"}
          />
        </div>

        {/* Success burst */}
        {showBurst && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 pointer-events-none"
            style={{ borderColor: "#30D158" }}
          />
        )}
      </div>

      {/* Label */}
      <span className="text-[12px] font-semibold text-white/70 text-center leading-tight max-w-[90px] truncate">
        {habit.text}
      </span>

      {/* Streak */}
      <span className={`text-[11px] font-bold ${isCompleted ? "text-success" : "text-white/30"}`}>
        {habit.streak > 0 ? `🔥 ${habit.streak}` : "0"}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "4 - Projekte/Dashboard/habits-pwa/src/components/HabitRing.tsx"
git commit -m "feat: add HabitRing component with SVG ring + Lucide icons"
```

---

### Task 6: PWA — App Shell (Grid + Progress + Add Form)

**Files:**
- Create: `4 - Projekte/Dashboard/habits-pwa/src/App.tsx`
- Create: `4 - Projekte/Dashboard/habits-pwa/src/components/AddHabit.tsx`

- [ ] **Step 1: Build AddHabit bottom sheet**

`src/components/AddHabit.tsx`:
```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { icons } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (habit: { id: string; text: string; icon: string; type: "positive" | "negative" }) => void;
}

// Curated icon set for habits
const ICON_OPTIONS = [
  "dumbbell", "moon", "pill", "heart", "apple", "droplet", "sun", "book-open",
  "brain", "coffee", "ban", "cigarette", "beer", "candy", "flame", "footprints",
  "bike", "bed", "alarm-clock", "pen-line", "music", "eye", "smile", "zap",
];

function LucideIcon({ name, size = 22, color = "white" }: { name: string; size?: number; color?: string }) {
  const IconComponent = (icons as any)[
    name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  ];
  if (!IconComponent) return <span style={{ fontSize: size, color }}>?</span>;
  return <IconComponent size={size} color={color} strokeWidth={1.8} />;
}

export function AddHabit({ open, onClose, onSave }: Props) {
  const [text, setText] = useState("");
  const [icon, setIcon] = useState("flame");
  const [type, setType] = useState<"positive" | "negative">("positive");

  function handleSave() {
    if (!text.trim()) return;
    const id = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    onSave({ id, text: text.trim(), icon, type });
    setText("");
    setIcon("flame");
    setType("positive");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-6 pt-6 pb-8 safe-bottom"
            style={{
              background: "rgba(30,30,40,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderBottom: "none",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

            <h3 className="text-lg font-bold text-white mb-4">Neuer Habit</h3>

            {/* Name input */}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Habit Name..."
              className="w-full px-4 py-3 rounded-xl text-white text-sm font-medium mb-4 outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              autoFocus
            />

            {/* Type toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setType("positive")}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: type === "positive" ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.06)",
                  border: type === "positive" ? "1px solid rgba(48,209,88,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  color: type === "positive" ? "#7DFFAA" : "rgba(255,255,255,0.5)",
                }}
              >
                Positiv
              </button>
              <button
                onClick={() => setType("negative")}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: type === "negative" ? "rgba(255,69,58,0.15)" : "rgba(255,255,255,0.06)",
                  border: type === "negative" ? "1px solid rgba(255,69,58,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  color: type === "negative" ? "#FF6961" : "rgba(255,255,255,0.5)",
                }}
              >
                Negativ
              </button>
            </div>

            {/* Icon picker */}
            <div className="grid grid-cols-8 gap-2 mb-5">
              {ICON_OPTIONS.map((name) => (
                <button
                  key={name}
                  onClick={() => setIcon(name)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                  style={{
                    background: icon === name ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                    border: icon === name ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
                  }}
                >
                  <LucideIcon name={name} size={18} color={icon === name ? "white" : "rgba(255,255,255,0.4)"} />
                </button>
              ))}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!text.trim()}
              className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity"
              style={{
                background: text.trim() ? "linear-gradient(135deg, #30D158, #28B84E)" : "rgba(255,255,255,0.08)",
                color: text.trim() ? "white" : "rgba(255,255,255,0.3)",
                opacity: text.trim() ? 1 : 0.5,
              }}
            >
              Speichern
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Build the App shell**

`src/App.tsx`:
```tsx
import { useState, useEffect, useCallback } from "react";
import { HabitRing } from "./components/HabitRing";
import { AddHabit } from "./components/AddHabit";
import { apiFetch } from "./lib/api";
import type { HabitItem, CachedResponse } from "./lib/types";

export function App() {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await apiFetch<CachedResponse<HabitItem[]>>("/habits");
      setHabits(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  async function handleScore(id: string, direction: "up" | "down") {
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, completed: direction === "up" } : h
      )
    );
    try {
      const res = await apiFetch<CachedResponse<HabitItem[]>>(`/habits/${id}/score`, {
        method: "POST",
        body: JSON.stringify({ direction }),
      });
      setHabits(res.data);
    } catch {
      fetchHabits();
    }
  }

  async function handleAddHabit(habit: { id: string; text: string; icon: string; type: "positive" | "negative" }) {
    try {
      const res = await apiFetch<CachedResponse<HabitItem[]>>("/habits", {
        method: "PUT",
        body: JSON.stringify(habit),
      });
      setHabits(res.data);
    } catch {}
  }

  const completedCount = habits.filter((h) =>
    h.isAntiHabit ? !h.completed : h.completed
  ).length;
  const progress = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
  const comboStreak = habits.length > 0
    ? Math.min(...habits.map((h) => h.streak))
    : 0;

  return (
    <div className="min-h-screen min-h-dvh flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Streaks</h1>
        <p className="text-[13px] text-white/40 font-medium mt-1">
          {completedCount}/{habits.length} heute erledigt
          {comboStreak > 0 && <span className="text-success ml-2">🔥 {comboStreak} Tage Combo</span>}
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-6 mb-6">
        <div className="h-[4px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: progress === 100 ? "#30D158" : "rgba(255,255,255,0.3)",
            }}
          />
        </div>
      </div>

      {/* Habit grid */}
      <div className="flex-1 px-4">
        <div
          className="grid justify-items-center gap-y-6"
          style={{ gridTemplateColumns: `repeat(${habits.length <= 3 ? habits.length : Math.min(3, habits.length)}, 1fr)` }}
        >
          {habits.map((habit) => (
            <HabitRing key={habit.id} habit={habit} onScore={handleScore} />
          ))}
        </div>

        {habits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-white/30 text-sm font-medium">Noch keine Habits</p>
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="px-6 pb-6 pt-4">
        <button
          onClick={() => setAddOpen(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white/50 transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          + Habit hinzufügen
        </button>
      </div>

      <AddHabit
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAddHabit}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd "4 - Projekte/Dashboard/habits-pwa" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add "4 - Projekte/Dashboard/habits-pwa/src/App.tsx" \
       "4 - Projekte/Dashboard/habits-pwa/src/components/AddHabit.tsx"
git commit -m "feat: add Streaks PWA app shell with grid, progress bar, add form"
```

---

### Task 7: PWA — Build & Verify

**Files:**
- Build output: `4 - Projekte/Dashboard/backend/public/habits/`

- [ ] **Step 1: Build the PWA**

Run: `cd "4 - Projekte/Dashboard/habits-pwa" && npm run build`
Expected: Build succeeds, output written to `../backend/public/habits/`

- [ ] **Step 2: Verify files exist**

Run: `ls "4 - Projekte/Dashboard/backend/public/habits/"`
Expected: `index.html`, `manifest.json`, `icon.svg`, `assets/` directory

- [ ] **Step 3: Test the PWA via backend**

Run: `curl -s http://localhost:3001/habits/ | head -5`
Expected: HTML content with `<title>Streaks</title>`

Run: `curl -s http://localhost:3001/habits/manifest.json`
Expected: PWA manifest JSON

- [ ] **Step 4: Commit build output**

```bash
git add "4 - Projekte/Dashboard/backend/public/habits/"
git commit -m "feat: build Streaks PWA to backend static files"
```

---

### Task 8: Dashboard — Remove Habitica, Wire Up New Habits

**Files:**
- Delete: `4 - Projekte/Dashboard/backend/src/services/habitica.ts`
- Modify: `4 - Projekte/Dashboard/frontend/src/pages/Heute.tsx` (lines 39-45)
- Modify: `4 - Projekte/Dashboard/frontend/src/lib/types.ts` (HabitItem)

- [ ] **Step 1: Delete old Habitica service**

Run: `rm "4 - Projekte/Dashboard/backend/src/services/habitica.ts"`

- [ ] **Step 2: Update frontend HabitItem type**

In `frontend/src/lib/types.ts`, update HabitItem to include new fields:

```typescript
export interface HabitItem {
  id: string;
  text: string;
  icon: string;
  type: "daily" | "habit";
  completed: boolean;
  isDue: boolean;
  streak: number;
  bestStreak: number;
  isAntiHabit: boolean;
}
```

(Adds `icon` and `bestStreak` — both are now returned by the new API. Existing fields stay the same so HabitsCard keeps working.)

- [ ] **Step 3: Remove scoredIds workaround from Heute.tsx**

In `frontend/src/pages/Heute.tsx`, the `scoredIds` state and the merge logic (lines 39-45) existed because Habitica was slow. The new local API is instant, so remove:

Replace:
```typescript
  // Scored habits — persists across re-renders, never reset by server data
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set());

  // Merge server habits with local scored state
  const habits = rawHabits.map((h) =>
    scoredIds.has(h.id) ? { ...h, completed: true } : h
  );
```

With:
```typescript
  const habits = rawHabits;
```

Also remove the `handleScore` function and update `HabitsCard` to refetch instead:

Replace:
```typescript
  function handleScore(id: string) {
    setScoredIds((prev) => new Set(prev).add(id));
  }
```

With:
```typescript
  function handleScore(id: string) {
    // Server updates instantly (local file), just refetch
    apiFetch(`/habits/${id}/score`, {
      method: "POST",
      body: JSON.stringify({ direction: "up" }),
    }).then(() => fetchSource("habitica")).catch(() => {});
  }
```

- [ ] **Step 4: Verify both frontend and backend compile**

Run: `cd "4 - Projekte/Dashboard/backend" && npx tsc --noEmit 2>&1 | grep -v TS6059`
Run: `cd "4 - Projekte/Dashboard/frontend" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add -A "4 - Projekte/Dashboard/"
git commit -m "feat: remove Habitica, wire Dashboard to local habits service"
```

---

### Task 9: End-to-End Verification

- [ ] **Step 1: Restart backend**

Run: Backend should auto-restart via `tsx watch`. Verify: `curl -s http://localhost:3001/api/health`

- [ ] **Step 2: Test habits API**

Run: `curl -s http://localhost:3001/api/habits`
Expected: 3 habits with streak data

- [ ] **Step 3: Test scoring**

Run: `curl -s -X POST http://localhost:3001/api/habits/plank/score -H "Content-Type: application/json" -d '{"direction":"up"}'`
Expected: plank `completed: true`, streak increases

- [ ] **Step 4: Test PWA loads**

Open `http://localhost:3001/habits/` in browser.
Expected: Streaks PWA with 3 habit rings

- [ ] **Step 5: Test Dashboard still works**

Open `http://localhost:5173` in browser.
Expected: HabitsCard shows same habits, scoring works

- [ ] **Step 6: Test live sync**

Score a habit in PWA → Dashboard should update within 1-2 seconds (via WebSocket broadcast)

- [ ] **Step 7: Final commit**

```bash
git add -A "4 - Projekte/Dashboard/"
git commit -m "feat: Streaks PWA complete — habit tracking replaces Habitica"
```
