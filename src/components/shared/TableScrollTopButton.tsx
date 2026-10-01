import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';

interface TableScrollTopButtonProps {
  entriesPerPage?: number;
  threshold?: number; // Default 50
  tableRef?: React.RefObject<HTMLElement | null>;
  onClick?: () => void;
  className?: string;
}

export function TableScrollTopButton({
  entriesPerPage,
  threshold = 50,
  tableRef,
  onClick,
  className = ""
}: TableScrollTopButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkScroll = () => {
      const mainEl = document.querySelector('main');
      const scrollTop = mainEl ? mainEl.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
      const scrollHeight = mainEl ? mainEl.scrollHeight : (document.documentElement.scrollHeight || 0);
      const clientHeight = mainEl ? mainEl.clientHeight : (window.innerHeight || 0);

      // Only show when scrolled down away from the top of the page (e.g. > 150px)
      const isScrolledDown = scrollTop > 150;
      const isNearBottom = (scrollTop + clientHeight) >= (scrollHeight - 250);

      // Check pagination threshold if entriesPerPage is passed
      const isEligible = entriesPerPage === undefined || entriesPerPage >= threshold || isNearBottom;

      setIsVisible(isScrolledDown && isEligible);
    };

    // Run initial check
    checkScroll();

    // Listen with capture to catch scroll events from <main> or any container
    document.addEventListener('scroll', checkScroll, { capture: true, passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      document.removeEventListener('scroll', checkScroll, { capture: true });
      window.removeEventListener('resize', checkScroll);
    };
  }, [entriesPerPage, threshold]);

  if (!mounted || !isVisible) return null;

  const handleScrollToTop = () => {
    if (onClick) {
      onClick();
      return;
    }

    // 1. Resolve table element: from ref, or fallback to the closest table in the DOM
    const el = (tableRef && tableRef.current) 
      ? tableRef.current 
      : (document.querySelector('table') as HTMLElement | null);

    if (el) {
      // 2. Scroll inner overflow container to top if present
      let parent: HTMLElement | null = el.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement && parent.tagName !== 'MAIN') {
        const style = window.getComputedStyle(parent);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        }
        parent = parent.parentElement;
      }

      // 3. Scroll the main container (AppLayout <main>) or window so table header is positioned below sticky navbar
      const mainContainer = document.querySelector('main');
      if (mainContainer && mainContainer.scrollHeight > mainContainer.clientHeight) {
        const elRect = el.getBoundingClientRect();
        const mainRect = mainContainer.getBoundingClientRect();
        const navbarOffset = 70; // Height of sticky top desktop header
        const targetScroll = mainContainer.scrollTop + (elRect.top - mainRect.top) - navbarOffset;

        mainContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const mainContainer = document.querySelector('main');
      if (mainContainer) {
        mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const buttonContent = (
    <button
      type="button"
      onClick={handleScrollToTop}
      title="Scroll to top"
      aria-label="Scroll to top"
      className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[9999] w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-2xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-white hover:bg-[#942392] hover:border-[#942392] dark:hover:border-[#942392] transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer animate-in fade-in zoom-in-75 ${className}`}
    >
      <ArrowUp className="w-5 h-5 text-slate-700 dark:text-slate-200 group-hover:text-white transition-colors" />
    </button>
  );

  return createPortal(buttonContent, document.body);
}
