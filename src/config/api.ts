export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.startsWith("192.168."))
    ? "http://localhost:5000"
    : "http://localhost:5000"); // Update this to your deployed backend URL when ready

