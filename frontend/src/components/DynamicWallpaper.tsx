import { useState, useEffect, useRef } from "react";

// 96 frames: 0-47 = 00:00-11:45 (night to day), 48-95 = 12:00-23:45 (day to night)
// Each frame = 15 minutes of real time
const TOTAL_FRAMES = 96;
const TRANSITION_DURATION = 3000; // 3 second crossfade

function getFrameForTime(): number {
  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  // 1440 minutes in a day, 96 frames = 1 frame per 15 minutes
  const frame = Math.floor(minutesSinceMidnight / 15);
  return Math.min(frame, TOTAL_FRAMES - 1);
}

function getFrameUrl(index: number): string {
  return `/wallpaper/time_${String(index).padStart(3, "0")}.jpg`;
}

export function DynamicWallpaper() {
  const [currentFrame, setCurrentFrame] = useState(getFrameForTime);
  const [nextFrame, setNextFrame] = useState<number | null>(null);
  const [opacity, setOpacity] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Check every 30 seconds if the frame should change
    intervalRef.current = setInterval(() => {
      const targetFrame = getFrameForTime();
      if (targetFrame !== currentFrame) {
        // Preload next frame
        const img = new Image();
        img.src = getFrameUrl(targetFrame);
        img.onload = () => {
          setNextFrame(targetFrame);
          setOpacity(0); // Start fade to next frame

          // After transition, swap
          setTimeout(() => {
            setCurrentFrame(targetFrame);
            setNextFrame(null);
            setOpacity(1);
          }, TRANSITION_DURATION);
        };
      }
    }, 30_000);

    return () => clearInterval(intervalRef.current);
  }, [currentFrame]);

  // Preload adjacent frames
  useEffect(() => {
    const prev = (currentFrame - 1 + TOTAL_FRAMES) % TOTAL_FRAMES;
    const next = (currentFrame + 1) % TOTAL_FRAMES;
    [prev, next].forEach((i) => {
      const img = new Image();
      img.src = getFrameUrl(i);
    });
  }, [currentFrame]);

  return (
    <div className="fixed inset-0 -z-10">
      {/* Current frame */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${getFrameUrl(currentFrame)})`,
          opacity: nextFrame !== null ? opacity : 1,
          transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
        }}
      />
      {/* Next frame (fades in on top) */}
      {nextFrame !== null && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${getFrameUrl(nextFrame)})`,
            opacity: nextFrame !== null ? 1 - opacity : 0,
            transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
          }}
        />
      )}
    </div>
  );
}
