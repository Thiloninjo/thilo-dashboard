import { useRef, useEffect } from "react";
import type { ReactNode } from "react";

interface Props {
  activeIndex: number;
  dragProgress: number;
  pages: ReactNode[];
}

export function PageSwiper({ activeIndex, dragProgress, pages }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const offset = activeIndex + dragProgress;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Each page is 100% of the wrapper width. Translate by offset * 100%.
    const tx = -(offset * 100);

    if (dragProgress !== 0) {
      el.style.transition = "none";
    } else {
      el.style.transition = "transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    }
    el.style.transform = `translateX(${tx}%)`;
  }, [offset, dragProgress]);

  return (
    // Outer wrapper clips — no neighbor pages visible
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div
        ref={containerRef}
        style={{
          display: "flex",
          willChange: "transform",
        }}
      >
        {pages.map((page, i) => (
          <div
            key={i}
            style={{
              width: "100%",
              minWidth: "100%",
              flexShrink: 0,
              // Always render all pages (keeps state alive), just hide distant ones visually
              visibility: Math.abs(i - offset) < 2 ? "visible" : "hidden",
              pointerEvents: Math.round(offset) === i ? "auto" : "none",
            }}
          >
            {page}
          </div>
        ))}
      </div>
    </div>
  );
}
