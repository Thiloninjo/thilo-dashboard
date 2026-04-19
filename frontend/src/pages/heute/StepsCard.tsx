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
    const fetchSteps = () =>
      apiFetch<{ data: HealthData }>("/health-data")
        .then((r) => setSteps(r.data.steps))
        .catch(() => {});
    fetchSteps();
    const interval = setInterval(fetchSteps, 10_000);
    return () => clearInterval(interval);
  }, []);

  const goal = 7000;
  const walkInterval = 1500; // ~1 Spaziergang
  const progress = Math.min(100, Math.round((steps / goal) * 100));
  const walks = Math.floor(steps / walkInterval);
  const walkMarkers = Array.from({ length: Math.floor(goal / walkInterval) }, (_, i) => ((i + 1) * walkInterval / goal) * 100);

  return (
    <GlassCard>
      <CardHeader title="Schritte heute" />
      <div className="flex items-center gap-4">
        <div className="text-3xl font-extrabold text-white" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
          {steps.toLocaleString("de-DE")}
        </div>
        <div className="text-xs text-white/40 font-medium">/ {goal.toLocaleString("de-DE")}</div>
        <div className="text-xs text-white/30 font-medium ml-auto">
          {walks > 0 ? `${walks}× 🚶` : ""}
        </div>
      </div>
      <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: progress >= 100
              ? "linear-gradient(90deg, #30D158, #5AE882)"
              : "linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.7))",
          }}
        />
        {walkMarkers.map((pos, i) => (
          <div
            key={i}
            className="absolute top-0 h-full"
            style={{
              left: `${pos}%`,
              width: "1.5px",
              background: pos <= progress ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
      <div className="text-[10px] text-white/40 mt-1.5 font-medium">{progress}% · {walks} von 3 Spaziergängen</div>
    </GlassCard>
  );
}
