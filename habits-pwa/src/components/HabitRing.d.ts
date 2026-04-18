import type { HabitItem } from "../lib/types";
interface Props {
    habit: HabitItem;
    onScore: (id: string, direction: "up" | "down") => void;
}
export declare function HabitRing({ habit, onScore }: Props): import("react/jsx-runtime").JSX.Element;
export {};
