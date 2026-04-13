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

function isOverdue(task: Task): boolean {
  const date = getTaskDate(task);
  if (!date || task.completed) return false;
  const today = new Date().toISOString().slice(0, 10);
  return date < today;
}

function formatDueLabel(task: Task): string {
  const date = getTaskDate(task);
  if (!date) return "";
  const today = new Date().toISOString().slice(0, 10);
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

export function TasksCard({ vaultTasks, todoistTasks, onRefresh }: Props) {
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
        className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer ${
          overdue ? "bg-danger/5" : ""
        }`}
      >
        <Checkbox
          checked={false}
          onChange={() => checkOff(task)}
        />
        <div className="flex-1 min-w-0">
          <span className={`text-xs block ${overdue ? "text-danger" : ""}`}>
            {task.source === "vault" ? (task as any).description : (task as any).content}
          </span>
          {dueLabel && (
            <span className={`text-[10px] mt-0.5 block ${overdue ? "text-danger/80" : "text-text-muted"}`}>
              {dueLabel}
            </span>
          )}
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-raised text-text-muted flex-shrink-0">
          {task.source === "vault" ? "Vault" : "Todoist"}
        </span>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard glow>
        <CardHeader title="Tasks heute" />
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <motion.span
              key={completed}
              initial={{ scale: 1.3, color: "#10b981" }}
              animate={{ scale: 1, color: "#a5b4fc" }}
              transition={{ duration: 0.3 }}
              className="text-[28px] font-extrabold text-accent-light"
            >
              {completed}
            </motion.span>
            <span className="text-base text-text-muted">/</span>
            <span className="text-lg font-semibold text-text-muted">{total}</span>
          </div>
          <span className="text-[10px] text-text-muted">erledigt</span>
        </div>
        <div className="mt-3">
          <ProgressBar progress={progress} />
        </div>
      </GlassCard>

      <GlassCard className="flex-1">
        {/* Overdue: collapsible section */}
        {overdueTasks.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setOverdueOpen(!overdueOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-danger/8 border border-danger/15 hover:bg-danger/12 transition-colors"
            >
              <motion.span
                animate={{ rotate: overdueOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[10px] text-danger"
              >
                ▶
              </motion.span>
              <span className="text-xs font-semibold text-danger">Überfällig</span>
              <span className="text-[10px] text-danger/70 ml-auto">{overdueTasks.length} Tasks</span>
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
                  <div className="mt-1">
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

        {visibleTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center py-6"
          >
            <span className="text-2xl mb-2">🎉</span>
            <p className="text-text-muted text-xs">Alles erledigt!</p>
          </motion.div>
        )}
      </GlassCard>
    </div>
  );
}
