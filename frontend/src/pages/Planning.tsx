import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "../components/GlassCard";
import { apiFetch } from "../lib/api";
import type { CalendarEvent, Task, CachedResponse } from "../lib/types";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const HOUR_PX = 56;
const DAY_HOURS = 24;
const REPEATS = 3;
const ALL_HOURS = Array.from({ length: DAY_HOURS * REPEATS }, (_, i) => i % 24);

function getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

function formatTaskTitle(title: string): string {
  return title.replace(/(\d+)[,.](\d+)\s*Stunden/gi, (_, w, d) => {
    const t = parseFloat(`${w}.${d}`);
    const r = Math.round(t * 2) / 2;
    return r === Math.floor(r) ? `~${r} Stunden` : `~${Math.floor(r)},5 Stunden`;
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatHour(h: number, m: number = 0): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Convert a Y position in the timeline to an hour (snapped to 15-min intervals)
function yToHour(y: number, blockOffset: number): { hour: number; minutes: number } {
  const rawHour = (y - blockOffset) / HOUR_PX;
  const totalMinutes = Math.round(rawHour * 4) * 15; // snap to 15 min
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return { hour, minutes };
}

export function Planning() {
  const [selectedDate, setSelectedDate] = useState(getLocalToday);
  const [viewMonth, setViewMonth] = useState(getLocalToday);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const dateStr = getDateStr(selectedDate);
  const today = getDateStr(getLocalToday());

  // Drag state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragPreview, setDragPreview] = useState<{ top: number; hour: number; minutes: number } | null>(null);
  const [dragCreating, setDragCreating] = useState<{ startY: number; currentY: number; hour: number; minutes: number } | null>(null);
  const [dragEventBack, setDragEventBack] = useState<CalendarEvent | null>(null);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isSnapping = useRef(false);

  const ONE_DAY_PX = DAY_HOURS * HOUR_PX;
  const MIDDLE_BLOCK_START = ONE_DAY_PX;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    el.scrollTop = MIDDLE_BLOCK_START + hour * HOUR_PX - 100;
  }, [dateStr]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isSnapping.current) return;
    const top = el.scrollTop;
    if (top < ONE_DAY_PX * 0.3) {
      isSnapping.current = true;
      el.scrollTop = top + ONE_DAY_PX;
      requestAnimationFrame(() => { isSnapping.current = false; });
    } else if (top > ONE_DAY_PX * 1.7) {
      isSnapping.current = true;
      el.scrollTop = top - ONE_DAY_PX;
      requestAnimationFrame(() => { isSnapping.current = false; });
    }
  }, []);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    setEvents([]);
    setTasks([]);
    apiFetch<CachedResponse<CalendarEvent[]>>(`/calendar/date/${dateStr}`)
      .then((r) => { if (!cancelled) setEvents(r.data); }).catch(() => {});
    apiFetch<CachedResponse<Task[]>>(`/tasks/todoist/date/${dateStr}`)
      .then((r) => { if (!cancelled) setTasks(r.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [dateStr]);

  async function refreshData() {
    const [cal, tsk] = await Promise.all([
      apiFetch<CachedResponse<CalendarEvent[]>>(`/calendar/date/${dateStr}`).catch(() => null),
      apiFetch<CachedResponse<Task[]>>(`/tasks/todoist/date/${dateStr}`).catch(() => null),
    ]);
    if (cal) setEvents(cal.data);
    if (tsk) setTasks(tsk.data);
  }

  // ── Drag: Task → Calendar ──

  function handleTaskDragStart(e: React.DragEvent, task: Task) {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "task");
  }

  function calcHourFromDrag(e: React.DragEvent): { hour: number; minutes: number; snapY: number } | null {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return null;
    const scrollRect = scrollEl.getBoundingClientRect();
    const y = e.clientY - scrollRect.top + scrollEl.scrollTop;
    const yInBlock = ((y % ONE_DAY_PX) + ONE_DAY_PX) % ONE_DAY_PX;
    const totalMinutes = Math.round((yInBlock / HOUR_PX) * 4) * 15;
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const snapY = MIDDLE_BLOCK_START + (hour * 60 + minutes) / 60 * HOUR_PX;
    return { hour, minutes, snapY };
  }

  function handleTimelineDragOver(e: React.DragEvent) {
    if (!draggedTask && !dragEventBack) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const pos = calcHourFromDrag(e);
    if (!pos) return;
    setDragPreview({ top: pos.snapY, hour: pos.hour, minutes: pos.minutes });
  }

  function handleTimelineDragLeave() {
    setDragPreview(null);
  }

  async function handleTimelineDrop(e: React.DragEvent) {
    e.preventDefault();

    // Event being moved within timeline
    if (dragEventBack && dragPreview) {
      const event = dragEventBack;
      const { hour, minutes } = dragPreview;
      setDragEventBack(null);
      setDragPreview(null);

      // Calculate duration from original event
      const origStart = new Date(event.start);
      const origEnd = new Date(event.end);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const durationMin = durationMs / 60000;

      const newStartISO = `${dateStr}T${formatHour(hour, minutes)}:00`;
      const endTotalMin = hour * 60 + minutes + durationMin;
      const endH = Math.floor(endTotalMin / 60) % 24;
      const endM = Math.round(endTotalMin % 60);
      const newEndISO = `${dateStr}T${formatHour(endH, endM)}:00`;

      // Optimistic update
      setEvents(prev => prev.map(ev =>
        ev.id === event.id ? { ...ev, start: newStartISO, end: newEndISO } : ev
      ));

      // API call
      try {
        await apiFetch(`/calendar/update-event/${event.id}`, {
          method: "PATCH",
          body: JSON.stringify({ start: newStartISO, end: newEndISO }),
        });
        refreshData();
      } catch (err) {
        console.error("Failed to move event:", err);
        refreshData();
      }
      return;
    }

    if (!draggedTask || !dragPreview) { setDraggedTask(null); setDragPreview(null); return; }

    const task = draggedTask;
    const { hour, minutes } = dragPreview;
    setDraggedTask(null);
    setDragPreview(null);

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const scrollRect = scrollEl.getBoundingClientRect();
    const startY = MIDDLE_BLOCK_START + (hour * 60 + minutes) / 60 * HOUR_PX;
    setDragCreating({ startY, currentY: startY + HOUR_PX, hour, minutes });

    function onMouseMove(ev: MouseEvent) {
      const cy = ev.clientY - scrollRect.top + (scrollRef.current?.scrollTop || 0);
      setDragCreating(prev => prev ? { ...prev, currentY: Math.max(cy, prev.startY + HOUR_PX / 4) } : null);
    }
    async function onMouseUp(ev: MouseEvent) {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      const cy = ev.clientY - scrollRect.top + (scrollRef.current?.scrollTop || 0);
      const durationHours = Math.max(Math.round((cy - startY) / HOUR_PX * 4) / 4, 0.5); // min 30 min
      const endTotalMin = (hour * 60 + minutes) + durationHours * 60;
      const endHour = Math.floor(endTotalMin / 60) % 24;
      const endMin = Math.round(endTotalMin % 60);

      const title = task.content || task.description || "Aufgabe";
      const startISO = `${dateStr}T${formatHour(hour, minutes)}:00`;
      const endISO = `${dateStr}T${formatHour(endHour, endMin)}:00`;

      // Optimistic update — show event immediately
      const tempEvent: CalendarEvent = {
        id: "temp-" + Date.now(),
        summary: title,
        start: startISO,
        end: endISO,
        isAllDay: false,
      };
      setEvents(prev => [...prev, tempEvent]);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      setDragCreating(null);

      // API calls in background
      try {
        await apiFetch("/calendar/create-event", {
          method: "POST",
          body: JSON.stringify({ summary: title, start: startISO, end: endISO }),
        });
        if (task.source === "todoist") {
          await apiFetch(`/tasks/todoist/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: true }) });
        }
        refreshData();
      } catch (err) {
        console.error("Failed to create event:", err);
        refreshData(); // revert on error
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // ── Drag: Calendar Event → Tasks ──

  function handleEventDragStart(e: React.DragEvent, event: CalendarEvent) {
    setDragEventBack(event);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "event");
  }

  function handleTaskPanelDragOver(e: React.DragEvent) {
    if (!dragEventBack) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleTaskPanelDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!dragEventBack) return;
    const event = dragEventBack;
    setDragEventBack(null);

    // Optimistic update
    setEvents(prev => prev.filter(e => e.id !== event.id));
    setTasks(prev => [...prev, { id: "temp-" + Date.now(), content: event.summary, completed: false, dueDate: dateStr, source: "todoist" } as Task]);

    try {
      await apiFetch("/calendar/create-todoist-task", {
        method: "POST",
        body: JSON.stringify({ content: event.summary, due_date: dateStr }),
      });
      await apiFetch(`/calendar/delete-event/${event.id}`, { method: "DELETE" });
      refreshData();
    } catch (err) {
      console.error("Failed to move event to tasks:", err);
      refreshData();
    }
  }

  // Calendar
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  function selectDay(day: number) { setSelectedDate(new Date(year, month, day, 12, 0, 0)); }
  const isSelectedDay = (day: number) => getDateStr(new Date(year, month, day)) === dateStr;
  const isDayToday = (day: number) => getDateStr(new Date(year, month, day)) === today;

  const allDayEvents = events.filter(e => e.isAllDay);
  const timedEvents = events.filter(e => !e.isAllDay);
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const showNowLine = dateStr === today;

  function getEventPositions(event: CalendarEvent): { top: number; height: number }[] {
    if (event.isAllDay) return [];
    const s = new Date(event.start), en = new Date(event.end);
    const sh = s.getHours() + s.getMinutes() / 60;
    const eh = en.getHours() + en.getMinutes() / 60;
    const dur = eh > sh ? eh - sh : eh + 24 - sh;
    const h = Math.max(dur * HOUR_PX, 28);
    return Array.from({ length: REPEATS }, (_, r) => ({ top: (r * DAY_HOURS + sh) * HOUR_PX, height: h }));
  }

  function scrollToNow() {
    const el = scrollRef.current;
    if (!el) return;
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    el.scrollTo({ top: MIDDLE_BLOCK_START + h * HOUR_PX - 100, behavior: "smooth" });
  }

  return (
    <div className="flex gap-5 h-full">
      {/* Left: Day View */}
      <div className="flex-1 flex flex-col min-w-0">
        <h2 className="text-2xl font-bold mb-1 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
          {selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-white/40 text-sm font-medium">{events.length} Termine · {tasks.length} Tasks</p>
          {showNowLine && (
            <button onClick={scrollToNow} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,59,48,0.12)", border: "1px solid rgba(255,59,48,0.25)", color: "rgba(255,120,110,0.9)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Jetzt
            </button>
          )}
        </div>

        {allDayEvents.length > 0 && (
          <div className="flex gap-2 mb-3">
            {allDayEvents.map(e => (
              <div key={e.id} className="px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white"
                style={{ background: "rgba(0,122,255,0.2)", border: "1px solid rgba(0,122,255,0.3)" }}>{e.summary}</div>
            ))}
          </div>
        )}

        {/* Timeline */}
        <GlassCard className="!p-0 !overflow-hidden" style={{ maxHeight: "calc(100vh - 260px)" }}>
          <div ref={scrollRef} onScroll={handleScroll} className="overflow-y-auto h-full" style={{ scrollbarWidth: "none" }}>
            <div
              ref={timelineRef}
              className="relative"
              style={{ height: `${DAY_HOURS * REPEATS * HOUR_PX}px` }}
              onDragOver={handleTimelineDragOver}
              onDragLeave={handleTimelineDragLeave}
              onDrop={handleTimelineDrop}
            >
              {/* Hour lines */}
              {ALL_HOURS.map((hour, idx) => (
                <div key={idx} className="absolute left-0 right-0 flex items-start" style={{ top: `${idx * HOUR_PX}px` }}>
                  <span className="text-[11px] text-white/25 font-mono w-[50px] text-right pr-3 -mt-[7px] flex-shrink-0">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                  <div className="flex-1 border-t border-white/5" />
                </div>
              ))}

              {/* Now indicator */}
              {showNowLine && Array.from({ length: REPEATS }, (_, r) => (
                <div key={`now-${r}`} className="absolute left-[50px] right-0 z-10 flex items-center"
                  style={{ top: `${(r * DAY_HOURS + currentHour) * HOUR_PX}px` }}>
                  <div className="w-2 h-2 rounded-full bg-red-400" style={{ marginLeft: "-4px" }} />
                  <div className="flex-1 border-t-2 border-red-400/60" />
                </div>
              ))}

              {/* Drag preview */}
              {dragPreview && (
                <div className="absolute rounded-xl pointer-events-none z-20" style={{
                  top: `${dragPreview.top}px`, height: `${HOUR_PX}px`, left: "58px", right: "12px",
                  background: "rgba(48,209,88,0.15)", border: "2px dashed rgba(48,209,88,0.5)", borderLeft: "3px solid rgba(48,209,88,0.7)",
                }}>
                  <div className="px-3 py-2">
                    <div className="text-[12px] font-bold text-success/80">{draggedTask?.content || draggedTask?.description}</div>
                    <div className="text-[10px] text-success/50">{formatHour(dragPreview.hour, dragPreview.minutes)} – {formatHour((dragPreview.hour + 1) % 24, dragPreview.minutes)}</div>
                  </div>
                </div>
              )}

              {/* Drag-creating event (resizable) */}
              {dragCreating && (
                <div className="absolute rounded-xl pointer-events-none z-20" style={{
                  top: `${dragCreating.startY}px`,
                  height: `${Math.max(dragCreating.currentY - dragCreating.startY, HOUR_PX / 4)}px`,
                  left: "58px", right: "12px",
                  background: "rgba(48,209,88,0.2)", border: "2px solid rgba(48,209,88,0.5)", borderLeft: "3px solid rgba(48,209,88,0.8)",
                }}>
                  <div className="px-3 py-2">
                    <div className="text-[12px] font-bold text-success">Loslassen zum Erstellen</div>
                    <div className="text-[10px] text-success/60">Ziehe nach unten für längere Dauer</div>
                  </div>
                </div>
              )}

              {/* Events */}
              {timedEvents.map(event => {
                const positions = getEventPositions(event);
                return positions.map((pos, r) => (
                  <div
                    key={`${event.id}-${r}`}
                    draggable
                    onDragStart={(e) => handleEventDragStart(e, event)}
                    className="absolute rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
                    style={{
                      top: `${pos.top}px`, height: `${pos.height}px`, left: "58px", right: "12px",
                      background: "rgba(0,122,255,0.12)", border: "1px solid rgba(0,122,255,0.25)", borderLeft: "3px solid rgba(0,122,255,0.6)",
                    }}
                  >
                    <div className="px-3 py-2 h-full flex flex-col justify-center">
                      <div className="text-[13px] font-bold text-white leading-tight">{event.summary}</div>
                      <div className="text-[11px] text-white/40 font-medium mt-0.5">{formatTime(event.start)} – {formatTime(event.end)}</div>
                      {event.location && <div className="text-[10px] text-white/30 mt-0.5">{event.location}</div>}
                    </div>
                  </div>
                ));
              })}

              {events.length === 0 && !dragPreview && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-white/15 text-sm font-medium">Keine Termine</p>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Right: Mini Calendar + Tasks */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold">←</button>
            <span className="text-white font-bold text-[13px]">{MONTHS[month]} {year}</span>
            <button onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
              <div key={d} className="text-center text-[9px] text-white/30 font-bold uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const sel = isSelectedDay(day);
              const tod = isDayToday(day);
              const past = new Date(year, month, day) < getLocalToday() && !tod;
              return (
                <button key={day} onClick={() => selectDay(day)}
                  className="relative flex items-center justify-center transition-all"
                  style={{
                    width: "28px", height: "28px", borderRadius: "50%", margin: "0 auto", fontSize: "11px",
                    fontWeight: sel || tod ? 700 : 500,
                    color: sel ? "#fff" : past ? "rgba(255,255,255,0.2)" : tod ? "#fff" : "rgba(255,255,255,0.5)",
                    background: sel ? "rgba(0,122,255,0.4)" : tod ? "rgba(255,255,255,0.12)" : "transparent",
                    border: sel ? "1.5px solid rgba(0,122,255,0.6)" : tod ? "1.5px solid rgba(255,255,255,0.2)" : "1.5px solid transparent",
                    boxShadow: sel ? "0 0 10px rgba(0,122,255,0.3)" : "none",
                  }}>{day}</button>
              );
            })}
          </div>
        </GlassCard>

        {/* Tasks — drop zone for events */}
        <GlassCard
          className={`!p-0 flex-1 !overflow-hidden transition-all ${dragEventBack ? "ring-2 ring-accent/50" : ""}`}
          onDragOver={handleTaskPanelDragOver}
          onDrop={handleTaskPanelDrop}
        >
          <div className="p-4 pb-2 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white/30 font-bold">Tasks</span>
            {dragEventBack && <span className="text-[10px] text-accent font-semibold">Hier ablegen</span>}
          </div>
          <div className="px-4 pb-4 overflow-y-auto flex flex-col gap-1.5" style={{ maxHeight: "calc(100vh - 520px)", scrollbarWidth: "none" }}>
            {tasks.length === 0 && !dragEventBack && (
              <p className="text-white/20 text-[12px] font-medium py-3 text-center">Keine Tasks</p>
            )}
            {tasks.map((t: any) => (
              <div
                key={`${t.source}-${t.id}`}
                draggable
                onDragStart={(e) => handleTaskDragStart(e, t)}
                className="px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing hover:bg-white/8 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="text-[12px] font-semibold text-white/70">{formatTaskTitle(t.content || t.description || "")}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
