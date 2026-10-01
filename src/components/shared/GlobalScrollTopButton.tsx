import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function GlobalScrollTopButton() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMounted(true);

    const checkScroll = () => {
      const mainEl = document.querySelector('main');
      const scrollTop = mainEl ? mainEl.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);

      // Top pages (scrollTop <= 150): hide button
      // Scrolled down towards bottom (scrollTop > 150): show button
      setIsVisible(scrollTop > 150);
    };

    checkScroll();

    // Listen with capture to catch scroll events from <main> or any container
    document.addEventListener('scroll', checkScroll, { capture: true, passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      document.removeEventListener('scroll', checkScroll, { capture: true });
      window.removeEventListener('resize', checkScroll);
    };
  }, [location.pathname]);

  // Reset visibility when navigating to a new route
  useEffect(() => {
    setIsVisible(false);
  }, [location.pathname]);

  if (!mounted || !isVisible) return null;

  const handleScrollToTop = () => {
    // Scroll any inner overflow containers to top
    const innerScrollables = document.querySelectorAll('main div, main table');
    innerScrollables.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.scrollTop > 0) {
        htmlEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Scroll main container smoothly back to top right beneath the sticky top navbar
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const buttonContent = (
    <button
      type="button"
      onClick={handleScrollToTop}
      title="Scroll to top"
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[9999] w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-2xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-white hover:bg-[#942392] hover:border-[#942392] dark:hover:border-[#942392] transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer animate-in fade-in zoom-in-75"
    >
      <ArrowUp className="w-5 h-5 text-slate-700 dark:text-slate-200 group-hover:text-white transition-colors" />
    </button>
  );

  return createPortal(buttonContent, document.body);
}
