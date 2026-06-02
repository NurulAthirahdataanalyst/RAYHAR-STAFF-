import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function PageLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Show loader on route change
    setShouldRender(true);
    setVisible(true);

    const fadeOutTimer = setTimeout(() => {
      setVisible(false);
    }, 450); // Keep loader fully visible for a brief moment to feel ultra-responsive

    const removeTimer = setTimeout(() => {
      setShouldRender(false);
    }, 750); // Wait for transition fade-out to complete

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
    };
  }, [location.pathname, location.search, location.hash]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/20 dark:bg-slate-950/45 backdrop-blur-md transition-all duration-300 ease-in-out ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="flex flex-col items-center gap-4 bg-white/80 dark:bg-slate-900/60 p-7 px-9 rounded-[32px] border border-white/40 dark:border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="w-14 h-14 drop-shadow-[0_8px_16px_rgba(123,0,153,0.3)]">
          {/* Custom clock SVG provided by the user */}
          <svg fill="#7B0099" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9,9,0,0,1,12,21Z"/>
            <rect x="11" y="6" rx="1" width="2" height="7">
              <animateTransform attributeName="transform" type="rotate" dur="9s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
            </rect>
            <rect x="11" y="11" rx="1" width="2" height="9">
              <animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
            </rect>
          </svg>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#7B0099] dark:text-[#a855f7] animate-pulse">
            Loading
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
            Rayhar Portal
          </p>
        </div>
      </div>
    </div>
  );
}
