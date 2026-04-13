import { ReactNode, useRef, useEffect } from "react";

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
        {pages.map((page, i) => {
          const distance = Math.abs(i - offset);
          const shouldRender = distance < 2;

          return (
            <div
              key={i}
              style={{
                // Each page takes exactly 100% of the visible area
                width: "100%",
                minWidth: "100%",
                flexShrink: 0,
                opacity: shouldRender ? 1 : 0,
                pointerEvents: Math.round(offset) === i ? "auto" : "none",
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
