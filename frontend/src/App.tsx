import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Heute } from "./pages/Heute";
import { ChangeLog } from "./pages/ChangeLog";
import { SOPs } from "./pages/SOPs";
import { AIEdge } from "./pages/AIEdge";
import { PersonalDev } from "./pages/PersonalDev";

export default function App() {
  return (
    <BrowserRouter>
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
