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

  const [tabPositions, setTabPositions] = useState<{ left: number; width: number }[]>([]);

  // Drag state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartIndex = useRef(0);
  const hasMoved = useRef(false);
  const [dragIndicatorLeft, setDragIndicatorLeft] = useState<number | null>(null);

  // Measure all tab positions
  const measureAll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const positions = tabRefs.current.map((el) => {
      if (!el) return { left: 0, width: 0 };
      const r = el.getBoundingClientRect();
      return { left: r.left - containerRect.left, width: r.width };
    });
    setTabPositions(positions);
  }, []);

  useEffect(() => {
    measureAll();
    window.addEventListener("resize", measureAll);
    return () => window.removeEventListener("resize", measureAll);
  }, [measureAll]);

  const activePos = tabPositions[activeIndex] || { left: 0, width: 0 };

  // Convert drag pixel offset to fractional tab progress
  function pixelToProgress(indicatorLeft: number): number {
    if (tabPositions.length === 0) return 0;
    // Find which two tabs we're between
    for (let i = 0; i < tabPositions.length - 1; i++) {
      const thisCenter = tabPositions[i].left + tabPositions[i].width / 2;
      const nextCenter = tabPositions[i + 1].left + tabPositions[i + 1].width / 2;
      const dragCenter = indicatorLeft + activePos.width / 2;
      if (dragCenter >= thisCenter && dragCenter <= nextCenter) {
        const frac = (dragCenter - thisCenter) / (nextCenter - thisCenter);
        return i + frac - activeIndex;
      }
    }
    // Clamp to edges
    const firstCenter = tabPositions[0].left + tabPositions[0].width / 2;
    const lastCenter = tabPositions[tabPositions.length - 1].left + tabPositions[tabPositions.length - 1].width / 2;
    const dragCenter = indicatorLeft + activePos.width / 2;
    if (dragCenter < firstCenter) return -activeIndex;
    return (tabPositions.length - 1) - activeIndex;
  }

  function findClosestTab(indicatorLeft: number): number {
    const dragCenter = indicatorLeft + activePos.width / 2;
    let closest = 0;
    let minDist = Infinity;
    tabPositions.forEach((pos, i) => {
      const center = pos.left + pos.width / 2;
      if (Math.abs(dragCenter - center) < minDist) {
        minDist = Math.abs(dragCenter - center);
        closest = i;
      }
    });
    return closest;
  }

  function handlePointerDown(e: React.PointerEvent) {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Only drag if clicking near the indicator
    if (x < activePos.left - 15 || x > activePos.left + activePos.width + 15) return;

    isDragging.current = true;
    hasMoved.current = false;
    dragStartX.current = e.clientX;
    dragStartIndex.current = activeIndex;
    container.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current || !containerRef.current) return;

    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 3) hasMoved.current = true;
    if (!hasMoved.current) return;

    const maxLeft = containerRef.current.getBoundingClientRect().width - 12 - activePos.width;
    const newLeft = Math.max(0, Math.min(activePos.left + dx, maxLeft));
    setDragIndicatorLeft(newLeft);

    // Tell App how far between pages we are
    const progress = pixelToProgress(newLeft);
    onDragProgress(progress);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    containerRef.current?.releasePointerCapture(e.pointerId);

    if (hasMoved.current && dragIndicatorLeft !== null) {
      const closest = findClosestTab(dragIndicatorLeft);
      onSelect(closest);
    }
    setDragIndicatorLeft(null);
    onDragProgress(0);
  }

  const indicatorLeft = dragIndicatorLeft ?? activePos.left;
  const indicatorWidth = activePos.width;

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
            dragIndicatorLeft !== null
              ? { left: indicatorLeft, width: indicatorWidth }
              : { left: activePos.left, width: activePos.width }
          }
          transition={
            dragIndicatorLeft !== null
              ? { type: "tween", duration: 0 }
              : { type: "spring", stiffness: 400, damping: 32 }
          }
        />

        {/* Tab buttons */}
        {TAB_LABELS.map((label, i) => (
          <button
            key={label}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => {
              if (!hasMoved.current) onSelect(i);
            }}
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
