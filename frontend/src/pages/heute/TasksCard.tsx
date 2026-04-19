import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard, CardHeader } from "../../components/GlassCard";
import { Checkbox } from "../../components/Checkbox";
import { ProgressBar } from "../../components/ProgressBar";
import { apiFetch } from "../../lib/api";
import type { Task } from "../../lib/types";

interface Props {
  vaultTasks: Task[];
  todoistTasks: Task[];
  onRefresh: () => void;
  onOpenBoard?: () => void;
}

function getTaskDate(task: Task): string | undefined {
  return task.dueDate;
}

function getTaskTime(task: Task): string | undefined {
  if (task.source === "todoist" && (task as any).dueTime) {
    const dt = (task as any).dueTime as string;
    if (dt.includes("T")) {
      return new Date(dt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    }
  }
  return undefined;
}

function localToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}

function isOverdue(task: Task): boolean {
  const date = getTaskDate(task);
  if (!date || task.completed) return false;
  return date < localToday();
}

function formatDueLabel(task: Task): string {
  const date = getTaskDate(task);
  if (!date) return "";
  const today = localToday();
  const time = getTaskTime(task);

  if (date === today) {
    return time ? `Heute, ${time}` : "Heute";
  }

  const d = new Date(date + "T00:00:00");
  const daysDiff = Math.floor((new Date(today + "T00:00:00").getTime() - d.getTime()) / 86400000);

  if (daysDiff === 1) return time ? `Gestern, ${time}` : "Gestern";

  const formatted = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return time ? `${formatted}, ${time}` : formatted;
}

export function TasksCard({ vaultTasks, todoistTasks, onRefresh, onOpenBoard }: Props) {
  const allTasks = [...vaultTasks, ...todoistTasks];

  // Track every task ID we've ever seen this session
  const seenIds = useRef(new Set<string>());
  // Track tasks checked off this session
  const [checkedOff, setCheckedOff] = useState<Set<string>>(new Set());

  // Register all current tasks
  allTasks.forEach((t) => seenIds.current.add(`${t.source}-${t.id}`));

  // Total = all unique IDs ever seen. Only grows.
  const total = seenIds.current.size;
  // Completed = how many we checked off. Only grows.
  const completed = checkedOff.size;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Visible = from API, minus the ones we already checked off
  const visibleTasks = allTasks.filter((t) => !checkedOff.has(`${t.source}-${t.id}`));

  async function checkOff(task: Task) {
    const key = `${task.source}-${task.id}`;
    // Optimistic: immediately mark as checked off (visually disappears)
    setCheckedOff((prev) => new Set(prev).add(key));

    // Virtual tasks (dreh-vorabend, dreh-morgen) — just hide locally, no API call
    if (task.id.startsWith("dreh-")) return;

    // Then sync to backend
    try {
      if (task.source === "vault") {
        await apiFetch(`/tasks/${task.id}`, { method: "PATCH" });
      } else {
        await apiFetch(`/tasks/todoist/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed: true }),
        });
      }
    } catch {
      // Revert on error
      setCheckedOff((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    // Refresh after a short delay so the server state catches up
    setTimeout(onRefresh, 1000);
  }

  const overdueTasks = visibleTasks.filter((t) => isOverdue(t) && !t.completed);
  const todayTasks = visibleTasks.filter((t) => !isOverdue(t) && !t.completed);

  const [overdueOpen, setOverdueOpen] = useState(false);

  function TaskRow({ task }: { task: Task }) {
    const overdue = isOverdue(task);
    const dueLabel = formatDueLabel(task);

    return (
      <motion.div
        layout
        initial={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, overflow: "hidden" }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex items-center gap-2.5 py-2.5 px-3 rounded-2xl hover:bg-white/12 transition-colors cursor-pointer"
        style={{
          background: overdue ? "rgba(180,40,30,0.35)" : "rgba(255,255,255,0.06)",
          border: overdue ? "1px solid rgba(255,100,90,0.4)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: overdue
            ? "0 4px 12px rgba(200,50,40,0.25), inset 0 1px 0 rgba(255,255,255,0.08)"
            : "0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
          marginBottom: "4px",
        }}
      >
        <Checkbox
          checked={false}
          onChange={() => checkOff(task)}
        />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-bold block ${overdue ? "text-white" : "text-white"}`}>
            {task.source === "vault" ? (task as any).description : (task as any).content}
          </span>
          {dueLabel && (
            <span className={`text-xs mt-0.5 block font-semibold ${overdue ? "text-red-300" : "text-white/50"}`}>
              {overdue ? `⚠ ${dueLabel}` : dueLabel}
            </span>
          )}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/8 text-white/40 font-semibold flex-shrink-0">
          {task.source === "vault" ? "Vault" : "Todoist"}
        </span>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard glow>
        <div className="flex items-center justify-between">
          <CardHeader title="Tasks heute" />
          {onOpenBoard && (
            <button
              onClick={onOpenBoard}
              className="text-[11px] font-semibold text-white/40 hover:text-white/70 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/8"
            >
              Alle →
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <motion.span
              key={completed}
              initial={{ scale: 1.3, color: "#7DFFAA" }}
              animate={{ scale: 1, color: "#FFFFFF" }}
              transition={{ duration: 0.3 }}
              className="text-[28px] font-extrabold text-white"
            >
              {completed}
            </motion.span>
            <span className="text-base text-text-muted">/</span>
            <span className="text-lg font-semibold text-text-muted">{total}</span>
          </div>
          <span className="text-xs text-white/40 font-medium">erledigt</span>
        </div>
        <div className="mt-3">
          <ProgressBar progress={progress} />
        </div>
      </GlassCard>

      <GlassCard className="!h-[350px] !p-0">
        <div className="overflow-y-auto p-5 h-full" style={{ scrollbarWidth: "none" }}>
        {/* Overdue: collapsible section */}
        {overdueTasks.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setOverdueOpen(!overdueOpen)}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl hover:bg-red-500/20 transition-colors"
              style={{
                background: "rgba(239,68,58,0.12)",
                border: "1px solid rgba(239,68,58,0.25)",
                boxShadow: "0 2px 8px rgba(239,68,58,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <motion.span
                animate={{ rotate: overdueOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-white"
              >
                ▶
              </motion.span>
              <span className="text-sm font-bold text-white">⚠ Überfällig</span>
              <span className="text-xs text-red-300 font-semibold ml-auto">{overdueTasks.length} Tasks</span>
            </button>
            <AnimatePresence>
              {overdueOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex flex-col gap-1">
                    <AnimatePresence mode="popLayout">
                      {overdueTasks.map((task) => (
                        <TaskRow key={`${task.source}-${task.id}`} task={task} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Today's tasks */}
        <AnimatePresence mode="popLayout">
          {todayTasks.map((task) => (
            <TaskRow key={`${task.source}-${task.id}`} task={task} />
          ))}
        </AnimatePresence>

        {visibleTasks.length === 0 && overdueTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 py-12">
            <p className="text-white/30 text-sm font-medium">Keine Aufgaben für heute</p>
          </div>
        )}
        </div>
      </GlassCard>
    </div>
  );
}
