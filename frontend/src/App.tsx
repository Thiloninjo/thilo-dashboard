import { useState, useCallback } from "react";
import { Nav } from "./components/Nav";
import { PageSwiper } from "./components/PageSwiper";
import { CommandBar } from "./components/CommandBar";
import { DynamicWallpaper } from "./components/DynamicWallpaper";
import { Heute } from "./pages/Heute";
import { ChangeLog } from "./pages/ChangeLog";
import { SOPs } from "./pages/SOPs";
import { AIEdge } from "./pages/AIEdge";
import { PersonalDev } from "./pages/PersonalDev";

function LiquidGlassFilter() {
  return (
    <svg style={{ display: "none" }}>
      {/* Edge refraction — stronger distortion at edges, clear in center (like a real glass lens) */}
      <filter id="glassRefraction" x="-5%" y="-5%" width="110%" height="110%">
        {/* Detect edges of the element */}
        <feMorphology in="SourceAlpha" operator="erode" radius="8" result="eroded" />
        <feGaussianBlur in="eroded" stdDeviation="12" result="blurredEdge" />

        {/* Create edge mask: bright at edges, dark in center */}
        <feComposite in="SourceAlpha" in2="blurredEdge" operator="out" result="edgeMask" />
        <feGaussianBlur in="edgeMask" stdDeviation="6" result="softEdge" />

        {/* Subtle noise for organic feel */}
        <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" result="noise" />

        {/* Combine noise with edge mask — distortion only at edges */}
        <feComposite in="noise" in2="softEdge" operator="in" result="edgeNoise" />

        {/* Merge with neutral gray for displacement */}
        <feFlood floodColor="#808080" result="neutral" />
        <feMerge result="displacementMap">
          <feMergeNode in="neutral" />
          <feMergeNode in="edgeNoise" />
        </feMerge>

        {/* Apply displacement — edges shift, center stays clear */}
        <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="20" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

export const TAB_LABELS = ["Heute", "Change-Log", "SOPs", "AI-Edge", "Personal Dev"];

function PageWrap({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1400px] mx-auto px-7 py-7">{children}</div>;
}

const pages = [
  <PageWrap key="heute"><Heute /></PageWrap>,
  <PageWrap key="changelog"><ChangeLog /></PageWrap>,
  <PageWrap key="sops"><SOPs /></PageWrap>,
  <PageWrap key="aiedge"><AIEdge /></PageWrap>,
  <PageWrap key="personaldev"><PersonalDev /></PageWrap>,
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
      <DynamicWallpaper />
      <LiquidGlassFilter />
      <Nav
        activeIndex={activeIndex}
        onSelect={handleNavSelect}
        onDragProgress={handleNavDrag}
      />
      <main className="w-full">
        <PageSwiper
          activeIndex={activeIndex}
          dragProgress={dragProgress}
          pages={pages}
        />
      </main>
      <CommandBar />
    </>
  );
}
