import { useEffect, useRef } from "react";

// Combined video: ~30 seconds total
// First half (0-15s): night → day (maps to 00:00-12:00)
// Second half (15-30s): day → night (maps to 12:00-24:00)

export function DynamicWallpaper() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);

  function seekToCurrentTime() {
    const video = videoRef.current;
    if (!video || !durationRef.current) return;

    const now = new Date();
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    const dayProgress = minutesSinceMidnight / 1440; // 0.0 - 1.0

    const targetTime = dayProgress * durationRef.current;
    video.currentTime = targetTime;
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onLoaded() {
      durationRef.current = video!.duration;
      video!.pause(); // Don't play — we control the position manually
      seekToCurrentTime();
    }

    video.addEventListener("loadedmetadata", onLoaded);

    // Update position every 10 seconds for ultra-smooth progression
    const interval = setInterval(() => {
      if (durationRef.current) {
        const now = new Date();
        const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        const dayProgress = minutesSinceMidnight / 1440;
        const targetTime = dayProgress * durationRef.current;

        // Smooth seek: only move if difference is noticeable
        const diff = Math.abs((video.currentTime || 0) - targetTime);
        if (diff > 0.01) {
          video.currentTime = targetTime;
        }
      }
    }, 10_000);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <video
        ref={videoRef}
        src="/wallpaper-24h.mp4"
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
