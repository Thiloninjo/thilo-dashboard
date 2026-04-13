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
      <CardHeader title="Termine heute" badge="Google Calendar" badgeColor="text-accent" />
      <div className="flex flex-col gap-2">
        {events.length === 0 && <p className="text-text-muted text-xs">Keine Termine heute</p>}
        {events.map((event) => (
          <div
            key={event.id}
            className={`flex items-start gap-3 p-3 rounded-xl border-l-[3px] ${
              isNext(event) ? "bg-accent/6 border-l-accent" : "bg-white/[0.015] border-l-slate-800"
            }`}
          >
            <span className={`text-xs font-semibold min-w-[44px] ${isNext(event) ? "text-accent-light" : "text-text-secondary"}`}>
              {event.isAllDay ? "Ganztag" : formatTime(event.start)}
            </span>
            <div>
              <div className="text-xs font-medium">{event.summary}</div>
              {event.location && <div className="text-[10px] text-text-muted mt-0.5">{event.location}</div>}
              {event.meetLink && <div className="text-[10px] text-text-muted mt-0.5">Remote</div>}
              {event.sopMatch && (
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-warning/10 border border-warning/20 rounded text-[9px] text-warning font-semibold">
                  SOP Briefing verfügbar
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
