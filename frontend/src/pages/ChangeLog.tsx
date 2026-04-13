import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../components/GlassCard";
import { apiFetch } from "../lib/api";
import type { ChangeLogEntry, SOPDetail, CachedResponse } from "../lib/types";

export function ChangeLog() {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<ChangeLogEntry | null>(null);
  const [sopDetail, setSOPDetail] = useState<SOPDetail | null>(null);

  useEffect(() => {
    const fetch = () => apiFetch<CachedResponse<ChangeLogEntry[]>>("/changelog").then((r) => setEntries(r.data)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 10_000);
    return () => clearInterval(interval);
  }, []);

  async function openEntry(entry: ChangeLogEntry) {
    if (!entry.workspace || !entry.sopFile) return;
    setSelectedEntry(entry);
    try {
      const r = await apiFetch<CachedResponse<SOPDetail>>(`/sops/${encodeURIComponent(entry.workspace)}/${encodeURIComponent(entry.sopFile)}`);
      setSOPDetail(r.data);
    } catch {
      setSOPDetail(null);
    }
  }

  function closeDetail() {
    setSelectedEntry(null);
    setSOPDetail(null);
  }

  const filtered = filter ? entries.filter((e) => e.sopName.toLowerCase().includes(filter.toLowerCase())) : entries;

  const grouped = filtered.reduce<Record<string, ChangeLogEntry[]>>((acc, entry) => {
    const day = entry.date;
    (acc[day] = acc[day] || []).push(entry);
    return acc;
  }, {});

  // Render SOP detail with highlighted change
  if (selectedEntry && sopDetail) {
    const searchText = selectedEntry.description.toLowerCase();

    return (
      <>
        <button
          onClick={closeDetail}
          className="mb-4 px-4 py-2 rounded-full text-sm text-white font-semibold flex items-center gap-2"
          style={{
            backdropFilter: "blur(20px) saturate(180%)",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 0 8px rgba(255,255,255,0.1)",
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          ← Change-Log
        </button>

        <div className="mb-4 px-4 py-3 rounded-2xl" style={{
          backdropFilter: "blur(20px) saturate(180%)",
          background: "rgba(0,122,255,0.12)",
          border: "1px solid rgba(0,122,255,0.25)",
        }}>
          <div className="text-xs text-accent-light font-semibold">Änderung anzeigen</div>
          <div className="text-sm text-white font-bold mt-1" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
            {selectedEntry.description}
          </div>
          <div className="text-xs text-white/50 mt-1">{selectedEntry.sopName} · {selectedEntry.source}</div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div className="p-8 max-h-[65vh] overflow-y-auto" style={{ colorScheme: "light" }}>
            {sopDetail.rawContent.split("\n").map((line, i) => {
              const isHighlighted = line.toLowerCase().includes(searchText) && searchText.length > 10;

              return (
                <div
                  key={i}
                  className={`${isHighlighted ? "bg-blue-100 border-l-4 border-blue-500 pl-3 py-1 -ml-3 rounded-r-lg" : ""}`}
                >
                  {renderLine(line, i)}
                </div>
              );
            })}
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-2 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>Change-Log</h2>
      <p className="text-white/50 text-sm mb-6 font-medium" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>Alle SOP-Änderungen im Überblick</p>

      <input
        type="text"
        placeholder="SOP filtern..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-6 px-4 py-2 rounded-full text-sm text-white placeholder:text-white/25 focus:outline-none w-64"
        style={{
          backdropFilter: "blur(20px) saturate(180%)",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      />

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-6">
          <div className="text-xs text-white/50 font-semibold mb-3" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
            {new Date(date).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="flex flex-col gap-3 border-l-2 border-white/10 pl-4 ml-2">
            {items.map((entry) => (
              <GlassCard
                key={entry.hash}
                onClick={entry.workspace ? () => openEntry(entry) : undefined}
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-accent-light">{entry.sopName}</div>
                    <div className="text-sm mt-1 text-white font-semibold">{entry.description}</div>
                    <div className="text-[10px] text-white/40 mt-2 font-medium">Quelle: {entry.source}</div>
                  </div>
                  {entry.workspace && (
                    <span className="text-[10px] text-white/30 mt-1">→</span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && <p className="text-white/40 text-sm font-medium">Keine Einträge gefunden.</p>}
    </>
  );
}

// Simple line renderer for SOP content (light theme)
function renderLine(line: string, key: number) {
  if (line.startsWith("# ")) return <h1 key={key} className="text-2xl font-bold mb-3 mt-5 first:mt-0 text-gray-900">{line.slice(2)}</h1>;
  if (line.startsWith("## ")) return <h2 key={key} className="text-lg font-bold mb-2 mt-5 text-gray-800 border-b border-gray-200 pb-2">{line.slice(3)}</h2>;
  if (line.startsWith("### ")) return <h3 key={key} className="text-base font-bold mb-2 mt-3 text-gray-700">{line.slice(4)}</h3>;
  if (line.match(/^- \[[ x]\] /)) {
    const checked = line[3] === "x";
    return (
      <div key={key} className="flex items-start gap-2 py-0.5 ml-1">
        <span className={`text-sm ${checked ? "text-green-500" : "text-gray-400"}`}>{checked ? "☑" : "☐"}</span>
        <span className={`text-sm ${checked ? "text-gray-400 line-through" : "text-gray-700"}`}>{line.slice(6)}</span>
      </div>
    );
  }
  if (line.startsWith("- ")) {
    const text = line.slice(2);
    const dateMatch = text.match(/^\((.+?)\)\s*(.*)/);
    if (dateMatch) {
      return (
        <div key={key} className="flex items-start gap-3 py-0.5 ml-1">
          <span className="text-xs text-gray-400 font-mono min-w-[60px]">({dateMatch[1]})</span>
          <span className="text-sm text-gray-700">{dateMatch[2]}</span>
        </div>
      );
    }
    return (
      <div key={key} className="flex items-start gap-2 py-0.5 ml-1">
        <span className="text-gray-400">•</span>
        <span className="text-sm text-gray-700">{text}</span>
      </div>
    );
  }
  if (line.match(/^---+$/)) return <hr key={key} className="my-3 border-gray-200" />;
  if (line.trim() === "") return <div key={key} className="h-2" />;
  return <p key={key} className="text-sm text-gray-700 mb-1">{line}</p>;
}
