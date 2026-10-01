import React from 'react';
import { ArrowUp } from 'lucide-react';

interface TableScrollTopButtonProps {
  entriesPerPage: number;
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
  // Only render if pagination value is 50 or above
  if (entriesPerPage < threshold) return null;

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

  return (
    <button
      type="button"
      onClick={handleScrollToTop}
      title="Scroll table to first row"
      aria-label="Scroll table to first row"
      className={`fixed bottom-10 right-6 sm:right-10 z-50 w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#942392] hover:border-[#942392] dark:hover:border-[#942392] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 hover:scale-110 active:scale-95 group ${className}`}
    >
      <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300 group-hover:text-[#942392] transition-colors" />
    </button>
  );
}
