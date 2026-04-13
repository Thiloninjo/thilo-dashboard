import { useState, useEffect } from "react";
import { GlassCard, CardHeader } from "../../components/GlassCard";
import { apiFetch } from "../../lib/api";

interface HealthData {
  steps: number;
  lastUpdated: string;
}

export function StepsCard() {
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    const fetch = () =>
      apiFetch<{ data: HealthData }>("/health-data")
        .then((r) => setSteps(r.data.steps))
        .catch(() => {});
    fetch();
    const interval = setInterval(fetch, 5_000);
    return () => clearInterval(interval);
  }, []);

  const goal = 10000;
  const progress = Math.min(100, Math.round((steps / goal) * 100));

  return (
    <GlassCard>
      <CardHeader title="Schritte heute" />
      <div className="flex items-center gap-4">
        <div className="text-3xl font-extrabold text-white" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
          {steps.toLocaleString("de-DE")}
        </div>
        <div className="text-xs text-white/40 font-medium">/ {goal.toLocaleString("de-DE")}</div>
      </div>
      <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: progress >= 100
              ? "linear-gradient(90deg, #30D158, #5AE882)"
              : "linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.7))",
          }}
        />
      </div>
      <div className="text-[10px] text-white/40 mt-1.5 font-medium">{progress}% vom Tagesziel</div>
    </GlassCard>
  );
}
