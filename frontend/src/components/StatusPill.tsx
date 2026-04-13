export function StatusPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-sm ${
        active
          ? "bg-white/15 border-white/25 text-white"
          : "bg-white/5 border-white/10 text-white/60"
      }`}
    >
      {label}
    </span>
  );
}
