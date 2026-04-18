import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
const ICON_OPTIONS = [
    "dumbbell", "moon", "pill", "heart", "apple", "droplet", "sun", "book-open",
    "brain", "coffee", "ban", "cigarette", "beer", "candy", "flame", "footprints",
    "bike", "bed", "alarm-clock", "pen-line", "music", "eye", "smile", "zap",
];
function toPascalCase(str) {
    return str
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}
function getIconComponent(iconName) {
    const pascalName = toPascalCase(iconName);
    const icons = LucideIcons;
    return icons[pascalName] ?? icons["HelpCircle"] ?? (() => null);
}
export function AddHabit({ open, onClose, onSave }) {
    const [text, setText] = useState("");
    const [type, setType] = useState("positive");
    const [selectedIcon, setSelectedIcon] = useState("dumbbell");
    function handleSave() {
        if (!text.trim())
            return;
        const id = text.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        onSave({ id, text: text.trim(), icon: selectedIcon, type });
        // Reset state
        setText("");
        setType("positive");
        setSelectedIcon("dumbbell");
        onClose();
    }
    return (_jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { className: "fixed inset-0 z-40", style: { background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }, initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose }), _jsxs(motion.div, { className: "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl", style: {
                        background: "rgba(20,20,30,0.98)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderBottom: "none",
                        paddingBottom: "env(safe-area-inset-bottom, 20px)",
                    }, initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: { type: "spring", damping: 30, stiffness: 300 }, children: [_jsx("div", { className: "flex justify-center pt-3 pb-1", children: _jsx("div", { className: "rounded-full", style: { width: 40, height: 4, background: "rgba(255,255,255,0.2)" } }) }), _jsxs("div", { className: "px-5 pb-6 pt-2 flex flex-col gap-5", children: [_jsx("h2", { className: "text-white font-semibold text-lg", children: "Habit hinzuf\u00FCgen" }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium mb-1.5 block", style: { color: "rgba(255,255,255,0.5)" }, children: "Name" }), _jsx("input", { type: "text", placeholder: "z.B. Meditation...", value: text, onChange: (e) => setText(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSave(), className: "w-full rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none text-sm", style: {
                                                background: "rgba(255,255,255,0.08)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                            }, autoFocus: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium mb-1.5 block", style: { color: "rgba(255,255,255,0.5)" }, children: "Typ" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setType("positive"), className: "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all", style: {
                                                        background: type === "positive" ? "rgba(48,209,88,0.2)" : "rgba(255,255,255,0.06)",
                                                        border: `1px solid ${type === "positive" ? "#30D158" : "rgba(255,255,255,0.1)"}`,
                                                        color: type === "positive" ? "#30D158" : "rgba(255,255,255,0.5)",
                                                    }, children: "Positiv" }), _jsx("button", { onClick: () => setType("negative"), className: "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all", style: {
                                                        background: type === "negative" ? "rgba(255,69,58,0.2)" : "rgba(255,255,255,0.06)",
                                                        border: `1px solid ${type === "negative" ? "#FF453A" : "rgba(255,255,255,0.1)"}`,
                                                        color: type === "negative" ? "#FF453A" : "rgba(255,255,255,0.5)",
                                                    }, children: "Negativ (Anti-Habit)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium mb-1.5 block", style: { color: "rgba(255,255,255,0.5)" }, children: "Icon" }), _jsx("div", { className: "grid grid-cols-8 gap-2", children: ICON_OPTIONS.map((iconName) => {
                                                const Icon = getIconComponent(iconName);
                                                const isSelected = selectedIcon === iconName;
                                                return (_jsx("button", { onClick: () => setSelectedIcon(iconName), className: "flex items-center justify-center rounded-xl aspect-square transition-all", style: {
                                                        background: isSelected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                                                        border: `1px solid ${isSelected ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                                                    }, children: _jsx(Icon, { size: 18, color: isSelected ? "white" : "rgba(255,255,255,0.45)", strokeWidth: 1.5 }) }, iconName));
                                            }) })] }), _jsx("button", { onClick: handleSave, disabled: !text.trim(), className: "w-full py-3.5 rounded-2xl text-sm font-semibold transition-all", style: {
                                        background: text.trim()
                                            ? "linear-gradient(135deg, #30D158, #7DFFAA)"
                                            : "rgba(255,255,255,0.08)",
                                        color: text.trim() ? "#0a0a0f" : "rgba(255,255,255,0.25)",
                                        cursor: text.trim() ? "pointer" : "not-allowed",
                                    }, children: "Speichern" })] })] })] })) }));
}
