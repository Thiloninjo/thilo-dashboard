import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { TAB_LABELS } from "../App";

interface Props {
  activeIndex: number;
  onSelect: (index: number) => void;
  onDragProgress: (progress: number) => void;
}

export function Nav({ activeIndex, onSelect, onDragProgress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabPositions, setTabPositions] = useState<{ left: number; width: number; center: number }[]>([]);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartIndicatorLeft = useRef(0);
  const hasMoved = useRef(false);
  const [dragLeft, setDragLeft] = useState<number | null>(null);

  // Measure tabs
  const measureAll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const positions = tabRefs.current.map((el) => {
      if (!el) return { left: 0, width: 0, center: 0 };
      const r = el.getBoundingClientRect();
      const left = r.left - cr.left;
      return { left, width: r.width, center: left + r.width / 2 };
    });
    setTabPositions(positions);
  }, []);

  useEffect(() => {
    measureAll();
    window.addEventListener("resize", measureAll);
    return () => window.removeEventListener("resize", measureAll);
  }, [measureAll]);

  const activePos = tabPositions[activeIndex] || { left: 0, width: 0, center: 0 };

  // Map indicator center position to a continuous page index (0, 0.5, 1, 1.5, etc.)
  function indicatorToPageIndex(left: number): number {
    if (tabPositions.length < 2) return 0;
    const center = left + activePos.width / 2;

    // Before first tab
    if (center <= tabPositions[0].center) return 0;
    // After last tab
    if (center >= tabPositions[tabPositions.length - 1].center) return tabPositions.length - 1;

    // Between two tabs — linear interpolation
    for (let i = 0; i < tabPositions.length - 1; i++) {
      const c1 = tabPositions[i].center;
      const c2 = tabPositions[i + 1].center;
      if (center >= c1 && center <= c2) {
        return i + (center - c1) / (c2 - c1);
      }
    }
    return 0;
  }

  function findClosestTab(left: number): number {
    const center = left + activePos.width / 2;
    let closest = 0;
    let minDist = Infinity;
    tabPositions.forEach((pos, i) => {
      const dist = Math.abs(center - pos.center);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    return closest;
  }

  function handlePointerDown(e: React.PointerEvent) {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Only start drag near the active indicator
    if (x < activePos.left - 20 || x > activePos.left + activePos.width + 20) return;

    isDragging.current = true;
    hasMoved.current = false;
    dragStartX.current = e.clientX;
    dragStartIndicatorLeft.current = activePos.left;
    container.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current || !containerRef.current) return;

    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 3) hasMoved.current = true;
    if (!hasMoved.current) return;

    const containerWidth = containerRef.current.getBoundingClientRect().width - 12;
    const newLeft = Math.max(0, Math.min(dragStartIndicatorLeft.current + dx, containerWidth - activePos.width));
    setDragLeft(newLeft);

    // Calculate continuous page index and send progress relative to activeIndex
    const pageIndex = indicatorToPageIndex(newLeft);
    onDragProgress(pageIndex - activeIndex);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    containerRef.current?.releasePointerCapture(e.pointerId);

    if (hasMoved.current && dragLeft !== null) {
      const closest = findClosestTab(dragLeft);
      onSelect(closest);
    }
    setDragLeft(null);
    onDragProgress(0);
    // Reset so next click works
    hasMoved.current = false;
  }

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
        {/* Sliding indicator */}
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
              ? { left: dragLeft, width: activePos.width }
              : { left: activePos.left, width: activePos.width }
          }
          transition={
            dragLeft !== null
              ? { duration: 0 }
              : { type: "spring", stiffness: 400, damping: 32 }
          }
        />

        {/* Tab buttons */}
        {TAB_LABELS.map((label, i) => (
          <button
            key={label}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => { if (!hasMoved.current) onSelect(i); }}
            className={`relative z-10 px-5 py-2 text-[13px] rounded-full transition-colors select-none ${
              i === activeIndex
                ? "text-white font-bold"
                : "text-white/40 font-medium hover:text-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
