import { useState, useEffect, useRef } from "react";

// 96 frames mapped to 24 hours: each frame = 15 minutes
// At any moment, we show a BLEND of two adjacent frames
// The blend ratio changes smoothly — no visible transitions ever
const TOTAL_FRAMES = 96;

function getFrameUrl(index: number): string {
  const clamped = ((index % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
  return `/wallpaper/time_${String(clamped).padStart(3, "0")}.jpg`;
}

function getTimePosition(): { frameA: number; frameB: number; blend: number } {
  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  // Exact position as a floating point frame index
  const exactFrame = (minutesSinceMidnight / 1440) * TOTAL_FRAMES;
  const frameA = Math.floor(exactFrame);
  const frameB = (frameA + 1) % TOTAL_FRAMES;
  const blend = exactFrame - frameA; // 0.0 to 1.0 — how much of frameB to show

  return { frameA, frameB, blend };
}

export function DynamicWallpaper() {
  const [pos, setPos] = useState(getTimePosition);
  const frameRef = useRef(pos);

  useEffect(() => {
    // Update every 5 seconds for smooth blending
    const interval = setInterval(() => {
      const newPos = getTimePosition();
      frameRef.current = newPos;
      setPos(newPos);
    }, 5_000);

    return () => clearInterval(interval);
  }, []);

  // Preload adjacent frames
  useEffect(() => {
    [-1, 0, 1, 2].forEach((offset) => {
      const img = new Image();
      img.src = getFrameUrl(pos.frameA + offset);
    });
  }, [pos.frameA]);

  return (
    <div className="fixed inset-0 -z-10">
      {/* Frame A — always fully visible */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${getFrameUrl(pos.frameA)})`,
          transition: "background-image 0.5s ease",
        }}
      />
      {/* Frame B — blended on top with smooth opacity */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${getFrameUrl(pos.frameB)})`,
          opacity: pos.blend,
          transition: "opacity 5s linear, background-image 0.5s ease",
        }}
      />
    </div>
  );
}
