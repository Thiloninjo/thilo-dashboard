import { useState, useCallback } from "react";
import { Nav } from "./components/Nav";
import { PageSwiper } from "./components/PageSwiper";
import { CommandBar } from "./components/CommandBar";
import { SettingsMenu } from "./components/SettingsMenu";
import { DrehAlert } from "./components/DrehAlert";
import { DrehBriefing } from "./pages/heute/DrehBriefing";
import { BackgroundRenderer, type BackgroundId } from "./components/backgrounds";
import { Heute } from "./pages/Heute";
import { ChangeLog } from "./pages/ChangeLog";
import { SOPs } from "./pages/SOPs";
import { AIEdge } from "./pages/AIEdge";
import { PersonalDev } from "./pages/PersonalDev";
import { Planning } from "./pages/Planning";

export const TAB_LABELS = ["Heute", "Planning", "Change-Log", "SOPs", "AI-Edge", "Personal Dev"];

function PageWrap({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1400px] mx-auto px-7 py-7">{children}</div>;
}

const pages = [
  <PageWrap key="heute"><Heute /></PageWrap>,
  <PageWrap key="planning"><Planning /></PageWrap>,
  <PageWrap key="changelog"><ChangeLog /></PageWrap>,
  <PageWrap key="sops"><SOPs /></PageWrap>,
  <PageWrap key="aiedge"><AIEdge /></PageWrap>,
  <PageWrap key="personaldev"><PersonalDev /></PageWrap>,
];

function getStoredBg(): BackgroundId {
  try {
    const stored = localStorage.getItem("dashboard-bg");
    if (stored) return stored as BackgroundId;
  } catch { /* ignore */ }
  return "time-of-day";
}

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragProgress, setDragProgress] = useState(0);
  const [bgId, setBgId] = useState<BackgroundId>(getStoredBg);
  const [drehOpen, setDrehOpen] = useState(false);

  const handleNavDrag = useCallback((progress: number) => {
    setDragProgress(progress);
  }, []);

  const handleNavSelect = useCallback((index: number) => {
    setActiveIndex(index);
    setDragProgress(0);
  }, []);

  const handleChangeBg = useCallback((id: BackgroundId) => {
    setBgId(id);
    try { localStorage.setItem("dashboard-bg", id); } catch { /* ignore */ }
  }, []);

  return (
    <>
      <BackgroundRenderer id={bgId} />
      <div className="sticky top-4 z-10 flex items-center justify-center px-7 pt-4 gap-3">
        <DrehAlert onOpen={() => setDrehOpen(true)} />
        <Nav
          activeIndex={activeIndex}
          onSelect={handleNavSelect}
          onDragProgress={handleNavDrag}
        />
        <SettingsMenu currentBg={bgId} onChangeBg={handleChangeBg} />
      </div>
      <DrehBriefing open={drehOpen} onClose={() => setDrehOpen(false)} />
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
