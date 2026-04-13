import { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  activeIndex: number;
  dragProgress: number; // 0 = at activeIndex, fractional = interpolating
  pages: ReactNode[];
}

export function PageSwiper({ activeIndex, dragProgress, pages }: Props) {
  // Total offset: activeIndex + dragProgress
  const offset = activeIndex + dragProgress;
  const translateX = -(offset * 100);

  return (
    <div className="relative w-full overflow-hidden">
      <motion.div
        className="flex"
        style={{ width: `${pages.length * 100}%` }}
        animate={dragProgress === 0 ? { x: `${translateX / pages.length}%` } : undefined}
        transition={dragProgress === 0 ? { type: "spring", stiffness: 300, damping: 30 } : undefined}
        // During drag: instant follow (no spring)
        {...(dragProgress !== 0 ? { style: { width: `${pages.length * 100}%`, transform: `translateX(${translateX / pages.length}%)` } } : {})}
      >
        {pages.map((page, i) => {
          // Pages near the active one render fully, distant ones are hidden for performance
          const distance = Math.abs(i - offset);
          const shouldRender = distance < 2;

          return (
            <div
              key={i}
              className="w-full flex-shrink-0"
              style={{
                width: `${100 / pages.length}%`,
                opacity: shouldRender ? 1 : 0,
                pointerEvents: Math.round(offset) === i ? "auto" : "none",
              }}
            >
              {shouldRender ? page : null}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
