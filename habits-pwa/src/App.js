import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "./lib/api";
import { HabitRing } from "./components/HabitRing";
import { AddHabit } from "./components/AddHabit";
export function App() {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    async function fetchHabits() {
        try {
            const res = await apiFetch("/habits");
            setHabits(res.data);
        }
        catch (err) {
            console.error("Failed to fetch habits", err);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        fetchHabits();
    }, []);
    async function handleScore(id, direction) {
        // Optimistic: only toggle completed state, don't touch streak
        setHabits((prev) => prev.map((h) => {
            if (h.id !== id)
                return h;
            return { ...h, completed: direction === "up" };
        }));
        try {
            const res = await apiFetch(`/habits/${id}/score`, {
                method: "POST",
                body: JSON.stringify({ direction }),
            });
            // Always use server response (has correct streak calculations)
            setHabits(res.data);
        }
        catch (err) {
            console.error("Score failed, reverting", err);
            await fetchHabits();
        }
    }
    async function handleAddHabit(habit) {
        try {
            await apiFetch("/habits", {
                method: "PUT",
                body: JSON.stringify(habit),
            });
            await fetchHabits();
        }
        catch (err) {
            console.error("Add habit failed", err);
        }
    }
    const totalHabits = habits.length;
    const completedHabits = habits.filter((h) => {
        if (h.isAntiHabit)
            return !h.completed; // Anti-habit "completed" = clean
        return h.completed;
    }).length;
    const progressPct = totalHabits > 0 ? completedHabits / totalHabits : 0;
    const comboStreak = habits.length > 0 ? Math.min(...habits.map((h) => h.streak)) : 0;
    // Grid columns: 3 unless fewer habits
    const gridCols = totalHabits < 3 ? totalHabits || 1 : 3;
    return (_jsxs("div", { className: "min-h-screen flex flex-col", style: { background: "#0a0a0f", color: "white" }, children: [_jsxs("div", { className: "px-5 pb-4", style: { paddingTop: "calc(env(safe-area-inset-top, 20px) + 16px)" }, children: [_jsxs("div", { className: "flex items-end justify-between mb-1", children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "Streaks" }), comboStreak > 0 && (_jsxs("span", { className: "text-sm font-semibold px-3 py-1 rounded-full", style: { background: "rgba(48,209,88,0.15)", color: "#30D158" }, children: ["\uD83D\uDD25 ", comboStreak, " Combo"] }))] }), _jsxs("p", { className: "text-sm", style: { color: "rgba(255,255,255,0.4)" }, children: [completedHabits, " / ", totalHabits, " erledigt"] }), _jsx("div", { className: "mt-3 rounded-full overflow-hidden", style: { height: 4, background: "rgba(255,255,255,0.08)" }, children: _jsx(motion.div, { className: "h-full rounded-full", style: { background: "linear-gradient(90deg, #30D158, #7DFFAA)" }, animate: { width: `${progressPct * 100}%` }, transition: { duration: 0.5, ease: "easeOut" } }) })] }), _jsx("div", { className: "flex-1 px-5 py-4", children: loading ? (_jsx("div", { className: "flex items-center justify-center py-20 text-sm", style: { color: "rgba(255,255,255,0.3)" }, children: "Laden..." })) : habits.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 gap-3", style: { color: "rgba(255,255,255,0.3)" }, children: [_jsx("span", { className: "text-4xl", children: "\uD83C\uDF31" }), _jsx("p", { className: "text-sm", children: "Noch keine Habits" })] })) : (_jsx("div", { className: "grid gap-6", style: { gridTemplateColumns: `repeat(${gridCols}, 1fr)` }, children: habits.map((habit) => (_jsx("div", { className: "flex justify-center", children: _jsx(HabitRing, { habit: habit, onScore: handleScore }) }, habit.id))) })) }), _jsx("div", { className: "px-5 pt-4", style: { borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 16px)" }, children: _jsx("button", { onClick: () => setAddOpen(true), className: "w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95", style: {
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.7)",
                    }, children: "+ Habit hinzuf\u00FCgen" }) }), _jsx(AddHabit, { open: addOpen, onClose: () => setAddOpen(false), onSave: handleAddHabit })] }));
}
