import { useState, useEffect } from "react";
import { GlassCard, CardHeader } from "../components/GlassCard";
import { apiFetch } from "../lib/api";
import type { CalendarEvent, Task, CachedResponse } from "../lib/types";

const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function getDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function Planning() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const dateStr = getDateStr(selectedDate);
  const today = getDateStr(new Date());

  // Fetch events + tasks for selected date
  useEffect(() => {
    apiFetch<CachedResponse<CalendarEvent[]>>(`/calendar/date/${dateStr}`)
      .then((r) => setEvents(r.data))
      .catch(() => setEvents([]));

    apiFetch<CachedResponse<Task[]>>(`/tasks/todoist`)
      .then((r) => {
        // Filter tasks for selected date
        const filtered = r.data.filter((t: any) => {
          const due = t.dueDate?.slice(0, 10);
          return due === dateStr || (!due && dateStr === today);
        });
        setTasks(filtered);
      })
      .catch(() => setTasks([]));
  }, [dateStr]);

  // Calendar grid
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // Adjust for Monday start (0=Mon ... 6=Sun)
  const startOffset = (firstDayOfWeek + 6) % 7;

  function prevMonth() {
    setViewMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewMonth(new Date(year, month + 1, 1));
  }

  function selectDay(day: number) {
    const date = new Date(year, month, day);
    setSelectedDate(date);
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  const isSelectedDay = (day: number) => getDateStr(new Date(year, month, day)) === dateStr;
  const isToday = (day: number) => getDateStr(new Date(year, month, day)) === today;

  return (
    <>
      <h2 className="text-2xl font-bold mb-2 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
        Planning
      </h2>
      <p className="text-white/50 text-sm mb-6 font-medium" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        {selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 350px" }}>
        {/* Calendar */}
        <GlassCard>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-white/60 hover:text-white text-lg font-bold px-2">←</button>
            <span className="text-white font-bold text-base">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="text-white/60 hover:text-white text-lg font-bold px-2">→</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
              <div key={d} className="text-center text-[10px] text-white/40 font-semibold uppercase">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelectedDay(day);
              const todayDay = isToday(day);

              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  className={`relative w-full aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    selected
                      ? "text-white"
                      : todayDay
                      ? "text-white/90"
                      : "text-white/60 hover:text-white hover:bg-white/8"
                  }`}
                  style={
                    selected
                      ? {
                          background: "rgba(255,255,255,0.2)",
                          border: "1px solid rgba(255,255,255,0.3)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                        }
                      : todayDay
                      ? {
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.15)",
                        }
                      : undefined
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Selected day details */}
        <div className="flex flex-col gap-4">
          {/* Events */}
          <GlassCard className="!p-0">
            <div className="p-5 pb-2">
              <CardHeader title="Termine" />
            </div>
            <div className="px-5 pb-5 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "250px", scrollbarWidth: "none" }}>
              {events.length === 0 && (
                <p className="text-white/30 text-sm font-medium py-4 text-center">Keine Termine</p>
              )}
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white/70 min-w-[44px]">
                      {event.isAllDay ? "Ganztag" : formatTime(event.start)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">{event.summary}</div>
                      {event.location && <div className="text-xs text-white/40 mt-0.5">{event.location}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Tasks for selected day */}
          <GlassCard className="!p-0">
            <div className="p-5 pb-2">
              <CardHeader title="Tasks" />
            </div>
            <div className="px-5 pb-5 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "250px", scrollbarWidth: "none" }}>
              {tasks.length === 0 && (
                <p className="text-white/30 text-sm font-medium py-4 text-center">Keine Tasks</p>
              )}
              {tasks.map((task: any) => (
                <div
                  key={`${task.source}-${task.id}`}
                  className="p-3 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <div className="text-sm font-semibold text-white">{task.content || task.description}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
