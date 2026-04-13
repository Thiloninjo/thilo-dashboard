import { useEffect, useRef } from "react";

// Video: ~30 seconds total
// First half: night → day (00:00-12:00)
// Second half: day → night (12:00-24:00)
// Played at ultra-slow speed so it takes exactly 24 hours to complete

const SECONDS_IN_DAY = 86400;

export function DynamicWallpaper() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function start() {
      const duration = video!.duration;
      if (!duration) return;

      // Calculate playback rate: video duration / seconds in a day
      const rate = duration / SECONDS_IN_DAY;
      // Chrome minimum playbackRate is 0.0625 — we can't go lower
      // So instead: we play at minimum rate and periodically correct position

      // Set to correct position based on current time
      const now = new Date();
      const secondsSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const dayProgress = secondsSinceMidnight / SECONDS_IN_DAY;
      video!.currentTime = dayProgress * duration;

      // Play at slowest possible rate
      video!.playbackRate = 0.0625; // Chrome minimum
      video!.play().catch(() => {});

      // Correct position every 60 seconds to stay in sync
      const interval = setInterval(() => {
        const now = new Date();
        const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const targetTime = (secs / SECONDS_IN_DAY) * duration;
        const currentTime = video!.currentTime;
        const diff = Math.abs(currentTime - targetTime);

        // Only correct if drifted more than 0.1 seconds
        if (diff > 0.1) {
          video!.currentTime = targetTime;
        }
      }, 60_000);

      return interval;
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    function onLoaded() {
      interval = start();
    }

    if (video.readyState >= 1) {
      interval = start();
    } else {
      video.addEventListener("loadedmetadata", onLoaded);
    }

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      if (interval) clearInterval(interval);
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
        loop
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
