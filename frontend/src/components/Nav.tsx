import { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { to: "/heute", label: "Heute" },
  { to: "/changelog", label: "Change-Log" },
  { to: "/sops", label: "SOPs" },
  { to: "/ai-edge", label: "AI-Edge" },
  { to: "/personal-dev", label: "Personal Dev" },
];

export function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIndex = tabs.findIndex((t) => location.pathname.startsWith(t.to));

  useEffect(() => {
    const el = tabRefs.current[activeIndex];
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeIndex]);

  return (
    <nav className="sticky top-4 z-10 flex justify-center px-7 pt-4">
      <div
        ref={containerRef}
        className="relative flex gap-0 p-1.5 rounded-full"
        style={{
          backdropFilter: "blur(30px) saturate(200%)",
          WebkitBackdropFilter: "blur(30px) saturate(200%)",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 0 12px -4px rgba(255,255,255,0.15)",
        }}
      >
        {/* Sliding indicator */}
        <motion.div
          className="absolute top-1.5 rounded-full pointer-events-none"
          style={{
            height: "calc(100% - 12px)",
            background: "rgba(255,255,255,0.15)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15), inset 0 0 8px rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />

        {tabs.map((tab, i) => (
          <button
            key={tab.to}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => navigate(tab.to)}
            className={`relative z-10 px-5 py-2 text-[13px] rounded-full transition-colors select-none ${
              i === activeIndex
                ? "text-white font-bold"
                : "text-white/40 font-medium hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
