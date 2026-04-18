import { useState, useEffect, useCallback, useRef } from "react";
import { KpiHeader } from "./heute/KpiHeader";
import { ProfileCard } from "./heute/ProfileCard";
import { HabitsCard } from "./heute/HabitsCard";
import { CalendarCard } from "./heute/CalendarCard";
import { StepsCard } from "./heute/StepsCard";
import { WeeklyGoalsCard } from "./heute/WeeklyGoalsCard";
import { TasksCard } from "./heute/TasksCard";
import { TaskBoard } from "../components/TaskBoard";
import { apiFetch } from "../lib/api";
import { onWSMessage } from "../lib/ws";
import type { CalendarEvent, Task, HabitItem, WeeklyGoals, CachedResponse } from "../lib/types";

// Only update state if data actually changed — prevents flicker/re-render on identical polling responses
function useStableState<T>(initial: T): [T, (newVal: T) => void] {
  const [state, setState] = useState<T>(initial);
  const jsonRef = useRef(JSON.stringify(initial));
  const setStable = useCallback((newVal: T) => {
    const json = JSON.stringify(newVal);
    if (json !== jsonRef.current) {
      jsonRef.current = json;
      setState(newVal);
    }
  }, []);
  return [state, setStable];
}

export function Heute() {
  const [events, setEvents] = useStableState<CalendarEvent[]>([]);
  const [vaultTasks, setVaultTasks] = useStableState<Task[]>([]);
  const [todoistTasks, setTodoistTasks] = useStableState<Task[]>([]);
  const [asanaTasks, setAsanaTasks] = useStableState<Task[]>([]);
  const [rawHabits, setRawHabits] = useStableState<HabitItem[]>([]);
  const [goals, setGoals] = useStableState<WeeklyGoals>({ weekNumber: 0, year: 0, dateRange: "", team: [], personal: [] });

  const [loaded, setLoaded] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [drehTasks, setDrehTasks] = useState<Task[]>([]);

  const habits = rawHabits;

  const todayDate = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;

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

  // Fetch only the source that changed — avoids full reload on every poller tick
  const fetchSource = useCallback(async (source: string) => {
    if (source === "calendar") {
      const cal = await apiFetch<CachedResponse<CalendarEvent[]>>("/calendar/today").catch(() => null);
      if (cal) setEvents(cal.data);
    } else if (source === "todoist") {
      const todoist = await apiFetch<CachedResponse<Task[]>>("/tasks/todoist").catch(() => null);
      if (todoist) setTodoistTasks(todoist.data);
    } else if (source === "habitica") {
      const hab = await apiFetch<CachedResponse<HabitItem[]>>("/habits").catch(() => null);
      if (hab) setRawHabits(hab.data);
    }
  }, []);

  // Fetch dreh context — creates tasks when DrehAlert (!) would show
  const fetchDrehContext = useCallback(async () => {
    try {
      const dreh = await apiFetch<{ data: { isDrehToday: boolean; isDrehTomorrow: boolean } }>("/calendar/dreh-context");
      const tasks: Task[] = [];
      if (dreh.data.isDrehTomorrow) {
        tasks.push({ id: "dreh-vorabend", description: "🎬 Drehtag-Vorbereitungen abschließen", content: "🎬 Drehtag-Vorbereitungen abschließen", completed: false, dueDate: todayDate, source: "vault" });
      }
      if (dreh.data.isDrehToday) {
        tasks.push({ id: "dreh-morgen", description: "🎬 Drehtag-Checkliste abschließen", content: "🎬 Drehtag-Checkliste abschließen", completed: false, dueDate: todayDate, source: "vault" });
      }
      setDrehTasks(tasks);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    fetchDrehContext();
    return onWSMessage((msg) => {
      if (msg.type === "vault-changed") fetchAll();
      // When calendar data changes, also re-check dreh context
      if (msg.type === "api-updated" && msg.source === "calendar") fetchDrehContext();
      if (msg.type === "api-updated" && msg.source) fetchSource(msg.source);
    });
  }, [fetchAll, fetchSource]);

  function handleScore(id: string) {
    apiFetch(`/habits/${id}/score`, {
      method: "POST",
      body: JSON.stringify({ direction: "up" }),
    }).then(() => fetchSource("habitica")).catch(() => {});
  }

  // Combined streak: how many consecutive days ALL habits were completed
  // Uses the minimum streak across all non-anti habits
  const nonAntiHabits = habits.filter((h) => !h.isAntiHabit);
  const combinedStreak = nonAntiHabits.length > 0
    ? Math.min(...nonAntiHabits.map((h) => h.streak))
    : 0;
  const completedHabits = habits.filter((h) => h.completed).length;
  const allTasks = [...vaultTasks, ...todoistTasks];
  const allGoals = [...goals.team, ...goals.personal];
  const weekCompletion = allGoals.length > 0 ? Math.round((allGoals.filter((g) => g.completed).length / allGoals.length) * 100) : 0;

  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
          <div className="text-white/60 text-sm font-medium animate-pulse">Dashboard laden...</div>
        </div>
      )}
      <div className="relative mb-6">
        <KpiHeader
          eventCount={events.length}
          taskCount={allTasks.filter((t) => !t.completed).length}
          habitStreak={combinedStreak}
          habitsToday={completedHabits}
          habitsTotal={habits.length}
          weekCompletion={weekCompletion}
          weekNumber={goals.weekNumber}
        />
        <p
          className="absolute left-1/2 -translate-x-1/2 text-white text-[26px] italic font-medium tracking-wide"
          style={{ top: "5.2rem", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
        >
          &ldquo;Ich werde der Editor, der eigenständig alle Entscheidungen trifft. Man kann mir blind vertrauen.&rdquo;
        </p>
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "280px 1fr 280px",
          gap: "20px",
        }}
      >
        <TasksCard vaultTasks={[...drehTasks, ...vaultTasks]} todoistTasks={todoistTasks} onRefresh={fetchAll} onOpenBoard={() => setBoardOpen(true)} />
        <div className="flex flex-col gap-4">
          <CalendarCard events={events} />
          <WeeklyGoalsCard goals={goals} />
        </div>
        <div className="flex flex-col gap-4">
          <ProfileCard />
          <StepsCard />
          <HabitsCard habits={habits} onScore={handleScore} />
        </div>
      </div>
      <TaskBoard
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        todoistTasks={todoistTasks}
        asanaTasks={asanaTasks}
        onCheckOff={(task) => {
          // Reuse the same check-off logic
          const key = `${task.source}-${task.id}`;
          if (task.source === "vault") {
            apiFetch(`/tasks/${task.id}`, { method: "PATCH" }).catch(() => {});
          } else if (task.source === "todoist") {
            apiFetch(`/tasks/todoist/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: true }) }).catch(() => {});
          }
          setTimeout(fetchAll, 1000);
        }}
      />
    </div>
  );
}
