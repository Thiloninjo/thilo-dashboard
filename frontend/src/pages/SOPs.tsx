import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../components/GlassCard";
import { apiFetch } from "../lib/api";
import type { Workspace, SOPSummary, SOPDetail, CachedResponse } from "../lib/types";

// Simple markdown-to-JSX renderer for SOP content
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H1
    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-2xl font-bold mb-4 mt-6 first:mt-0">{line.slice(2)}</h1>);
      continue;
    }
    // H2
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-bold mb-3 mt-6 text-gray-800 border-b border-gray-200 pb-2">{line.slice(3)}</h2>);
      continue;
    }
    // H3
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-bold mb-2 mt-4 text-gray-700">{line.slice(4)}</h3>);
      continue;
    }
    // Checkbox
    if (line.match(/^- \[[ x]\] /)) {
      const checked = line[3] === "x";
      const text = line.slice(6);
      elements.push(
        <div key={i} className="flex items-start gap-2.5 py-1 ml-1">
          <span className={`mt-0.5 text-sm ${checked ? "text-green-500" : "text-gray-400"}`}>{checked ? "☑" : "☐"}</span>
          <span className={`text-sm leading-relaxed ${checked ? "text-gray-400 line-through" : "text-gray-700"}`}>{text}</span>
        </div>
      );
      continue;
    }
    // Bullet with bold prefix: - **text:** rest
    if (line.match(/^- \*\*(.+?)\*\*/)) {
      const match = line.match(/^- \*\*(.+?)\*\*\s*[—–-]?\s*(.*)/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2 py-0.5 ml-1">
            <span className="text-gray-400 mt-1">•</span>
            <span className="text-sm leading-relaxed text-gray-700">
              <strong className="text-gray-900">{match[1]}</strong>
              {match[2] && <> — {match[2]}</>}
            </span>
          </div>
        );
        continue;
      }
    }
    // Regular bullet
    if (line.startsWith("- ")) {
      const text = line.slice(2);
      // Check for (date) prefix — Lessons Learned
      const dateMatch = text.match(/^\((.+?)\)\s*(.*)/);
      if (dateMatch) {
        elements.push(
          <div key={i} className="flex items-start gap-3 py-0.5 ml-1">
            <span className="text-xs text-gray-400 font-mono min-w-[60px] mt-0.5">({dateMatch[1]})</span>
            <span className="text-sm leading-relaxed text-gray-700">{dateMatch[2]}</span>
          </div>
        );
      } else {
        elements.push(
          <div key={i} className="flex items-start gap-2 py-0.5 ml-1">
            <span className="text-gray-400 mt-1">•</span>
            <span className="text-sm leading-relaxed text-gray-700">{text}</span>
          </div>
        );
      }
      continue;
    }
    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-4 border-gray-200" />);
      continue;
    }
    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }
    // Regular text
    elements.push(<p key={i} className="text-sm leading-relaxed text-gray-700 mb-1">{line}</p>);
  }

  return <>{elements}</>;
}

export function SOPs() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [sops, setSOPs] = useState<SOPSummary[]>([]);
  const [selectedSOP, setSelectedSOP] = useState<string | null>(null);
  const [detail, setDetail] = useState<SOPDetail | null>(null);

  useEffect(() => {
    apiFetch<CachedResponse<Workspace[]>>("/sops").then((r) => setWorkspaces(r.data)).catch(() => {});
  }, []);

  async function openWorkspace(name: string) {
    setSelectedWorkspace(name);
    setSelectedSOP(null);
    setDetail(null);
    const r = await apiFetch<CachedResponse<SOPSummary[]>>(`/sops/${encodeURIComponent(name)}`);
    setSOPs(r.data);
  }

  async function openSOP(fileName: string) {
    setSelectedSOP(fileName);
    const r = await apiFetch<CachedResponse<SOPDetail>>(`/sops/${encodeURIComponent(selectedWorkspace!)}/${encodeURIComponent(fileName)}`);
    setDetail(r.data);
  }

  function goBack() {
    if (selectedSOP) { setSelectedSOP(null); setDetail(null); }
    else if (selectedWorkspace) { setSelectedWorkspace(null); setSOPs([]); }
  }

  // Level 3: SOP Document Sheet
  if (detail) {
    return (
      <>
        <button
          onClick={goBack}
          className="mb-4 px-4 py-2 rounded-full text-sm text-white font-semibold flex items-center gap-2"
          style={{
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 0 8px rgba(255,255,255,0.1)",
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          ← Zurück
        </button>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(40px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.2)",
            }}
          >
            {/* Document content */}
            <div className="p-8 max-h-[75vh] overflow-y-auto" style={{ colorScheme: "light" }}>
              <MarkdownRenderer content={detail.rawContent} />
            </div>
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  // Level 2: SOP cards
  if (selectedWorkspace) {
    return (
      <>
        <button
          onClick={goBack}
          className="mb-4 px-4 py-2 rounded-full text-sm text-white font-semibold flex items-center gap-2"
          style={{
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 0 8px rgba(255,255,255,0.1)",
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          ← Zurück
        </button>
        <h2 className="text-2xl font-bold mb-6 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
          {selectedWorkspace}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {sops.map((sop) => (
            <GlassCard key={sop.fileName} onClick={() => openSOP(sop.fileName)}>
              <div className="text-sm font-bold text-white">{sop.name}</div>
              <div className="flex gap-4 mt-2 text-xs text-white/50 font-medium">
                <span>{sop.quickCheckCount} Quick-Checks</span>
                {sop.queueCount > 0 && <span className="text-warning">{sop.queueCount} in Queue</span>}
              </div>
            </GlassCard>
          ))}
        </div>
      </>
    );
  }

  // Level 1: Workspace cards with character images
  const workspaceImages: Record<string, string> = {
    "Tennis-Ring-Lual": "/sop-trl.png",
    "Cavy": "/sop-cavy.png",
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-2 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>SOPs</h2>
      <p className="text-white/50 text-sm mb-6 font-medium" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>Wähle einen Workspace</p>
      <div className="grid grid-cols-2 gap-6">
        {workspaces.map((ws) => (
          <div
            key={ws.name}
            onClick={() => openWorkspace(ws.name)}
            className="relative cursor-pointer group"
          >
            {/* Glass card */}
            <div
              className="relative overflow-hidden rounded-3xl h-[280px] transition-all duration-300 group-hover:scale-[1.02]"
              style={{
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 0 20px -5px rgba(255,255,255,0.2)",
              }}
            >
              {/* Character image — inside the panel, bottom-aligned, head sticks out top */}
              {workspaceImages[ws.name] && (
                <img
                  src={workspaceImages[ws.name]}
                  alt={ws.name}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[320px] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                />
              )}
              {/* Text overlay at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 px-6 py-5 z-10"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
                }}
              >
                <div className="text-xl font-bold text-white" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
                  {ws.name}
                </div>
                <div className="text-sm text-white/60 mt-0.5 font-medium" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
                  {ws.sopCount} SOPs
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
