import { ReactNode, useRef, useEffect } from "react";

interface Props {
  activeIndex: number;
  dragProgress: number;
  pages: ReactNode[];
}

export function PageSwiper({ activeIndex, dragProgress, pages }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  const offset = activeIndex + dragProgress;
  const translateX = -(offset * 100);

  // When not dragging, use CSS transition for smooth spring-like animation
  // When dragging, follow instantly (no transition)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (dragProgress !== 0) {
      // Dragging: instant follow
      el.style.transition = "none";
      el.style.transform = `translateX(${translateX / pages.length}%)`;
    } else {
      // Click/snap: smooth transition
      el.style.transition = "transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      el.style.transform = `translateX(${translateX / pages.length}%)`;
    }
  }, [translateX, dragProgress, pages.length]);

  return (
    <div style={{ overflow: "visible" }}>
      <div
        ref={containerRef}
        style={{
          display: "flex",
          width: `${pages.length * 100}%`,
          willChange: "transform",
        }}
      >
        {pages.map((page, i) => {
          const distance = Math.abs(i - offset);
          const shouldRender = distance < 2;

          return (
            <div
              key={i}
              style={{
                width: `${100 / pages.length}%`,
                flexShrink: 0,
                opacity: shouldRender ? 1 : 0,
                pointerEvents: Math.round(offset) === i ? "auto" : "none",
                transition: "opacity 0.3s",
              }}
            >
              {shouldRender ? page : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
