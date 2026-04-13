import { GlassCard } from "../../components/GlassCard";

export function ProfileCard({ topStreak }: { topStreak: { name: string; days: number } }) {
  return (
    <GlassCard className="text-center relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-accent/15 to-blue-500/10 rounded-t-2xl" />
      <div className="relative">
        <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center text-[28px] font-bold mx-auto mt-4 mb-3 border-[3px] border-surface">
          T
        </div>
        <div className="text-base font-bold">Thilo Strübing</div>
        <div className="text-[11px] text-text-muted mt-0.5">Video-Editor & Videograf</div>
        <div className="mt-4 p-2.5 bg-success/8 rounded-xl border border-success/12">
          <div className="text-[22px] font-extrabold text-success">🔥 {topStreak.days}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Tage {topStreak.name}-Streak</div>
        </div>
      </div>
    </GlassCard>
  );
}
