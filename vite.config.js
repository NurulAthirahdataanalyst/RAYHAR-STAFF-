import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["activity-fiddle-subdued.ngrok-free.dev"],
  },

  plugins: [],

  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
}));
