import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: "/habits/",
    build: {
        outDir: "../backend/public/habits",
        emptyOutDir: true,
    },
    server: {
        port: 5174,
        proxy: {
            "/api": "http://localhost:3001",
        },
    },
});
