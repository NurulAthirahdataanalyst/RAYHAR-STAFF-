import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["activity-fiddle-subdued.ngrok-free.dev"],
  },

  plugins: [react()],

  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          recharts: ["recharts"],
          leaflet: ["leaflet", "react-leaflet"],
          lucide: ["lucide-react"],
        },
      },
    },
  },
}));
