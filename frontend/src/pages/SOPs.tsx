import { useState, useEffect } from "react";
import { GlassCard, CardHeader } from "../components/GlassCard";
import { apiFetch } from "../lib/api";
import type { Workspace, SOPSummary, SOPDetail, CachedResponse } from "../lib/types";

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

  if (detail) {
    return (
      <>
        <button onClick={goBack} className="text-xs text-accent-light hover:underline mb-4">&larr; Zurueck</button>
        <h2 className="text-xl font-bold mb-6">{detail.name}</h2>

        <GlassCard className="mb-4">
          <CardHeader title="Quick-Check" />
          {detail.quickCheck.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <span className={`text-xs ${item.checked ? "text-success" : "text-text-muted"}`}>{item.checked ? "☑" : "☐"}</span>
              <span className={`text-sm ${item.checked ? "text-text-muted line-through" : ""}`}>{item.text}</span>
            </div>
          ))}
        </GlassCard>

        <GlassCard className="mb-4">
          <CardHeader title="Lessons Learned" />
          {detail.lessonsLearned.map((item, i) => (
            <div key={i} className="flex gap-3 py-1.5">
              <span className="text-[10px] text-text-muted min-w-[60px]">({item.date})</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </GlassCard>

        {detail.queue.length > 0 && (
          <GlassCard>
            <CardHeader title="Ausarbeitungs-Queue" />
            {detail.queue.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span className={`text-xs ${item.checked ? "text-success" : "text-text-muted"}`}>{item.checked ? "☑" : "☐"}</span>
                <span className={`text-sm ${item.checked ? "text-text-muted line-through" : ""}`}>{item.text}</span>
              </div>
            ))}
          </GlassCard>
        )}
      </>
    );
  }

  if (selectedWorkspace) {
    return (
      <>
        <button onClick={goBack} className="text-xs text-accent-light hover:underline mb-4">&larr; Zurueck</button>
        <h2 className="text-xl font-bold mb-6">{selectedWorkspace}</h2>
        <div className="grid grid-cols-2 gap-4">
          {sops.map((sop) => (
            <GlassCard key={sop.fileName} onClick={() => openSOP(sop.fileName)}>
              <div className="text-sm font-semibold">{sop.name}</div>
              <div className="flex gap-4 mt-2 text-[10px] text-text-muted">
                <span>{sop.quickCheckCount} Quick-Checks</span>
                {sop.queueCount > 0 && <span className="text-warning">{sop.queueCount} in Queue</span>}
              </div>
            </GlassCard>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold mb-2">SOPs</h2>
      <p className="text-text-muted text-sm mb-6">Waehle einen Workspace</p>
      <div className="grid grid-cols-2 gap-4">
        {workspaces.map((ws) => (
          <GlassCard key={ws.name} onClick={() => openWorkspace(ws.name)}>
            <div className="text-base font-semibold">{ws.name}</div>
            <div className="text-xs text-text-muted mt-1">{ws.sopCount} SOPs</div>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
