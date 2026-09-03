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
    if (tableRef && tableRef.current) {
      const el = tableRef.current;
      // Scroll nearest overflow container if scrollable
      let parent: HTMLElement | null = el.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        }
        parent = parent.parentElement;
      }
      // Scroll table top into view
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
