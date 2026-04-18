import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { motion, animate } from "framer-motion";
import * as LucideIcons from "lucide-react";
// Convert kebab-case to PascalCase
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
const RING_SIZE = 96;
const STROKE_WIDTH = 5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
export function HabitRing({ habit, onScore }) {
    const [burst, setBurst] = useState(false);
    const longPressTimer = useRef(null);
    const isLongPress = useRef(false);
    const burstRingRef = useRef(null);
    // Determine visual state
    const isCompleted = habit.completed;
    const isBroken = habit.isAntiHabit && habit.completed; // Anti-habit marked as broken
    const isAntiClean = habit.isAntiHabit && !habit.completed; // Anti-habit still clean
    let strokeColor;
    let fillProgress;
    if (!isCompleted) {
        strokeColor = "rgba(255,255,255,0.08)";
        fillProgress = 0;
    }
    else if (isBroken) {
        strokeColor = "#FF453A";
        fillProgress = 1;
    }
    else {
        strokeColor = "#30D158";
        fillProgress = 1;
    }
    // Anti-habit clean = green ring (show streak as progress hint)
    if (isAntiClean) {
        strokeColor = "#30D158";
        fillProgress = Math.min(1, habit.streak / 7); // Fill proportionally to streak (0-7 days)
    }
    const dashOffset = CIRCUMFERENCE * (1 - fillProgress);
    function triggerBurst() {
        setBurst(true);
        if (burstRingRef.current) {
            animate(burstRingRef.current, { opacity: [0.6, 0] }, { duration: 0.5 });
        }
        setTimeout(() => setBurst(false), 600);
    }
    function handlePointerDown() {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            onScore(habit.id, "down");
        }, 500);
    }
    function handlePointerUp() {
        if (longPressTimer.current)
            clearTimeout(longPressTimer.current);
        if (!isLongPress.current) {
            // Only score up if not already completed (prevents infinite streak)
            if (habit.isAntiHabit) {
                if (!habit.completed) {
                    onScore(habit.id, "up");
                    triggerBurst();
                }
            }
            else {
                if (!habit.completed) {
                    onScore(habit.id, "up");
                    triggerBurst();
                }
            }
        }
    }
    function handlePointerLeave() {
        if (longPressTimer.current)
            clearTimeout(longPressTimer.current);
    }
    const IconComponent = getIconComponent(habit.icon);
    const iconColor = isBroken ? "#FF453A" : isCompleted || isAntiClean ? "#30D158" : "rgba(255,255,255,0.4)";
    return (_jsxs("div", { className: "flex flex-col items-center gap-1 cursor-pointer select-none", onPointerDown: handlePointerDown, onPointerUp: handlePointerUp, onPointerLeave: handlePointerLeave, style: { WebkitTapHighlightColor: "transparent" }, children: [_jsxs("div", { className: "relative", style: { width: RING_SIZE, height: RING_SIZE }, children: [_jsxs("svg", { width: RING_SIZE, height: RING_SIZE, style: { transform: "rotate(-90deg)" }, children: [_jsx("circle", { cx: RING_SIZE / 2, cy: RING_SIZE / 2, r: RADIUS, fill: "none", stroke: "rgba(255,255,255,0.08)", strokeWidth: STROKE_WIDTH }), _jsx(motion.circle, { cx: RING_SIZE / 2, cy: RING_SIZE / 2, r: RADIUS, fill: "none", stroke: strokeColor, strokeWidth: STROKE_WIDTH, strokeLinecap: "round", strokeDasharray: CIRCUMFERENCE, animate: { strokeDashoffset: dashOffset }, transition: { duration: 0.6, ease: "easeOut" }, style: { strokeDashoffset: CIRCUMFERENCE } }), burst && (_jsx("circle", { ref: burstRingRef, cx: RING_SIZE / 2, cy: RING_SIZE / 2, r: RADIUS + 6, fill: "none", stroke: "#30D158", strokeWidth: 2, opacity: 0.6, style: { transform: "scale(1.1)", transformOrigin: "center" } }))] }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", style: { pointerEvents: "none" }, children: _jsx(IconComponent, { size: 28, color: iconColor, strokeWidth: 1.5 }) })] }), _jsx("span", { className: "text-xs font-medium text-center leading-tight", style: {
                    color: isCompleted ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
                    maxWidth: RING_SIZE,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }, children: habit.text }), _jsx("span", { className: "text-xs font-bold", style: { color: isCompleted || isAntiClean ? "#30D158" : "rgba(255,255,255,0.25)" }, children: habit.streak > 0 ? `${habit.streak}🔥` : "—" })] }));
}
