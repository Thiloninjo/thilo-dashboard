import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKGROUNDS, type BackgroundId } from "./backgrounds";

interface Props {
  currentBg: BackgroundId;
  onChangeBg: (id: BackgroundId) => void;
}

type View = "menu" | "backgrounds";

const CATEGORY_LABELS: Record<string, string> = {
  special: "Spezial",
  light: "Light Mode",
  dark: "Dark Mode",
  ambient: "Ambient & Animated",
  "reactive-3d": "Reaktive 3D",
};

const CATEGORY_ORDER = ["special", "light", "dark", "ambient", "reactive-3d"];

export function SettingsMenu({ currentBg, onChangeBg }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTimeout(() => setView("menu"), 300);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view !== "menu") setView("menu");
        else { setOpen(false); setTimeout(() => setView("menu"), 300); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, view]);

  return (
    <div ref={panelRef} className="relative">
      {/* Hamburger Button */}
      <button
        onClick={() => { setOpen(!open); if (open) setTimeout(() => setView("menu"), 300); }}
        className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
        style={{
          background: open ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex flex-col gap-[4px]">
          <span className="block w-[14px] h-[1.5px] bg-white/70 rounded-full transition-transform" style={open ? { transform: "translateY(2.75px) rotate(45deg)" } : {}} />
          <span className="block w-[14px] h-[1.5px] bg-white/70 rounded-full transition-opacity" style={{ opacity: open ? 0 : 1 }} />
          <span className="block w-[14px] h-[1.5px] bg-white/70 rounded-full transition-transform" style={open ? { transform: "translateY(-2.75px) rotate(-45deg)" } : {}} />
        </div>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-14 right-0 rounded-2xl overflow-hidden"
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              background: "rgba(30,30,40,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 16px 64px rgba(0,0,0,0.5), inset 0 0 0 0.5px rgba(255,255,255,0.08)",
              minWidth: view === "backgrounds" ? "420px" : "220px",
              maxHeight: "80vh",
              overflowY: "auto",
              transition: "min-width 0.3s ease",
            }}
          >
            <AnimatePresence mode="wait">
              {view === "menu" ? (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="p-2"
                >
                  <MenuItem
                    icon="🎨"
                    label="Background Gallery"
                    sublabel={BACKGROUNDS.find(b => b.id === currentBg)?.name}
                    onClick={() => setView("backgrounds")}
                  />
                  {/* Future settings items go here */}
                </motion.div>
              ) : (
                <motion.div
                  key="backgrounds"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4 pb-2">
                    <button
                      onClick={() => setView("menu")}
                      className="text-white/50 hover:text-white/80 transition-colors text-sm"
                    >
                      ← Zurück
                    </button>
                    <span className="text-sm font-semibold text-white/80">Background Gallery</span>
                  </div>

                  {/* Background Grid by Category */}
                  <div className="px-4 pb-4">
                    {CATEGORY_ORDER.map(cat => {
                      const items = BACKGROUNDS.filter(b => b.category === cat);
                      if (!items.length) return null;
                      return (
                        <div key={cat} className="mt-3 first:mt-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
                            {CATEGORY_LABELS[cat]}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {items.map(bg => (
                              <button
                                key={bg.id}
                                onClick={() => onChangeBg(bg.id)}
                                className="relative rounded-xl overflow-hidden text-left transition-all group"
                                style={{
                                  aspectRatio: "16/10",
                                  border: currentBg === bg.id
                                    ? "2px solid #007AFF"
                                    : "2px solid rgba(255,255,255,0.08)",
                                  boxShadow: currentBg === bg.id ? "0 0 16px rgba(0,122,255,0.3)" : "none",
                                }}
                              >
                                <BgThumbnail id={bg.id} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                  <div className="text-[11px] font-semibold text-white/90 leading-tight">{bg.name}</div>
                                  <div className="text-[9px] text-white/40 leading-tight mt-0.5">{bg.description}</div>
                                </div>
                                {currentBg === bg.id && (
                                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                                    <span className="text-white text-[10px]">✓</span>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, label, sublabel, onClick }: { icon: string; label: string; sublabel?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors text-left group"
    >
      <span className="text-base">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-white/85">{label}</div>
        {sublabel && <div className="text-[11px] text-white/40 truncate">{sublabel}</div>}
      </div>
      <span className="text-white/20 group-hover:text-white/40 text-sm">›</span>
    </button>
  );
}

/** Mini CSS previews for the thumbnail grid */
function BgThumbnail({ id }: { id: BackgroundId }) {
  const base = "absolute inset-0";
  switch (id) {
    case "time-of-day":
      return <div className={base} style={{ background: "linear-gradient(135deg, #1a1040, #0d2040, #0a1020)" }}><span className="absolute inset-0 flex items-center justify-center text-2xl opacity-30">🕐</span></div>;
    case "clean-white":
      return <div className={base} style={{ background: "#f5f5f7" }} />;
    case "apple-light":
      return <div className={base} style={{ background: "linear-gradient(180deg, #f5f5f7, #e8e8ed)" }} />;
    case "pure-dark":
      return <div className={base} style={{ background: "#0a0a0f" }} />;
    case "midnight-blue":
      return <div className={base} style={{ background: "linear-gradient(135deg, #0c1445, #1a0a2e, #0d0d1a)" }} />;
    case "warm-dark":
      return <div className={base} style={{ background: "linear-gradient(135deg, #1a0a0a, #2d1a0a, #1a1005)" }} />;
    case "textured-dark":
      return <div className={base} style={{ background: "#111116" }} />;
    case "subtle-mesh":
      return <div className={base} style={{ background: "#0a0a0f" }}><div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,122,255,0.15) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 80% 70%, rgba(138,43,226,0.12) 0%, transparent 70%)" }} /></div>;
    case "aurora":
      return <div className={base} style={{ background: "#050510" }}><div className="absolute inset-0" style={{ background: "conic-gradient(from 180deg, rgba(0,255,180,0.1), rgba(0,122,255,0.15), rgba(138,43,226,0.12), rgba(255,0,128,0.08), rgba(0,255,180,0.1))", filter: "blur(20px)" }} /></div>;
    case "flowing-waves":
      return <div className={base} style={{ background: "#0a0a0f" }}><div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(0,122,255,0.12) 0%, transparent 70%)" }} /></div>;
    case "glass-blobs":
      return <div className={base} style={{ background: "linear-gradient(135deg, #0a0a1a, #1a0a2e)" }}><div className="absolute rounded-full" style={{ width: "40%", height: "40%", background: "rgba(0,122,255,0.2)", top: "15%", left: "15%", filter: "blur(20px)" }} /><div className="absolute rounded-full" style={{ width: "50%", height: "50%", background: "rgba(138,43,226,0.15)", bottom: "10%", right: "10%", filter: "blur(20px)" }} /></div>;
    case "particle-field":
      return <div className={base} style={{ background: "#0a0a0f" }}><div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5) 50%, transparent 50%), radial-gradient(1px 1px at 60% 70%, rgba(100,150,255,0.5) 50%, transparent 50%), radial-gradient(1px 1px at 40% 50%, rgba(255,255,255,0.3) 50%, transparent 50%), radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.4) 50%, transparent 50%)" }} /></div>;
    case "topography":
      return <div className={base} style={{ background: "#0a0a0f" }}><div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 100 Q50 75 100 100 T200 100' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 120 Q50 95 100 120 T200 120' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 80 Q50 55 100 80 T200 80' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px" }} /></div>;
    case "grid-3d":
      return <div className={base} style={{ background: "#0a0a0f" }}><div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px", transform: "perspective(300px) rotateX(50deg) scale(2)", transformOrigin: "center 120%", maskImage: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 80%)", WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 80%)" }} /></div>;
    case "sphere-3d":
      return <div className={base} style={{ background: "#0a0a0f" }}><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, rgba(0,122,255,0.4), rgba(138,43,226,0.2) 50%, transparent 70%)", boxShadow: "0 0 30px rgba(0,122,255,0.2)" }} /></div>;
    case "wave-mesh-3d":
      return <div className={base} style={{ background: "#0a0a0f" }}><svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 60"><path d="M0 30 Q25 20 50 30 T100 30" fill="none" stroke="#007AFF" strokeWidth="0.3" /><path d="M0 35 Q25 25 50 35 T100 35" fill="none" stroke="#007AFF" strokeWidth="0.3" /><path d="M0 40 Q25 30 50 40 T100 40" fill="none" stroke="#007AFF" strokeWidth="0.3" /><path d="M0 25 Q25 15 50 25 T100 25" fill="none" stroke="#007AFF" strokeWidth="0.3" /></svg></div>;
    case "point-cloud-3d":
      return <div className={base} style={{ background: "#0a0a0f" }}><div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 25% 35%, rgba(122,159,255,0.5) 50%, transparent 50%), radial-gradient(1px 1px at 55% 25%, rgba(122,159,255,0.3) 50%, transparent 50%), radial-gradient(1.5px 1.5px at 75% 65%, rgba(122,159,255,0.4) 50%, transparent 50%), radial-gradient(1px 1px at 35% 75%, rgba(122,159,255,0.3) 50%, transparent 50%), radial-gradient(1px 1px at 85% 45%, rgba(122,159,255,0.35) 50%, transparent 50%)" }} /></div>;
    default:
      return <div className={base} style={{ background: "#0a0a0f" }} />;
  }
}
