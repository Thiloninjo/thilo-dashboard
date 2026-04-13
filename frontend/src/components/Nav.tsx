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
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);

  const activeIndex = tabs.findIndex((t) => location.pathname.startsWith(t.to));

  // Measure active tab position for the sliding indicator
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

  // Drag logic
  function handlePointerDown(e: React.PointerEvent) {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartLeft.current = indicator.left;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - dragStartX.current;
    const newLeft = dragStartLeft.current + dx;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const clampedLeft = Math.max(0, Math.min(newLeft, containerWidth - indicator.width));
    setIndicator((prev) => ({ ...prev, left: clampedLeft }));
  }

  function handlePointerUp() {
    if (!isDragging) return;
    setIsDragging(false);

    // Find closest tab
    const center = indicator.left + indicator.width / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    tabRefs.current.forEach((el, i) => {
      if (!el || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      const tabCenter = tabRect.left - containerRect.left + tabRect.width / 2;
      const dist = Math.abs(center - tabCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    navigate(tabs[closestIdx].to);
  }

  return (
    <nav className="sticky top-4 z-10 flex justify-center px-7 pt-4">
      <div
        ref={containerRef}
        className="relative flex gap-0.5 p-1.5 rounded-full liquid-glass"
        style={{
          backdropFilter: "blur(30px) saturate(200%)",
          WebkitBackdropFilter: "blur(30px) saturate(200%)",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 0 12px -4px rgba(255,255,255,0.15)",
        }}
      >
        {/* Sliding indicator pill */}
        <motion.div
          className="absolute top-1.5 h-[calc(100%-12px)] rounded-full cursor-grab active:cursor-grabbing"
          style={{
            backdropFilter: "blur(8px)",
            background: "rgba(255,255,255,0.18)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15), inset 0 0 8px rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
          animate={isDragging ? undefined : { left: indicator.left, width: indicator.width }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {/* Tab buttons */}
        {tabs.map((tab, i) => (
          <button
            key={tab.to}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => navigate(tab.to)}
            className={`relative z-10 px-5 py-2 text-[13px] rounded-full transition-colors select-none ${
              i === activeIndex
                ? "text-white font-bold"
                : "text-white/45 font-medium hover:text-white/65"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
