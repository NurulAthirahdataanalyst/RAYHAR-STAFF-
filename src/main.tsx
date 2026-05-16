import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed - non-critical
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
