import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "../lib/api";

interface DrehContext {
  isDrehToday: boolean;
  isDrehTomorrow: boolean;
}

export function DrehAlert({ onOpen }: { onOpen: () => void }) {
  const [hasDreh, setHasDreh] = useState(false);

  useEffect(() => {
    const check = () => apiFetch<{ data: DrehContext }>("/calendar/dreh-context")
      .then((r) => setHasDreh(r.data.isDrehToday || r.data.isDrehTomorrow))
      .catch(() => {});
    check();
    const iv = setInterval(check, 5_000);
    return () => clearInterval(iv);
  }, []);

  if (!hasDreh) return null;

  return (
    <motion.button
      onClick={onOpen}
      className="relative flex items-center justify-center w-10 h-10 rounded-full"
      style={{
        background: "rgba(255,59,48,0.2)",
        border: "1px solid rgba(255,59,48,0.4)",
        boxShadow: "0 0 20px rgba(255,59,48,0.3), 0 0 40px rgba(255,59,48,0.15), inset 0 0 8px rgba(255,59,48,0.1)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      animate={{
        boxShadow: [
          "0 0 20px rgba(255,59,48,0.3), 0 0 40px rgba(255,59,48,0.15), inset 0 0 8px rgba(255,59,48,0.1)",
          "0 0 28px rgba(255,59,48,0.5), 0 0 56px rgba(255,59,48,0.25), inset 0 0 8px rgba(255,59,48,0.15)",
          "0 0 20px rgba(255,59,48,0.3), 0 0 40px rgba(255,59,48,0.15), inset 0 0 8px rgba(255,59,48,0.1)",
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="text-[16px] font-black text-red-400" style={{ textShadow: "0 0 8px rgba(255,59,48,0.5)" }}>!</span>
    </motion.button>
  );
}
