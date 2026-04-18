import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "./Checkbox";
import { apiFetch } from "../lib/api";
import type { Task } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  todoistTasks: Task[];
  asanaTasks: Task[];
  onCheckOff: (task: Task) => void;
}

interface TaskDetail {
  id: string;
  content: string;
  notes: string;
  dueDate: string | null;
  completed: boolean;
  source: string;
  project?: string;
  tags?: string[];
  createdAt?: string;
  modifiedAt?: string;
  permalink?: string;
  parent?: string;
  subtasks?: { id: string; name: string; completed: boolean }[];
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.completed) return false;
  return task.dueDate < (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })();
}

function sortByDue(a: Task, b: Task): number {
  const da = a.dueDate || "9999-99-99";
  const db = b.dueDate || "9999-99-99";
  return da.localeCompare(db);
}

function formatDate(date?: string): string {
  if (!date) return "Kein Datum";
  const today = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })();
  if (date === today) return "Heute";
  const d = new Date(date + "T00:00:00");
  const diff = Math.floor((new Date(today + "T00:00:00").getTime() - d.getTime()) / 86400000);
  if (diff === 1) return "Gestern";
  if (diff === -1) return "Morgen";
  if (diff > 1) return `Vor ${diff} Tagen`;
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function formatDateTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ── Task Detail Overlay ── */

function TaskDetailOverlay({ task, onClose }: { task: TaskDetail; onClose: () => void }) {
  const overdue = task.dueDate && !task.completed && task.dueDate < (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })();

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-col pointer-events-auto"
          style={{
            width: "min(520px, calc(100vw - 80px))",
            maxHeight: "calc(100vh - 120px)",
            borderRadius: "24px",
            background: "rgba(25,25,40,0.92)",
            backdropFilter: "blur(40px) saturate(180%) brightness(1.1)",
            WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(1.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5), inset 0 0 8px 1px rgba(255,255,255,0.1)",
          }}
        >
        {/* Header */}
        <div className="p-6 pb-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[18px] font-bold text-white leading-snug flex-1">{task.content}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <span className="text-white/50 text-sm">✕</span>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${overdue ? "bg-danger/20 text-red-300" : "bg-white/8 text-white/50"}`}>
              {overdue ? "⚠ " : ""}{formatDate(task.dueDate || undefined)}
            </span>
            {task.project && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-accent/15 text-accent-light">{task.project}</span>
            )}
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{
                background: task.source === "asana" ? "rgba(100,120,255,0.15)" : task.source === "todoist" ? "rgba(230,70,50,0.15)" : "rgba(255,255,255,0.08)",
                color: task.source === "asana" ? "rgba(160,170,255,0.9)" : task.source === "todoist" ? "rgba(255,150,140,0.9)" : "rgba(255,255,255,0.5)",
              }}
            >
              {task.source === "asana" ? "Asana" : task.source === "todoist" ? "Todoist" : "Vault"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: "none" }}>
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-4">
              {task.tags.map(tag => (
                <span key={tag} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/6 text-white/40 border border-white/8">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-2">Beschreibung</p>
            {task.notes ? (
              <div
                className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap rounded-xl p-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {task.notes}
              </div>
            ) : (
              <p className="text-[13px] text-white/20 italic">Keine Beschreibung</p>
            )}
          </div>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-2">Subtasks ({task.subtasks.length})</p>
              <div className="flex flex-col gap-1.5">
                {task.subtasks.map(sub => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className={`text-[12px] ${sub.completed ? "text-success" : "text-white/30"}`}>
                      {sub.completed ? "✓" : "○"}
                    </span>
                    <span className={`text-[12px] font-medium ${sub.completed ? "text-white/30 line-through" : "text-white/70"}`}>
                      {sub.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 pt-3 border-t border-white/5">
            {task.parent && (
              <div className="flex justify-between text-[11px]">
                <span className="text-white/25">Parent</span>
                <span className="text-white/50">{task.parent}</span>
              </div>
            )}
            {task.createdAt && (
              <div className="flex justify-between text-[11px]">
                <span className="text-white/25">Erstellt</span>
                <span className="text-white/50">{formatDateTime(task.createdAt)}</span>
              </div>
            )}
            {task.modifiedAt && (
              <div className="flex justify-between text-[11px]">
                <span className="text-white/25">Geändert</span>
                <span className="text-white/50">{formatDateTime(task.modifiedAt)}</span>
              </div>
            )}
          </div>

          {/* Open in source */}
          {task.permalink && (
            <button
              onClick={() => window.open(task.permalink, "_blank", "noopener,noreferrer")}
              className="block w-full mt-4 text-center text-[12px] font-semibold py-2.5 rounded-xl transition-colors hover:bg-white/10 cursor-pointer"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(160,170,255,0.9)" }}
            >
              In Asana öffnen ↗
            </button>
          )}
        </div>
        </motion.div>
      </div>
    </>
  );
}

/* ── Task Row ── */

function TaskRow({ task, onCheckOff, onSelect }: { task: Task; onCheckOff: (t: Task) => void; onSelect: (t: Task) => void }) {
  const overdue = isOverdue(task);
  const label = task.content || task.description || "";
  const due = formatDate(task.dueDate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/8 cursor-pointer"
      style={{
        background: overdue ? "rgba(180,40,30,0.2)" : "rgba(255,255,255,0.04)",
        border: overdue ? "1px solid rgba(255,100,90,0.25)" : "1px solid rgba(255,255,255,0.06)",
        marginBottom: "6px",
      }}
      onClick={() => onSelect(task)}
    >
      <div onClick={e => e.stopPropagation()}>
        <Checkbox checked={task.completed} onChange={() => onCheckOff(task)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white leading-tight">{label}</div>
        <div className={`text-[11px] mt-1 font-medium ${overdue ? "text-red-300" : "text-white/40"}`}>
          {overdue ? `⚠ ${due}` : due}
        </div>
      </div>
      {task.priority && task.priority >= 3 && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-danger/20 text-red-300 font-bold">P{task.priority}</span>
      )}
      <span className="text-white/15 text-sm">›</span>
    </motion.div>
  );
}

/* ── Collapsible Column ── */

interface ColumnProps {
  title: string;
  icon: string;
  tasks: Task[];
  accentBg: string;
  accentBorder: string;
  onCheckOff: (t: Task) => void;
  onSelect: (t: Task) => void;
  emptyText: string;
  collapsible?: boolean;
}

function Column({ title, icon, tasks, accentBg, accentBorder, onCheckOff, onSelect, emptyText, collapsible }: ColumnProps) {
  const [collapsed, setCollapsed] = useState(false);
  const openTasks = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden flex-1 min-w-[280px] min-h-0"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        boxShadow: "inset 0 0 6px 1px rgba(255,255,255,0.06)",
      }}
    >
      {collapsible ? (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 px-5 py-4 w-full text-left transition-colors hover:brightness-110"
          style={{ background: accentBg, borderBottom: collapsed ? "none" : `1px solid ${accentBorder}` }}
        >
          <motion.span
            animate={{ rotate: collapsed ? -90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] text-white/40"
          >
            ▼
          </motion.span>
          <span className="text-base">{icon}</span>
          <span className="text-[14px] font-bold text-white">{title}</span>
          <span className="ml-auto text-[12px] font-semibold text-white/40">{openTasks.length}</span>
        </button>
      ) : (
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ background: accentBg, borderBottom: `1px solid ${accentBorder}` }}
        >
          <span className="text-base">{icon}</span>
          <span className="text-[14px] font-bold text-white">{title}</span>
          <span className="ml-auto text-[12px] font-semibold text-white/40">{openTasks.length}</span>
        </div>
      )}

      <AnimatePresence>
        {(!collapsible || !collapsed) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-3 pb-6 overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
              <AnimatePresence mode="popLayout">
                {openTasks.sort(sortByDue).map(task => (
                  <TaskRow key={`${task.source}-${task.id}`} task={task} onCheckOff={onCheckOff} onSelect={onSelect} />
                ))}
              </AnimatePresence>

              {openTasks.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-white/20 text-sm font-medium">{emptyText}</p>
                </div>
              )}

              {done.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-white/20 font-bold mb-2">Erledigt ({done.length})</p>
                  {done.slice(0, 3).map(task => (
                    <div key={`${task.source}-${task.id}`} className="text-[12px] text-white/20 line-through py-1 px-2">
                      {task.content || task.description}
                    </div>
                  ))}
                  {done.length > 3 && (
                    <p className="text-[11px] text-white/15 px-2">+{done.length - 3} weitere</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Board ── */

export function TaskBoard({ open, onClose, todoistTasks, asanaTasks, onCheckOff }: Props) {
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const allTasks = [...todoistTasks, ...asanaTasks];
  const overdueTasks = allTasks.filter(t => isOverdue(t));

  async function handleSelectTask(task: Task) {
    if (task.source === "asana") {
      setLoadingDetail(true);
      try {
        const res = await apiFetch<{ data: TaskDetail }>(`/asana/tasks/${task.id}`);
        setSelectedTask(res.data);
      } catch {
        setSelectedTask({
          id: String(task.id),
          content: task.content || task.description || "",
          notes: (task as any).notes || "",
          dueDate: task.dueDate || null,
          completed: task.completed,
          source: task.source,
          project: (task as any).project,
          tags: (task as any).tags,
          createdAt: (task as any).createdAt,
          modifiedAt: (task as any).modifiedAt,
          permalink: (task as any).permalink,
        });
      } finally {
        setLoadingDetail(false);
      }
    } else {
      setSelectedTask({
        id: String(task.id),
        content: task.content || task.description || "",
        notes: "",
        dueDate: task.dueDate || null,
        completed: task.completed,
        source: task.source,
      });
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}
            onClick={() => { onClose(); setSelectedTask(null); }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="rounded-3xl overflow-hidden flex flex-col"
            style={{
              position: "fixed",
              top: "24px",
              left: "24px",
              right: "24px",
              bottom: "24px",
              zIndex: 50,
              borderRadius: "28px",
              background: "rgba(20,20,30,0.88)",
              backdropFilter: "blur(40px) saturate(180%) brightness(1.1)",
              WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(1.1)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 32px 100px rgba(0,0,0,0.6), inset 0 0 8px 1px rgba(255,255,255,0.1)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/8">
              <div>
                <h2 className="text-[22px] font-bold text-white">Alle Aufgaben</h2>
                <p className="text-[13px] text-white/40 mt-0.5">
                  {allTasks.filter(t => !t.completed).length} offen · {allTasks.filter(t => t.completed).length} erledigt
                  {overdueTasks.length > 0 && <span className="text-red-300 ml-2">· {overdueTasks.length} überfällig</span>}
                </p>
              </div>
              <button
                onClick={() => { onClose(); setSelectedTask(null); }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <span className="text-white/60 text-lg">✕</span>
              </button>
            </div>

            {/* Board Columns */}
            <div className="flex-1 flex gap-4 p-6 overflow-x-auto overflow-y-hidden min-h-0" style={{ scrollbarWidth: "none" }}>
              {overdueTasks.length > 0 && (
                <Column
                  title="Überfällig"
                  icon="⚠️"
                  tasks={overdueTasks}
                  accentBg="rgba(239,68,58,0.08)"
                  accentBorder="rgba(239,68,58,0.15)"
                  onCheckOff={onCheckOff}
                  onSelect={handleSelectTask}
                  emptyText="Keine überfälligen Tasks"
                  collapsible
                />
              )}
              <Column
                title="Todoist"
                icon="✅"
                tasks={todoistTasks}
                accentBg="rgba(230,70,50,0.08)"
                accentBorder="rgba(230,70,50,0.15)"
                onCheckOff={onCheckOff}
                onSelect={handleSelectTask}
                emptyText="Keine Todoist-Tasks"
              />
              <Column
                title="Asana"
                icon="📋"
                tasks={asanaTasks}
                accentBg="rgba(100,120,255,0.08)"
                accentBorder="rgba(100,120,255,0.15)"
                onCheckOff={onCheckOff}
                onSelect={handleSelectTask}
                emptyText="Keine Asana-Tasks"
              />
            </div>
          </motion.div>

          {/* Detail Overlay (on top of everything) */}
          <AnimatePresence>
            {selectedTask && !loadingDetail && (
              <TaskDetailOverlay task={selectedTask} onClose={() => setSelectedTask(null)} />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
