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
    <svg style={{ display: "none" }}></svg>
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
      <main className="w-full" style={{ overflow: "visible" }}>
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
