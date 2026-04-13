import { motion } from "framer-motion";

export function ProfileCard() {
  return (
    <motion.div
      className="relative rounded-[28px]"
      style={{
        height: "180px",
        overflow: "hidden",
        backdropFilter: "blur(16px) brightness(1.12) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) brightness(1.12) saturate(1.4)",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.25), inset 6px 6px 0px -6px rgba(255,255,255,0.7), inset 0 0 8px 1px rgba(255,255,255,0.7)",
        filter: "drop-shadow(0 15px 100px #000000c0) drop-shadow(0 6px 40px #00000090)",
      }}
      whileHover={{ scale: 1.005, y: -1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero image */}
      <img
        src="/hero-thilo.png"
        alt="Thilo"
        className="absolute right-[-10px] top-[5px] h-[180px] object-contain pointer-events-none"
      />
      {/* Dark gradient for text */}
      <div
        className="absolute inset-0 rounded-[28px]"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 40%, transparent 70%)",
        }}
      />
      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 px-5 py-4">
        <div className="text-base font-bold text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,1)" }}>
          Thilo Strübing
        </div>
        <div className="text-[11px] text-white/70 font-medium" style={{ textShadow: "0 1px 6px rgba(0,0,0,1)" }}>
          Video-Editor & Videograf
        </div>
      </div>
    </motion.div>
  );
}
