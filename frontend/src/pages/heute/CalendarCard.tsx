import { GlassCard, CardHeader } from "../../components/GlassCard";
import type { CalendarEvent } from "../../lib/types";

export function CalendarCard({ events }: { events: CalendarEvent[] }) {
  const now = new Date();

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  function isNext(event: CalendarEvent): boolean {
    return new Date(event.start) > now && events.indexOf(event) === events.findIndex((e) => new Date(e.start) > now);
  }

  return (
    <GlassCard>
      <CardHeader title="Termine heute" />
      <div className="flex flex-col gap-2">
        {events.length === 0 && <p className="text-white/40 text-sm font-medium">Keine Termine heute</p>}
        {events.map((event) => (
          <div
            key={event.id}
            className={`flex items-start gap-3 p-3 rounded-2xl border-l-[3px] ${
              isNext(event) ? "border-l-white/80" : "border-l-white/30"
            }`}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderLeftWidth: "3px",
              borderLeftColor: isNext(event) ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <span className={`text-sm font-bold min-w-[44px] ${isNext(event) ? "text-accent-light" : "text-white/70"}`}>
              {event.isAllDay ? "Ganztag" : formatTime(event.start)}
            </span>
            <div>
              <div className="text-sm font-semibold text-white">{event.summary}</div>
              {event.location && <div className="text-xs text-white/50 mt-0.5 font-medium">{event.location}</div>}
              {event.meetLink && <div className="text-xs text-white/50 mt-0.5 font-medium">Remote</div>}
              {event.sopMatch && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-warning/15 border border-warning/25 rounded-lg text-[10px] text-warning font-bold">
                  SOP Briefing
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
