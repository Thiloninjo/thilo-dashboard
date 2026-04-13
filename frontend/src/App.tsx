import { useState, useCallback } from "react";
import { Nav } from "./components/Nav";
import { PageSwiper } from "./components/PageSwiper";
import { Heute } from "./pages/Heute";
import { ChangeLog } from "./pages/ChangeLog";
import { SOPs } from "./pages/SOPs";
import { AIEdge } from "./pages/AIEdge";
import { PersonalDev } from "./pages/PersonalDev";

function LiquidGlassFilter() {
  return (
    <svg style={{ display: "none" }}>
      <filter id="liquidGlass">
        <feTurbulence
          type="turbulence"
          baseFrequency="0.015"
          numOctaves="3"
          result="turbulence"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="turbulence"
          scale="8"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

export const TAB_LABELS = ["Heute", "Change-Log", "SOPs", "AI-Edge", "Personal Dev"];

const pages = [
  <Heute key="heute" />,
  <ChangeLog key="changelog" />,
  <SOPs key="sops" />,
  <AIEdge key="aiedge" />,
  <PersonalDev key="personaldev" />,
];

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  // dragProgress: 0 = no drag, fractional = between pages (e.g. 0.5 = halfway to next)
  const [dragProgress, setDragProgress] = useState(0);

  const handleNavDrag = useCallback((progress: number) => {
    setDragProgress(progress);
  }, []);

  const handleNavSelect = useCallback((index: number) => {
    setActiveIndex(index);
    setDragProgress(0);
  }, []);

  return (
    <>
      <LiquidGlassFilter />
      <Nav
        activeIndex={activeIndex}
        onSelect={handleNavSelect}
        onDragProgress={handleNavDrag}
      />
      <main className="max-w-[1400px] mx-auto p-7">
        <PageSwiper
          activeIndex={activeIndex}
          dragProgress={dragProgress}
          pages={pages}
        />
      </main>
    </>
  );
}
