import { GlassCard } from "../components/GlassCard";

export function AIEdge() {
  return (
    <>
      <h2 className="text-xl font-bold mb-2">AI-Edge</h2>
      <p className="text-text-muted text-sm mb-6">Monatliche AI-Video-Recherche — Newsletter-Feed</p>
      <GlassCard>
        <div className="flex items-center justify-center py-12">
          <p className="text-text-muted text-sm">Feed wird nach dem ersten /ai-edge Lauf angezeigt.</p>
        </div>
      </GlassCard>
    </>
  );
}
