import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../lib/api";

interface InboxResult {
  intent: { type: string; content: string; time?: string; date?: string };
  success: boolean;
  message: string;
}

export function CommandBar() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout>>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setFeedback(null);

    try {
      const result = await apiFetch<InboxResult>("/inbox", {
        method: "POST",
        body: JSON.stringify({ text: text.trim() }),
      });

      setFeedback({ message: result.message, success: result.success });
      if (result.success) setText("");
    } catch {
      setFeedback({ message: "Verbindung fehlgeschlagen", success: false });
    } finally {
      setLoading(false);
      inputRef.current?.focus();

      // Clear feedback after 4 seconds
      clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = setTimeout(() => setFeedback(null), 4000);
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
      {/* Feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`px-4 py-2 rounded-2xl text-sm font-medium backdrop-blur-xl ${
              feedback.success
                ? "bg-success/20 text-success border border-success/30"
                : "bg-danger/20 text-danger border border-danger/30"
            }`}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command input pill */}
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-full"
          style={{
            backdropFilter: "blur(30px) saturate(200%)",
            WebkitBackdropFilter: "blur(30px) saturate(200%)",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 0 12px -4px rgba(255,255,255,0.15)",
            minWidth: "500px",
          }}
        >
          <span className="text-white/30 text-sm select-none">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Neue To-Do, Neuer Termin, Planks gemacht..."
            className="flex-1 bg-transparent text-white text-sm font-medium placeholder:text-white/25 focus:outline-none"
            disabled={loading}
          />
          {text.trim() && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              type="submit"
              disabled={loading}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                loading
                  ? "bg-white/10 text-white/30"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {loading ? "..." : "↵"}
            </motion.button>
          )}
        </div>
      </form>
    </div>
  );
}
