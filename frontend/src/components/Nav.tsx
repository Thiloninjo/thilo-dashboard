import { useRef, useState, useEffect, useCallback } from "react";
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

  // Where the indicator should be based on the active route
  const [targetPos, setTargetPos] = useState({ left: 0, width: 0 });
  // Where the indicator actually is (follows target, or follows drag)
  const [dragLeft, setDragLeft] = useState<number | null>(null);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);
  const hasMoved = useRef(false);

  const activeIndex = tabs.findIndex((t) => location.pathname.startsWith(t.to));

  // Measure tab positions
  const measureTab = useCallback((index: number) => {
    const el = tabRefs.current[index];
    const container = containerRef.current;
    if (!el || !container) return { left: 0, width: 0 };
    const containerRect = container.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();
    return {
      left: tabRect.left - containerRect.left,
      width: tabRect.width,
    };
  }, []);

  // Update target position when active tab changes
  useEffect(() => {
    const pos = measureTab(activeIndex);
    setTargetPos(pos);
    setDragLeft(null); // Reset drag
  }, [activeIndex, measureTab]);

  // Find closest tab to a given left position
  function findClosestTab(left: number): number {
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < tabs.length; i++) {
      const pos = measureTab(i);
      const center = pos.left + pos.width / 2;
      const dist = Math.abs((left + targetPos.width / 2) - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    return closest;
  }

  // Drag handlers — on the whole container area
  function handlePointerDown(e: React.PointerEvent) {
    // Only start drag if clicking on the indicator area or near it
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const indicatorLeft = dragLeft ?? targetPos.left;

    // Must click within the indicator to drag it
    if (x < indicatorLeft - 10 || x > indicatorLeft + targetPos.width + 10) return;

    isDragging.current = true;
    hasMoved.current = false;
    dragStartX.current = e.clientX;
    dragStartLeft.current = indicatorLeft;
    container.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current || !containerRef.current) return;

    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 3) hasMoved.current = true;

    const containerWidth = containerRef.current.getBoundingClientRect().width - 12; // padding
    const newLeft = Math.max(0, Math.min(dragStartLeft.current + dx, containerWidth - targetPos.width));
    setDragLeft(newLeft);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (hasMoved.current && dragLeft !== null) {
      const closestIdx = findClosestTab(dragLeft);
      navigate(tabs[closestIdx].to);
    }
    setDragLeft(null);
    containerRef.current?.releasePointerCapture(e.pointerId);
  }

  const indicatorLeft = dragLeft ?? targetPos.left;

  return (
    <nav className="sticky top-4 z-10 flex justify-center px-7 pt-4">
      <div
        ref={containerRef}
        className="relative flex gap-0 p-1.5 rounded-full touch-none"
        style={{
          backdropFilter: "blur(30px) saturate(200%)",
          WebkitBackdropFilter: "blur(30px) saturate(200%)",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 0 12px -4px rgba(255,255,255,0.15)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Sliding indicator — pointer-events-none, sits behind buttons */}
        <motion.div
          className="absolute top-1.5 rounded-full pointer-events-none"
          style={{
            height: "calc(100% - 12px)",
            background: "rgba(255,255,255,0.15)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15), inset 0 0 8px rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
          animate={
            dragLeft !== null
              ? { left: indicatorLeft, width: targetPos.width }
              : { left: targetPos.left, width: targetPos.width }
          }
          transition={
            dragLeft !== null
              ? { type: "tween", duration: 0 }
              : { type: "spring", stiffness: 400, damping: 32 }
          }
        />

        {/* Tab buttons — always clickable */}
        {tabs.map((tab, i) => (
          <button
            key={tab.to}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => {
              if (!hasMoved.current) navigate(tab.to);
            }}
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
