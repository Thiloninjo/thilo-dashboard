import { useState, useEffect } from "react";
import { StatusPill } from "../../components/StatusPill";

interface Props {
  eventCount: number;
  taskCount: number;
  habitStreak: number;
  habitsToday: number;
  weekCompletion: number;
  weekNumber: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

function formatDate(): string {
  return new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function useCurrentTime(): string {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
    }, 10_000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

export function KpiHeader({ eventCount, taskCount, habitStreak, habitsToday, weekCompletion, weekNumber }: Props) {
  const currentTime = useCurrentTime();

  return (
    <div className="flex justify-between items-start mb-6" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
      <div>
        <div className="text-[56px] font-extrabold tracking-tighter leading-none text-white mb-1">{currentTime}</div>
        <h1 className="text-[28px] font-bold tracking-tight text-white">{getGreeting()}, Thilo</h1>
        <p className="text-white/50 text-[13px] mt-1.5 font-medium">{formatDate()}</p>
        <div className="flex gap-2 mt-3">
          <StatusPill label={`${eventCount} Termine`} active />
          <StatusPill label={`${taskCount} Tasks`} active />
          <StatusPill label={`KW ${weekNumber}`} />
        </div>
      </div>
      <div className="flex gap-7 items-end">
        <div className="text-right">
          <div className="text-[42px] font-extrabold tracking-tighter leading-none text-accent-light">{habitStreak}</div>
          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1 font-semibold">Tage Streak</div>
        </div>
        <div className="text-right">
          <div className="text-[42px] font-extrabold tracking-tighter leading-none text-success">{habitsToday}</div>
          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1 font-semibold">Habits heute</div>
        </div>
        <div className="text-right">
          <div className="text-[42px] font-extrabold tracking-tighter leading-none text-warning">{weekCompletion}%</div>
          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1 font-semibold">Woche</div>
        </div>
      </div>
    </div>
  );
}
