import { GlassCard } from "../../components/GlassCard";

export function ProfileCard() {
  return (
    <GlassCard className="text-center relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-white/10 to-white/5 rounded-t-3xl" />
      <div className="relative">
        <div className="w-[72px] h-[72px] rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-[28px] font-bold mx-auto mt-4 mb-3 border border-white/20">
          T
        </div>
        <div className="text-base font-bold text-white">Thilo Strübing</div>
        <div className="text-[11px] text-white/50 mt-0.5">Video-Editor & Videograf</div>
      </div>
    </GlassCard>
  );
}
