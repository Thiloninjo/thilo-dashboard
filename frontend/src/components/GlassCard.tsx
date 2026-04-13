import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = "", glow = false, onClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`
        liquid-glass p-5
        ${glow ? "shadow-[0_0_40px_rgba(0,122,255,0.12)]" : ""}
        ${onClick ? "liquid-glass-interactive" : ""}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ title, badge, badgeColor = "text-accent" }: {
  title: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-[10px] uppercase tracking-[1.2px] text-text-muted font-semibold">{title}</span>
      {badge && (
        <span className={`text-[10px] px-2 py-0.5 rounded-md bg-white/5 ${badgeColor} font-semibold`}>
          {badge}
        </span>
      )}
    </div>
  );
}
