import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "./lib/api";
import type { HabitItem } from "./lib/types";
import { HabitRing } from "./components/HabitRing";
import { AddHabit } from "./components/AddHabit";

export function App() {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  async function fetchHabits() {
    try {
      const res = await apiFetch<{ data: HabitItem[] }>("/habits");
      setHabits(res.data);
    } catch (err) {
      console.error("Failed to fetch habits", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHabits();
  }, []);

  async function handleScore(id: string, direction: "up" | "down") {
    // Optimistic: only toggle completed state, don't touch streak
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        return { ...h, completed: direction === "up" };
      })
    );

    try {
      const res = await apiFetch<{ data: HabitItem[] }>(`/habits/${id}/score`, {
        method: "POST",
        body: JSON.stringify({ direction }),
      });
      // Always use server response (has correct streak calculations)
      setHabits(res.data);
    } catch (err) {
      console.error("Score failed, reverting", err);
      await fetchHabits();
    }
  }

  async function handleAddHabit(habit: { id: string; text: string; icon: string; type: "positive" | "negative" }) {
    try {
      await apiFetch("/habits", {
        method: "PUT",
        body: JSON.stringify(habit),
      });
      await fetchHabits();
    } catch (err) {
      console.error("Add habit failed", err);
    }
  }

  const totalHabits = habits.length;
  const completedHabits = habits.filter((h) => {
    if (h.isAntiHabit) return !h.completed; // Anti-habit "completed" = clean
    return h.completed;
  }).length;
  const progressPct = totalHabits > 0 ? completedHabits / totalHabits : 0;
  const comboStreak = habits.length > 0 ? Math.min(...habits.map((h) => h.streak)) : 0;

  // Grid columns: 3 unless fewer habits
  const gridCols = totalHabits < 3 ? totalHabits || 1 : 3;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0a0f", color: "white" }}
    >
      {/* Header — extra top padding for iPhone notch/dynamic island */}
      <div className="px-5 pb-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 16px)" }}>
        <div className="flex items-end justify-between mb-1">
          <h1 className="text-3xl font-bold tracking-tight">Streaks</h1>
          {comboStreak > 0 && (
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ background: "rgba(48,209,88,0.15)", color: "#30D158" }}
            >
              🔥 {comboStreak} Combo
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          {completedHabits} / {totalHabits} erledigt
        </p>

        {/* Progress bar */}
        <div
          className="mt-3 rounded-full overflow-hidden"
          style={{ height: 4, background: "rgba(255,255,255,0.08)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #30D158, #7DFFAA)" }}
            animate={{ width: `${progressPct * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Habit grid */}
      <div className="flex-1 px-5 py-4">
        {loading ? (
          <div
            className="flex items-center justify-center py-20 text-sm"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Laden...
          </div>
        ) : habits.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span className="text-4xl">🌱</span>
            <p className="text-sm">Noch keine Habits</p>
          </div>
        ) : (
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
          >
            {habits.map((habit) => (
              <div key={habit.id} className="flex justify-center">
                <HabitRing habit={habit} onScore={handleScore} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add button */}
      <div
        className="px-5 pt-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 16px)" }}
      >
        <button
          onClick={() => setAddOpen(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          + Habit hinzufügen
        </button>
      </div>

      {/* Add habit sheet */}
      <AddHabit open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddHabit} />
    </div>
  );
}
