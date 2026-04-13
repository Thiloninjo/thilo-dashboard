export function StatusPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
        active
          ? "bg-accent/12 border-accent/25 text-accent-light"
          : "bg-white/4 border-white/8 text-text-secondary"
      }`}
    >
      {label}
    </span>
  );
}
