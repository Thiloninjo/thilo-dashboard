import { GlassCard, CardHeader } from "../../components/GlassCard";
import { apiFetch } from "../../lib/api";
import type { HabitItem } from "../../lib/types";

interface Props {
  habits: HabitItem[];
  onRefresh: () => void;
}

export function HabitsCard({ habits, onRefresh }: Props) {
  async function scoreHabit(id: string) {
    await apiFetch(`/habits/${id}/score`, {
      method: "POST",
      body: JSON.stringify({ direction: "up" }),
    });
    onRefresh();
  }

  return (
    <GlassCard>
      <CardHeader title="Habits" badge="Habitica" badgeColor="text-success" />
      <div className="flex flex-col gap-1">
        {habits.length === 0 && <p className="text-text-muted text-xs">Keine Habits konfiguriert</p>}
        {habits.map((habit) => (
          <div
            key={habit.id}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
              habit.isAntiHabit ? "hover:bg-danger/8" : "hover:bg-white/8"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-[14px] flex-shrink-0 ${
                habit.isAntiHabit ? "bg-danger/15" : habit.completed ? "bg-success/15" : "bg-white/10"
              }`}
            >
              {habit.isAntiHabit ? "🚫" : habit.completed ? "✓" : "💪"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{habit.text}</div>
              <div className={`text-xs mt-0.5 font-medium ${habit.isAntiHabit ? "text-danger" : habit.streak > 0 ? "text-success" : "text-white/40"}`}>
                {habit.isAntiHabit
                  ? `Anti-Habit · ${habit.completed ? "Geschafft" : "Noch offen"}`
                  : habit.streak > 0
                  ? `🔥 ${habit.streak} Tage`
                  : "Streak: 0"}
              </div>
            </div>
            {habit.completed ? (
              <span className="text-success text-sm">✓</span>
            ) : (
              <button
                onClick={() => scoreHabit(habit.id)}
                className="w-[18px] h-[18px] rounded border-[1.5px] border-slate-600 hover:border-accent transition-colors"
              />
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
