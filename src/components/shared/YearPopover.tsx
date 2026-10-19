import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface YearPopoverProps {
  year: string;
  onSelectYear: (year: string) => void;
  className?: string;
  minYear?: number;
  excludeYear?: string;
  iconPosition?: "left" | "right";
}

export function YearPopover({
  year,
  onSelectYear,
  className,
  minYear,
  excludeYear,
  iconPosition = "right",
}: YearPopoverProps) {
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
          className={cn(
            "appearance-none inline-flex items-center justify-between px-3 py-2 bg-card border border-gray-200 dark:border-slate-800 text-foreground text-xs font-semibold rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-wider h-9 gap-2.5 hover:border-[#942392]/40 min-w-[110px] transition-all",
            className
          )}
        >
          {iconPosition === "left" && (
            <Calendar className="w-4 h-4 text-foreground/80 shrink-0 mr-1" />
          )}
          <span className="font-bold text-foreground text-xs uppercase tracking-wider">
            {year || currentYear}
          </span>
          {iconPosition !== "left" && (
            <Calendar className="w-4 h-4 text-foreground/80 shrink-0 ml-1" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl bg-card z-[100] overflow-hidden"
        align="end"
      >
        {/* Header with Decade Navigation (< 2020 - 2029 >) */}
        <div className="flex items-center justify-between bg-[#942392] text-white p-3 pt-4 pb-4">
          <button
            type="button"
            onClick={() => setBaseDecade((prev) => prev - 10)}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold tracking-wide">
            {baseDecade} - {baseDecade + 9}
          </span>
          <button
            type="button"
            onClick={() => setBaseDecade((prev) => prev + 10)}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 pt-4 pb-2">
          {/* 3-Column Decade Grid of 12 Years */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {yearsList.map((y) => {
              const isSelected = y.toString() === year || (!year && y === currentYear);
              const isCurrent = y === currentYear;
              const isOutsideDecade = y < baseDecade || y > baseDecade + 9;
              const isDisabled =
                (minYear !== undefined && y < minYear) ||
                (excludeYear !== undefined && y.toString() === excludeYear);

              return (
                <button
                  key={y}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) {
                      onSelectYear(y.toString());
                      setOpen(false);
                    }
                  }}
                  className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center ${
                    isDisabled
                      ? "opacity-30 cursor-not-allowed bg-transparent text-slate-400"
                      : isSelected && isCurrent
                      ? "bg-[#942392] text-white shadow-sm ring-2 ring-[#FFB800]"
                      : isSelected
                      ? "bg-[#942392] text-white shadow-sm"
                      : isCurrent
                      ? "bg-[#FFB800]/20 text-[#942392] dark:text-amber-300 font-black border border-[#FFB800]"
                      : isOutsideDecade
                      ? "text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>

          {/* Footer: This year on left, Clear on right */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                const cy = new Date().getFullYear().toString();
                onSelectYear(cy);
                setBaseDecade(Math.floor(parseInt(cy) / 10) * 10);
                setOpen(false);
              }}
              className="text-[#942392] dark:text-fuchsia-400 hover:underline text-[11px] font-bold"
            >
              This Year
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectYear("");
                setOpen(false);
              }}
              className="text-slate-500 hover:text-red-500 hover:underline text-[11px] font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
