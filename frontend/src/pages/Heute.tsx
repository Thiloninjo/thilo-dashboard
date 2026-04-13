import { useState, useEffect, useCallback, useRef } from "react";
import { KpiHeader } from "./heute/KpiHeader";
import { ProfileCard } from "./heute/ProfileCard";
import { HabitsCard } from "./heute/HabitsCard";
import { CalendarCard } from "./heute/CalendarCard";
import { WeeklyGoalsCard } from "./heute/WeeklyGoalsCard";
import { TasksCard } from "./heute/TasksCard";
import { apiFetch } from "../lib/api";
import { onWSMessage } from "../lib/ws";
import type { CalendarEvent, Task, HabitItem, WeeklyGoals, CachedResponse } from "../lib/types";

// Only update state if data actually changed (prevents flicker)
function useStableState<T>(initial: T): [T, (newVal: T) => void] {
  const [state, setState] = useState<T>(initial);
  const ref = useRef(JSON.stringify(initial));
  const setStable = useCallback((newVal: T) => {
    const json = JSON.stringify(newVal);
    if (json !== ref.current) {
      ref.current = json;
      setState(newVal);
    }
  }, []);
  return [state, setStable];
}

export function Heute() {
  const [events, setEvents] = useStableState<CalendarEvent[]>([]);
  const [vaultTasks, setVaultTasks] = useStableState<Task[]>([]);
  const [todoistTasks, setTodoistTasks] = useStableState<Task[]>([]);
  const [habits, setHabits] = useStableState<HabitItem[]>([]);
  const [goals, setGoals] = useStableState<WeeklyGoals>({ weekNumber: 0, year: 0, dateRange: "", team: [], personal: [] });

  // Cooldown: after scoring a habit, ignore habit updates for 10 seconds
  const habitCooldown = useRef(false);

  const freezeHabits = useCallback(() => {
    habitCooldown.current = true;
    setTimeout(() => { habitCooldown.current = false; }, 10_000);
  }, []);

  const fetchAll = useCallback(async () => {
    const [cal, vault, todoist, hab, wg] = await Promise.all([
      apiFetch<CachedResponse<CalendarEvent[]>>("/calendar/today").catch(() => null),
      apiFetch<CachedResponse<Task[]>>("/tasks?date=" + new Date().toISOString().slice(0, 10)).catch(() => null),
      apiFetch<CachedResponse<Task[]>>("/tasks/todoist").catch(() => null),
      habitCooldown.current ? null : apiFetch<CachedResponse<HabitItem[]>>("/habits").catch(() => null),
      apiFetch<CachedResponse<WeeklyGoals>>("/weekly-goals").catch(() => null),
    ]);
    if (cal) setEvents(cal.data);
    if (vault) setVaultTasks(vault.data);
    if (todoist) setTodoistTasks(todoist.data);
    if (hab) setHabits(hab.data);
    if (wg) setGoals(wg.data);
  }, [setEvents, setVaultTasks, setTodoistTasks, setHabits, setGoals]);

  useEffect(() => {
    fetchAll();
    return onWSMessage((msg) => {
      if (msg.type === "vault-changed" || msg.type === "api-updated") fetchAll();
    });
  }, [fetchAll]);

  const topStreak = habits.reduce((best, h) => (h.streak > best.days ? { name: h.text, days: h.streak } : best), { name: "Planks", days: 0 });
  const completedHabits = habits.filter((h) => h.completed).length;
  const allTasks = [...vaultTasks, ...todoistTasks];
  const allGoals = [...goals.team, ...goals.personal];
  const weekCompletion = allGoals.length > 0 ? Math.round((allGoals.filter((g) => g.completed).length / allGoals.length) * 100) : 0;

  return (
    <>
      <KpiHeader
        eventCount={events.length}
        taskCount={allTasks.filter((t) => !t.completed).length}
        habitStreak={topStreak.days}
        habitsToday={completedHabits}
        weekCompletion={weekCompletion}
        weekNumber={goals.weekNumber}
      />
      <div className="grid grid-cols-[280px_1fr_280px] gap-4">
        <div className="flex flex-col gap-4">
          <ProfileCard topStreak={topStreak} />
          <HabitsCard habits={habits} onRefresh={fetchAll} onScore={freezeHabits} />
        </div>
        <div className="flex flex-col gap-4">
          <CalendarCard events={events} />
          <WeeklyGoalsCard goals={goals} />
        </div>
        <TasksCard vaultTasks={vaultTasks} todoistTasks={todoistTasks} onRefresh={fetchAll} />
      </div>
    </>
  );
}
