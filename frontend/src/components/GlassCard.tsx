import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = "", style, glow = false, onClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005, y: -1 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      style={style}
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
      <span className="glass-label">{title}</span>
      {badge && (
        <span className={`glass-badge ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
