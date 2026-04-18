import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import type { SOPDetail, CachedResponse } from "../../lib/types";

interface DrehContext {
  isDrehToday: boolean;
  isDrehTomorrow: boolean;
  drehEventToday: { summary: string; start: string } | null;
  drehEventTomorrow: { summary: string; start: string } | null;
  vorabendChecklist: string[];
  morgenChecklist: string[];
  vorOrtChecklist: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-[12px] text-gray-700 leading-relaxed">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mb-2 mt-4 first:mt-0">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-base font-bold mb-2 mt-3 border-b border-gray-200 pb-1">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-bold mb-1 mt-2">{line.slice(4)}</h3>;
        if (line.startsWith("#### ")) return <h4 key={i} className="text-xs font-bold mb-1 mt-2 text-gray-500">{line.slice(5)}</h4>;
        if (line.match(/^- \[[ x]\] /)) {
          const ch = line[3] === "x";
          return <div key={i} className="flex items-start gap-2 py-0.5 ml-1"><span className={ch ? "text-green-500" : "text-gray-400"}>{ch ? "☑" : "☐"}</span><span className={ch ? "text-gray-400 line-through" : ""}>{line.slice(6)}</span></div>;
        }
        if (line.startsWith("- ")) return <div key={i} className="flex items-start gap-2 py-0.5 ml-1"><span className="text-gray-400">•</span><span>{line.slice(2)}</span></div>;
        if (line.match(/^---/)) return <hr key={i} className="my-3 border-gray-200" />;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="mb-0.5">{line}</p>;
      })}
    </div>
  );
}

export function DrehBriefing({ open, onClose }: Props) {
  const [ctx, setCtx] = useState<DrehContext | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState(false);
  const [sopOpen, setSopOpen] = useState(false);
  const [sopDetail, setSopDetail] = useState<SOPDetail | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const check = () => apiFetch<{ data: DrehContext }>("/calendar/dreh-context")
      .then((r) => setCtx(r.data))
      .catch(() => {});
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, []);

  // Don't render if we know there's no dreh. But if ctx is still loading and panel is open, keep rendering.
  if (ctx && !ctx.isDrehToday && !ctx.isDrehTomorrow) return null;
  if (!ctx && !open) return null;

  function toggle(item: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  async function openDoc(type: "filming" | "equipment") {
    try {
      const r = await apiFetch<CachedResponse<SOPDetail>>("/sops/Tennis-Ring-Lual/Dreh%20Learnings.md");
      if (type === "equipment") {
        const content = r.data.rawContent;
        const eqStart = content.indexOf("### Equipment-Checkliste");
        if (eqStart >= 0) {
          const nextSection = content.indexOf("\n---", eqStart);
          const eqContent = nextSection >= 0 ? content.slice(eqStart, nextSection) : content.slice(eqStart);
          setSopDetail({ ...r.data, rawContent: eqContent, name: "Equipment-Checkliste" });
        } else {
          setSopDetail(r.data);
        }
      } else {
        setSopDetail(r.data);
      }
      setSopOpen(true);
    } catch { /* ignore */ }
  }

  function toggleAudio() {
    if (audioPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
      return;
    }
    setAudioLoading(true);
    const audio = new Audio(`/api/calendar/dreh-briefing/audio?t=${Date.now()}`);
    audio.oncanplaythrough = () => { setAudioLoading(false); setAudioPlaying(true); audio.play(); };
    audio.onended = () => { setAudioPlaying(false); audioRef.current = null; };
    audio.onerror = () => { setAudioLoading(false); setAudioPlaying(false); };
    audioRef.current = audio;
  }

  const isVorabend = ctx.isDrehTomorrow && !ctx.isDrehToday;
  const isDrehTag = ctx.isDrehToday;

  const title = isDrehTag ? "🎬 Drehtag heute" : "🎬 Morgen ist Drehtag";
  const subtitle = isDrehTag
    ? ctx.drehEventToday?.summary || "Tennis-Dreh"
    : ctx.drehEventTomorrow?.summary || "Tennis-Dreh";
  const startTime = isDrehTag && ctx.drehEventToday?.start
    ? new Date(ctx.drehEventToday.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : ctx.isDrehTomorrow && ctx.drehEventTomorrow?.start
    ? new Date(ctx.drehEventTomorrow.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : null;

  const items = isVorabend ? ctx.vorabendChecklist : ctx.morgenChecklist;
  const checkedCount = [...checked].filter(c => items.includes(c)).length;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55]"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}
            onClick={() => { if (!sopOpen) onClose(); }}
          />

          {/* Briefing Panel */}
          <div className="fixed inset-0 z-[56] flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="pointer-events-auto relative liquid-glass"
              style={{
                width: "min(800px, calc(100vw - 80px))",
                height: "min(380px, calc(100vh - 140px))",
                borderRadius: "28px",
                overflow: "visible",
              }}
            >
              <div className="flex h-full" style={{ overflow: "hidden", borderRadius: "28px" }}>
              {/* Left: Checklist (max 50% width) */}
              <div className="flex flex-col overflow-hidden" style={{ width: "50%", maxWidth: "50%" }}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/8">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[20px] font-bold text-white">{title}</h2>
                    {startTime && (
                      <span className="text-[12px] font-semibold px-2.5 py-1 rounded-lg bg-white/10 text-white/50">
                        {startTime}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-[13px] text-white/40">{subtitle}</p>
                    {isDrehTag && (
                      <button
                        onClick={toggleAudio}
                        disabled={audioLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105"
                        style={{
                          background: audioPlaying ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.08)",
                          border: audioPlaying ? "1px solid rgba(48,209,88,0.3)" : "1px solid rgba(255,255,255,0.12)",
                          boxShadow: audioPlaying ? "0 0 12px rgba(48,209,88,0.2)" : "0 2px 6px rgba(0,0,0,0.15)",
                        }}
                      >
                        <span className="text-[12px]">
                          {audioLoading ? "⏳" : audioPlaying ? "⏸" : "▶"}
                        </span>
                        <span className={`text-[11px] font-semibold ${audioPlaying ? "text-success" : "text-white/50"}`}>
                          {audioLoading ? "Generiere..." : audioPlaying ? "Briefing läuft" : "Dreh-Briefing"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Checklist */}
                <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">
                      {isVorabend ? "Vorabend-Vorbereitung" : "Checkliste"}
                    </span>
                    <span className={`text-[11px] font-bold ${checkedCount === items.length && items.length > 0 ? "text-success" : "text-white/30"}`}>
                      {checkedCount}/{items.length}
                    </span>
                  </div>

                  {isDrehTag && ctx.morgenChecklist.length > 0 && (
                    <div className="text-[9px] uppercase tracking-wider text-white/20 font-bold mb-2">Morgens</div>
                  )}
                  {(isVorabend ? ctx.vorabendChecklist : ctx.morgenChecklist).map((item) => (
                    <button
                      key={item}
                      onClick={() => toggle(item)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left transition-colors hover:bg-white/8 mb-1"
                      style={{ background: checked.has(item) ? "rgba(48,209,88,0.08)" : "rgba(255,255,255,0.04)", border: checked.has(item) ? "1px solid rgba(48,209,88,0.15)" : "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span className={`text-[12px] ${checked.has(item) ? "text-success" : "text-white/20"}`}>
                        {checked.has(item) ? "✓" : "○"}
                      </span>
                      <span className={`text-[12px] font-medium ${checked.has(item) ? "text-white/30 line-through" : "text-white/70"}`}>
                        {item}
                      </span>
                    </button>
                  ))}

                </div>
              </div>

              {/* Right: SOPs + Close button */}
              <div
                className="relative flex-1 flex flex-col"
                style={{ overflow: "hidden" }}
              >
                {/* Close button */}
                <div className="flex justify-end px-4 pt-4">
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-all liquid-glass"
                    style={{
                      borderRadius: "50%",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                    }}
                  >
                    <span className="text-white/50 text-xs font-bold">✕</span>
                  </button>
                </div>

                {/* SOP papers area */}
                <div
                  className="relative flex-1"
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                >
                <div className="text-[9px] uppercase tracking-wider text-white/25 font-bold px-4 pt-2">
                  Quick Access
                </div>

                {/* Filming SOP doc */}
                <motion.div
                  onClick={() => openDoc("filming")}
                  className="absolute cursor-pointer"
                  animate={{
                    x: hovered ? -130 : 0,
                    y: hovered ? -20 : 2,
                    rotate: hovered ? 0 : 2,
                  }}
                  whileHover={{ y: -28, scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  style={{
                    width: "135px",
                    height: "180px",
                    bottom: "-30px",
                    right: "40px",
                    zIndex: 2,
                    borderRadius: "8px 8px 0 0",
                    background: "rgba(255,255,255,0.98)",
                    border: "1px solid rgba(200,200,210,0.6)",
                    borderBottom: "none",
                    boxShadow: "0 -4px 20px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)",
                    padding: "10px",
                    overflow: "hidden",
                  }}
                >
                  <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1">SOP</div>
                  <div className="text-[9px] font-bold text-gray-800 mb-2">Filming SOP</div>
                  <div className="space-y-[3px]">
                    <div className="h-[2px] w-full bg-gray-200 rounded" />
                    <div className="h-[2px] w-3/4 bg-gray-200 rounded" />
                    <div className="h-[2px] w-full bg-gray-200 rounded" />
                    <div className="h-[2px] w-1/2 bg-gray-200 rounded" />
                    <div className="h-[5px]" />
                    <div className="h-[2px] w-full bg-gray-200 rounded" />
                    <div className="h-[2px] w-2/3 bg-gray-200 rounded" />
                  </div>
                </motion.div>

                {/* Equipment doc */}
                <motion.div
                  onClick={() => openDoc("equipment")}
                  className="absolute cursor-pointer"
                  animate={{
                    x: hovered ? -4 : 4,
                    y: hovered ? -20 : 8,
                    rotate: hovered ? 0 : -3,
                  }}
                  whileHover={{ y: -28, scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  style={{
                    width: "135px",
                    height: "180px",
                    bottom: "-30px",
                    right: "34px",
                    zIndex: 1,
                    borderRadius: "8px 8px 0 0",
                    background: "rgba(245,245,248,0.97)",
                    border: "1px solid rgba(200,200,210,0.6)",
                    borderBottom: "none",
                    boxShadow: "0 -4px 16px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)",
                    padding: "10px",
                    overflow: "hidden",
                  }}
                >
                  <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1">Checkliste</div>
                  <div className="text-[9px] font-bold text-gray-800 mb-2">Equipment</div>
                  <div className="space-y-1">
                    <div className="flex gap-1 items-center"><div className="w-1.5 h-1.5 rounded-sm border border-gray-300" /><div className="h-[2px] flex-1 bg-gray-200 rounded" /></div>
                    <div className="flex gap-1 items-center"><div className="w-1.5 h-1.5 rounded-sm border border-gray-300" /><div className="h-[2px] w-3/4 bg-gray-200 rounded" /></div>
                    <div className="flex gap-1 items-center"><div className="w-1.5 h-1.5 rounded-sm border border-gray-300" /><div className="h-[2px] flex-1 bg-gray-200 rounded" /></div>
                    <div className="flex gap-1 items-center"><div className="w-1.5 h-1.5 rounded-sm border border-gray-300" /><div className="h-[2px] w-2/3 bg-gray-200 rounded" /></div>
                  </div>
                </motion.div>
                </div>
              </div>
              </div>
            </motion.div>
          </div>

          {/* SOP Document Overlay */}
          <AnimatePresence>
            {sopOpen && sopDetail && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60]"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                  onClick={() => setSopOpen(false)}
                />
                <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="pointer-events-auto rounded-3xl overflow-hidden flex flex-col"
                    style={{
                      width: "min(700px, calc(100vw - 80px))",
                      maxHeight: "calc(100vh - 100px)",
                      background: "rgba(255,255,255,0.95)",
                      border: "1px solid rgba(255,255,255,0.8)",
                      boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
                    }}
                  >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-bold text-gray-900">{sopDetail.name}</h2>
                      <button
                        onClick={() => setSopOpen(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-gray-400">✕</span>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "none", colorScheme: "light" }}>
                      <MarkdownRenderer content={sopDetail.rawContent} />
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
