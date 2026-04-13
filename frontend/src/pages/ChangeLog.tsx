import { useState, useEffect } from "react";
import { GlassCard } from "../components/GlassCard";
import { apiFetch } from "../lib/api";
import type { ChangeLogEntry, CachedResponse } from "../lib/types";

export function ChangeLog() {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const fetch = () => apiFetch<CachedResponse<ChangeLogEntry[]>>("/changelog").then((r) => setEntries(r.data)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 10_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter ? entries.filter((e) => e.sopName.toLowerCase().includes(filter.toLowerCase())) : entries;

  const grouped = filtered.reduce<Record<string, ChangeLogEntry[]>>((acc, entry) => {
    const day = entry.date;
    (acc[day] = acc[day] || []).push(entry);
    return acc;
  }, {});

  return (
    <>
      <h2 className="text-xl font-bold mb-2">Change-Log</h2>
      <p className="text-text-muted text-sm mb-6">Alle SOP-Aenderungen im Ueberblick</p>

      <input
        type="text"
        placeholder="SOP filtern..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-6 px-4 py-2 bg-surface-raised border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/30 w-64"
      />

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-6">
          <div className="text-xs text-text-muted font-semibold mb-3">
            {new Date(date).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="flex flex-col gap-3 border-l-2 border-border pl-4 ml-2">
            {items.map((entry) => (
              <GlassCard key={entry.hash}>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-accent-light">{entry.sopName}</div>
                    <div className="text-sm mt-1">{entry.description}</div>
                    <div className="text-[10px] text-text-muted mt-2">Quelle: {entry.source}</div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && <p className="text-text-muted text-sm">Keine Eintraege gefunden.</p>}
    </>
  );
}
