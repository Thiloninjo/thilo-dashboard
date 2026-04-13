import { motion } from "framer-motion";

export function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="flex-shrink-0 relative">
      <motion.div
        animate={
          checked
            ? { backgroundColor: "#10b981", borderColor: "#10b981", scale: [1, 1.2, 1] }
            : { backgroundColor: "transparent", borderColor: "#475569", scale: 1 }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center"
      >
        {checked && (
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.05 }}
            className="text-white text-[11px] font-bold"
          >
            ✓
          </motion.span>
        )}
      </motion.div>
      {/* Success ring burst */}
      {checked && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0.6 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 border-success pointer-events-none"
        />
      )}
    </button>
  );
}
