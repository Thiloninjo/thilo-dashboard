import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard, CardHeader } from "../../components/GlassCard";
import { apiFetch } from "../../lib/api";
import type { HabitItem } from "../../lib/types";

interface Props {
  habits: HabitItem[];
  onScore: (id: string) => void;
}

export function HabitsCard({ habits, onScore }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function scoreHabit(id: string) {
    if (loading) return;

    // Tell parent immediately — this is the source of truth
    onScore(id);
    setLoading(id);

    try {
      await apiFetch(`/habits/${id}/score`, {
        method: "POST",
        body: JSON.stringify({ direction: "up" }),
      });
    } catch {
      // Already scored in parent — can't revert easily, but Habitica should accept it
    } finally {
      setLoading(null);
    }
  }

  return (
    <GlassCard>
      <CardHeader title="Habits" badge="Habitica" badgeColor="text-success" />
      <div className="flex flex-col gap-1">
        {habits.length === 0 && <p className="text-white/40 text-sm font-medium">Keine Habits konfiguriert</p>}
        {habits.map((habit) => (
          <div
            key={habit.id}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
              habit.isAntiHabit ? "hover:bg-danger/8" : "hover:bg-white/8"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-[14px] flex-shrink-0 transition-colors ${
                habit.isAntiHabit ? "bg-danger/15" : habit.completed ? "bg-success/15" : "bg-white/10"
              }`}
            >
              {habit.isAntiHabit ? "🚫" : habit.completed ? "✓" : "💪"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{habit.text}</div>
              <div className={`text-xs mt-0.5 font-medium ${habit.isAntiHabit ? "text-danger" : habit.completed || habit.streak > 0 ? "text-success" : "text-white/40"}`}>
                {habit.isAntiHabit
                  ? `Anti-Habit · ${habit.completed ? "Geschafft" : "Noch offen"}`
                  : habit.completed
                  ? `🔥 ${Math.max(habit.streak, 1)} Tage`
                  : habit.streak > 0
                  ? `🔥 ${habit.streak} Tage`
                  : "Streak: 0"}
              </div>
            </div>
            {habit.completed ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="text-success text-sm font-bold"
              >
                ✓
              </motion.span>
            ) : (
              <button
                onClick={() => scoreHabit(habit.id)}
                disabled={loading === habit.id}
                className={`w-[18px] h-[18px] rounded border-[1.5px] transition-colors ${
                  loading === habit.id
                    ? "border-white/20 opacity-50"
                    : "border-slate-600 hover:border-success"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
