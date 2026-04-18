# Streaks PWA — Design Spec

## Overview

Standalone Progressive Web App for daily habit tracking, hosted on the existing Dashboard backend. Replaces Habitica with a self-owned solution. Mobile-first, Liquid Glass design matching the Dashboard.

**URL:** `https://46-225-160-248.nip.io/habits/`
**Installable:** As PWA on phone homescreen

---

## Data Model

### `data/habits.json` — Habit Definitions

```json
[
  {
    "id": "plank",
    "text": "Plank",
    "icon": "dumbbell",
    "type": "positive",
    "frequency": "daily",
    "createdAt": "2026-04-15"
  },
  {
    "id": "no-fastfood",
    "text": "Kein Fast Food",
    "icon": "ban",
    "type": "negative",
    "frequency": "daily",
    "createdAt": "2026-04-15"
  }
]
```

- `type`: `"positive"` (do this) or `"negative"` (don't do this)
- `frequency`: `"daily"` only for now
- `icon`: Lucide icon name (e.g. `"dumbbell"`, `"moon"`, `"pill"`, `"ban"`) — clean line icons, same style as SF Symbols in the Streaks app. Full library: https://lucide.dev/icons
- Max 12 habits

### `data/habit-log.json` — Daily Completions

```json
{
  "2026-04-15": {
    "plank": true,
    "supplements": true
  },
  "2026-04-14": {
    "plank": true,
    "supplements": true,
    "sleep": true
  }
}
```

- Key: ISO date string
- Value: object mapping habit IDs to `true` (completed)
- Missing key = not completed
- Log is append-only; old entries never modified (except same-day toggle)

### Streak Calculation

Computed at read time from `habit-log.json`, not stored:

```
currentStreak(habitId):
  count = 0
  day = today (or yesterday if not yet completed today)
  while log[day][habitId] === true:
    count++
    day = day - 1
  return count

bestStreak(habitId):
  scan all log entries, find longest consecutive run
```

For negative habits: a day counts as "completed" if NOT marked (absence = success). The log entry `"no-fastfood": true` means the user broke the streak (ate fast food).

---

## API Endpoints

All on existing backend under `/api/habits`. Replaces current Habitica proxy.

### `GET /api/habits`

Returns all habits with today's status and streaks.

```json
{
  "data": [
    {
      "id": "plank",
      "text": "Plank",
      "emoji": "💪",
      "type": "positive",
      "completed": false,
      "streak": 5,
      "bestStreak": 12,
      "isDue": true
    }
  ],
  "lastUpdated": "2026-04-15T10:00:00Z",
  "isStale": false
}
```

Response shape matches `CachedResponse<HabitItem[]>` so Dashboard integration is drop-in.

### `POST /api/habits/:id/score`

Toggle habit completion for today.

```json
// Request body
{ "direction": "up" }   // mark completed
{ "direction": "down" } // undo completion
```

Returns updated habit list (same shape as GET).

After mutation: broadcasts `{ type: "api-updated", source: "habitica" }` via WebSocket so Dashboard updates live. (Keeps source name "habitica" for backwards compatibility with frontend handler.)

### `PUT /api/habits`

Create or update a habit.

```json
// Request body
{
  "id": "meditation",
  "text": "Meditation",
  "emoji": "🧘",
  "type": "positive"
}
```

### `DELETE /api/habits/:id`

Remove a habit. Does not delete log history.

---

## PWA Frontend

### Tech Stack

- Single HTML page served at `/habits/`
- Vanilla TypeScript + inline styles (no build step needed — keeps it independent from Dashboard's Vite setup)
- Or: small Vite app built to `backend/public/habits/` as static files
- Uses same CSS variables and Liquid Glass styles as Dashboard

**Decision: Static Vite build** — small React app (same stack as Dashboard) built to `backend/public/habits/`. The backend serves it as static files. This keeps the design system consistent and allows reuse of components.

### Layout (Mobile-First)

```
┌──────────────────────────┐
│  Header: "Streaks"       │
│  Subtitle: streak count  │
├──────────────────────────┤
│                          │
│    ◯    ◯    ◯          │  ← Ring grid (2-3 per row)
│   ⚡   💊   🌙          │    Lucide icons inside rings
│  Plank Suppl Sleep       │    Tap to complete
│                          │
│    ◯    ◯    ◯          │
│   ⊘                     │
│  NoFF                    │
│                          │
├──────────────────────────┤
│  Today: 2/6 completed    │
│  ████████░░░░░░░  33%    │
├──────────────────────────┤
│  Best streak: 12 days    │
│  Current combo: 5 days   │
└──────────────────────────┘
```

### Ring Component

Each habit is a circular ring (SVG `<circle>` with `stroke-dashoffset`):

- **Empty ring:** white/30 stroke — not completed
- **Filled ring (positive):** green (#30D158) animated fill — completed
- **Filled ring (negative, holding):** green — still clean today
- **Broken ring (negative, failed):** red (#FF453A) — broke the habit
- **Lucide icon** centered inside ring (white, clean line style)
- **Habit name** below ring
- **Streak count** below name, small text

### Interactions

- **Tap ring:** completes habit (ring fills with spring animation)
- **Long-press ring (500ms):** undo completion (ring empties)
- **Tap streak count:** shows detail view with calendar heatmap (stretch goal, not v1)

### Animations

- Ring fill: animated `stroke-dashoffset` transition (0.6s ease-out)
- On complete: ring pulses + subtle confetti burst (CSS only, like Checkbox success ring)
- Number count-up for streak when it increases

### Manage Habits

Bottom sheet / simple form:
- Add habit: icon picker (grid of Lucide icons), name, type (positive/negative)
- Edit: tap-and-hold on habit name
- Delete: swipe or delete button in edit mode
- Reorder: drag (stretch goal, not v1)

---

## Dashboard Integration

### Replace Habitica Service

- Remove `backend/src/services/habitica.ts`
- New `backend/src/services/habits.ts` reads/writes `data/habits.json` and `data/habit-log.json`
- Remove Habitica config from `config.ts` and `.env`
- Remove Habitica from poller (no polling needed — data is local)

### Update Routes

- `backend/src/routes/habits.ts` — rewire to new service
- Response shape stays the same (`HabitItem[]` with `CachedResponse` wrapper)

### Frontend HabitsCard

- No changes needed to `HabitsCard.tsx` — same API shape
- `scoreHabit` already calls `POST /api/habits/:id/score`
- Remove `scoredIds` optimistic state in `Heute.tsx` — server response is now instant (no external API delay)

### WebSocket

- On habit score: broadcast `api-updated` with source `"habitica"` (keeps existing frontend handler working)
- Dashboard `fetchSource("habitica")` picks it up automatically

---

## File Structure

```
backend/
  src/
    services/
      habits.ts          ← NEW: read/write habits + log files
      habitica.ts        ← DELETED
    routes/
      habits.ts          ← MODIFIED: use new service
  data/
    habits.json          ← NEW: habit definitions
    habit-log.json       ← NEW: daily completions
  public/
    habits/              ← NEW: PWA static files
      index.html
      manifest.json
      assets/

habits-pwa/              ← NEW: PWA source (builds to backend/public/habits/)
  src/
    App.tsx
    components/
      HabitRing.tsx      ← SVG ring with Lucide icon + animation
      HabitGrid.tsx      ← Grid layout of rings
      AddHabit.tsx       ← Add/edit form
      ProgressBar.tsx    ← Daily progress
    lib/
      api.ts             ← API client (direct to server, no local fallback needed)
      types.ts
  index.html
  vite.config.ts
  package.json
```

---

## Migration Plan

1. Build new habits service + API routes
2. Seed `habits.json` with current 3 habits from Habitica
3. Build PWA
4. Verify PWA works standalone
5. Switch Dashboard to new endpoints
6. Remove Habitica service + config
7. Deploy to Hetzner

---

## Out of Scope (v1)

- Offline support / service worker caching
- Push notifications / reminders
- Calendar heatmap view
- Habit reordering via drag
- Weekly/custom frequency habits (daily only)
- Multi-user support
