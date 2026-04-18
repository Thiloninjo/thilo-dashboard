interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (habit: {
        id: string;
        text: string;
        icon: string;
        type: "positive" | "negative";
    }) => void;
}
export declare function AddHabit({ open, onClose, onSave }: Props): import("react/jsx-runtime").JSX.Element;
export {};
