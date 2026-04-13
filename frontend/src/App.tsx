import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Nav } from "./components/Nav";
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

export default function App() {
  return (
    <BrowserRouter>
      <LiquidGlassFilter />
      <Nav />
      <main className="max-w-[1400px] mx-auto p-7">
        <Routes>
          <Route path="/" element={<Navigate to="/heute" replace />} />
          <Route path="/heute" element={<Heute />} />
          <Route path="/changelog" element={<ChangeLog />} />
          <Route path="/sops/*" element={<SOPs />} />
          <Route path="/ai-edge" element={<AIEdge />} />
          <Route path="/personal-dev" element={<PersonalDev />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
