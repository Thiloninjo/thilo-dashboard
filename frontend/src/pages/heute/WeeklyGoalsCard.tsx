import { GlassCard, CardHeader } from "../../components/GlassCard";
import { ProgressBar } from "../../components/ProgressBar";
import type { WeeklyGoals } from "../../lib/types";

export function WeeklyGoalsCard({ goals }: { goals: WeeklyGoals }) {
  function GoalSection({ title, items }: { title: string; items: { text: string; completed: boolean }[] }) {
    if (items.length === 0) return null;
    const done = items.filter((g) => g.completed).length;

    return (
      <div className="mb-4 last:mb-0">
        <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wide mb-2">
          {title} ({done}/{items.length})
        </div>
        <div className="flex flex-col gap-2.5">
          {items.map((goal, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <span className={`text-xs ${goal.completed ? "text-text-muted line-through" : ""}`}>
                  {goal.text}
                </span>
                <span className="text-[11px] text-text-secondary">
                  {goal.completed ? "✓" : ""}
                </span>
              </div>
              <ProgressBar
                progress={goal.completed ? 100 : 0}
                color={goal.completed ? "from-success to-success" : "from-accent to-purple-500"}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <GlassCard>
      <CardHeader title="Weekly Goals" badge={`KW ${goals.weekNumber}`} badgeColor="text-warning" />
      <GoalSection title="Team" items={goals.team} />
      <GoalSection title="Personal" items={goals.personal} />
      {goals.team.length === 0 && goals.personal.length === 0 && (
        <p className="text-text-muted text-xs">Keine Goals fuer diese Woche gesetzt</p>
      )}
    </GlassCard>
  );
}
