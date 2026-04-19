import { useState, useEffect } from "react";
import { GlassCard } from "../components/GlassCard";
import { apiFetch } from "../lib/api";

interface Report {
  name: string;
  date: string;
  content: string;
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-[13px] text-white/70 leading-relaxed">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mb-3 mt-5 first:mt-0 text-white">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-base font-bold mb-2 mt-5 text-white/90 border-b border-white/10 pb-1">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-bold mb-1 mt-3 text-white/80">{line.slice(4)}</h3>;
        if (line.startsWith("- **")) {
          const match = line.match(/^- \*\*(.+?)\*\*\s*[—–-]?\s*(.*)/);
          if (match) return (
            <div key={i} className="flex items-start gap-2 py-0.5 ml-1">
              <span className="text-white/30 mt-0.5">•</span>
              <span><strong className="text-white/90">{match[1]}</strong>{match[2] && <> — {match[2]}</>}</span>
            </div>
          );
        }
        if (line.startsWith("- ")) return (
          <div key={i} className="flex items-start gap-2 py-0.5 ml-1">
            <span className="text-white/30 mt-0.5">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        if (line.match(/^---/)) return <hr key={i} className="my-3 border-white/10" />;
        if (line.startsWith("#claude")) return null;
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i} className="mb-1">{line}</p>;
      })}
    </div>
  );
}

export function AIEdge() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    apiFetch<{ data: Report[] }>("/ai-edge")
      .then((r) => setReports(r.data))
      .catch(() => {});
  }, []);

  if (reports.length === 0) {
    return (
      <>
        <h2 className="text-xl font-bold mb-2 text-white">AI-Edge</h2>
        <p className="text-white/50 text-sm mb-6">AI-Video-Recherche — Newsletter-Feed</p>
        <GlassCard>
          <div className="flex items-center justify-center py-12">
            <p className="text-white/30 text-sm">Keine Reports gefunden. Starte /ai-edge um den ersten zu erstellen.</p>
          </div>
        </GlassCard>
      </>
    );
  }

  const report = reports[selected];

  return (
    <>
      <h2 className="text-xl font-bold mb-2 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>AI-Edge</h2>
      <div className="flex items-center gap-3 mb-5">
        <p className="text-white/50 text-sm font-medium">AI-Video-Recherche</p>
        {reports.length > 1 && (
          <div className="flex gap-1.5 ml-auto">
            {reports.map((r, i) => (
              <button
                key={r.date}
                onClick={() => setSelected(i)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                style={{
                  background: i === selected ? "rgba(0,122,255,0.3)" : "rgba(255,255,255,0.06)",
                  border: i === selected ? "1px solid rgba(0,122,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: i === selected ? "rgba(100,180,255,0.9)" : "rgba(255,255,255,0.4)",
                }}
              >
                {r.date}
              </button>
            ))}
          </div>
        )}
      </div>
      <GlassCard className="!overflow-hidden" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div className="overflow-y-auto h-full px-2" style={{ scrollbarWidth: "none" }}>
          <MarkdownRenderer content={report.content} />
        </div>
      </GlassCard>
    </>
  );
}
