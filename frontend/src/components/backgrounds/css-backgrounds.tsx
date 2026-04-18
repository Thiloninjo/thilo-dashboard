/** Pure-CSS background components (no Three.js dependency) */

import { useEffect, useRef, useState } from "react";

/* ── Time-of-Day (existing wallpaper system) ── */

const TOTAL_FRAMES = 96;

function getFrameUrl(index: number): string {
  const clamped = ((index % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
  return `/wallpaper/time_${String(clamped).padStart(3, "0")}.jpg`;
}

function getTimePosition() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const exact = (mins / 1440) * TOTAL_FRAMES;
  const frameA = Math.floor(exact);
  return { frameA, frameB: (frameA + 1) % TOTAL_FRAMES, blend: exact - frameA };
}

export function TimeOfDay() {
  const [pos, setPos] = useState(getTimePosition);

  useEffect(() => {
    const iv = setInterval(() => setPos(getTimePosition()), 5_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    [-1, 0, 1, 2].forEach((o) => { const img = new Image(); img.src = getFrameUrl(pos.frameA + o); });
  }, [pos.frameA]);

  return (
    <>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getFrameUrl(pos.frameA)})`, transition: "background-image 0.5s ease" }} />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getFrameUrl(pos.frameB)})`, opacity: pos.blend, transition: "opacity 5s linear, background-image 0.5s ease" }} />
    </>
  );
}

/* ── Static / gradient backgrounds ── */

export function CleanWhite() {
  return <div className="absolute inset-0" style={{ background: "#f5f5f7" }} />;
}

export function AppleLight() {
  return <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)" }} />;
}

export function PureDark() {
  return <div className="absolute inset-0" style={{ background: "#0a0a0f" }} />;
}

export function MidnightBlue() {
  return <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0c1445 0%, #1a0a2e 50%, #0d0d1a 100%)" }} />;
}

export function WarmDark() {
  return <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a0a0a 0%, #2d1a0a 50%, #1a1005 100%)" }} />;
}

export function TexturedDark() {
  return (
    <div className="absolute inset-0" style={{ background: "#111116" }}>
      <div className="absolute inset-0" style={{
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px",
      }} />
    </div>
  );
}

/* ── Ambient / animated backgrounds ── */

export function SubtleMesh() {
  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0f" }}>
      <div className="absolute inset-0" style={{
        background: [
          "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,122,255,0.12) 0%, transparent 70%)",
          "radial-gradient(ellipse 60% 80% at 80% 70%, rgba(138,43,226,0.1) 0%, transparent 70%)",
          "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,200,150,0.05) 0%, transparent 70%)",
        ].join(", "),
      }} />
    </div>
  );
}

export function Aurora() {
  return (
    <div className="absolute inset-0" style={{ background: "#050510", overflow: "hidden" }}>
      <div className="absolute" style={{
        inset: "-50%",
        background: `conic-gradient(from 180deg at 50% 50%,
          rgba(0,255,180,0.08) 0deg, rgba(0,122,255,0.12) 60deg,
          rgba(138,43,226,0.1) 120deg, rgba(255,0,128,0.06) 180deg,
          rgba(0,200,255,0.08) 240deg, rgba(0,255,100,0.06) 300deg,
          rgba(0,255,180,0.08) 360deg)`,
        filter: "blur(60px)",
        animation: "bg-aurora-rotate 30s linear infinite",
      }} />
    </div>
  );
}

export function FlowingWaves() {
  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0f", overflow: "hidden" }}>
      <div className="absolute" style={{
        bottom: "-20%", left: "-10%", right: "-10%", height: "80%",
        background: [
          "radial-gradient(ellipse 100% 40% at 30% 100%, rgba(0,122,255,0.08) 0%, transparent 70%)",
          "radial-gradient(ellipse 100% 40% at 70% 90%, rgba(138,43,226,0.06) 0%, transparent 70%)",
        ].join(", "),
        animation: "bg-wave-flow 8s ease-in-out infinite alternate",
      }} />
    </div>
  );
}

export function GlassBlobs() {
  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)", overflow: "hidden" }}>
      <div className="absolute rounded-full" style={{ width: 400, height: 400, background: "rgba(0,122,255,0.15)", top: "10%", left: "15%", filter: "blur(80px)", animation: "bg-blob-float 12s ease-in-out infinite alternate" }} />
      <div className="absolute rounded-full" style={{ width: 500, height: 500, background: "rgba(138,43,226,0.12)", bottom: "10%", right: "15%", filter: "blur(80px)", animation: "bg-blob-float 12s ease-in-out infinite alternate", animationDelay: "-4s" }} />
      <div className="absolute rounded-full" style={{ width: 300, height: 300, background: "rgba(0,200,150,0.1)", top: "50%", left: "50%", filter: "blur(80px)", animation: "bg-blob-float 12s ease-in-out infinite alternate", animationDelay: "-8s" }} />
    </div>
  );
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf: number;
    const pts = Array.from({ length: 120 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0005,
      vy: (Math.random() - 0.5) * 0.0005,
      r: Math.random() * 1.5 + 0.5,
    }));

    function resize() { c!.width = c!.offsetWidth; c!.height = c!.offsetHeight; }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const w = c!.width, h = c!.height;
      ctx.clearRect(0, 0, w, h);
      pts.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${100 + p.x * 155}, ${100 + p.y * 100}, 255, 0.4)`;
        ctx.fill();
      });
      ctx.strokeStyle = "rgba(100,150,255,0.05)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = (pts[i].x - pts[j].x) * w, dy = (pts[i].y - pts[j].y) * h;
          if (dx * dx + dy * dy < 8000) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x * w, pts[i].y * h);
            ctx.lineTo(pts[j].x * w, pts[j].y * h);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0f" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

export function Topography() {
  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0f" }}>
      <div className="absolute inset-0" style={{
        opacity: 0.15,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 200 Q100 150 200 200 T400 200' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 220 Q100 170 200 220 T400 220' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 240 Q100 190 200 240 T400 240' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 180 Q100 130 200 180 T400 180' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 160 Q100 110 200 160 T400 160' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 260 Q100 210 200 260 T400 260' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 140 Q100 90 200 140 T400 140' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: "400px 400px",
      }} />
    </div>
  );
}
