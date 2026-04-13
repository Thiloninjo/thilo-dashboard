import { motion } from "framer-motion";

export function ProgressBar({ progress, color = "from-accent to-purple-500" }: {
  progress: number;
  color?: string;
}) {
  return (
    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, progress)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
      />
    </div>
  );
}
