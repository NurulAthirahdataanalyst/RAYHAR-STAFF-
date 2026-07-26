import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface YearPopoverProps {
  year: string;
  onSelectYear: (year: string) => void;
  className?: string;
}

export function YearPopover({ year, onSelectYear, className }: YearPopoverProps) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const activeYearNum = parseInt(year) || currentYear;
  const [baseDecade, setBaseDecade] = useState(Math.floor(activeYearNum / 10) * 10);

  // Focus on active decade whenever popover opens or year changes
  useEffect(() => {
    if (open) {
      setBaseDecade(Math.floor(activeYearNum / 10) * 10);
    }
  }, [open, year]);

  const yearsList = Array.from({ length: 12 }, (_, i) => baseDecade - 1 + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            className ||
            "appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-9 sm:h-10 gap-3 hover:border-[#7B0099]/40 min-w-[120px]"
          }
        >
          <span className="font-black text-foreground uppercase tracking-widest">{year || currentYear}</span>
          <Calendar className="w-4 h-4 text-muted-foreground opacity-80" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-card z-50"
        align="end"
      >
        {/* Header with Decade Navigation (< 2020 - 2029 >) */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setBaseDecade((prev) => prev - 10)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {baseDecade} – {baseDecade + 9}
          </span>
          <button
            type="button"
            onClick={() => setBaseDecade((prev) => prev + 10)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Column Decade Grid of 12 Years */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {yearsList.map((y) => {
            const isSelected = y.toString() === year || (!year && y === currentYear);
            const isCurrent = y === currentYear;
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onSelectYear(y.toString());
                  setOpen(false);
                }}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center ${
                  isSelected
                    ? "bg-[#7B0099] text-white shadow-sm"
                    : isCurrent
                    ? "border border-[#7B0099] text-[#7B0099] hover:bg-purple-50 dark:hover:bg-purple-950/40"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>

        {/* Footer: Clear on left, This year on right */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              onSelectYear("");
              setOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const cy = new Date().getFullYear().toString();
              onSelectYear(cy);
              setBaseDecade(Math.floor(parseInt(cy) / 10) * 10);
              setOpen(false);
            }}
            className="text-[#0091ff] hover:underline text-[11px] font-bold"
          >
            This year
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
