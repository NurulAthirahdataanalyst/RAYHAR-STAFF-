import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";

interface YearPopoverProps {
  year: string;
  onSelectYear: (year: string) => void;
  className?: string;
}

export function YearPopover({ year, onSelectYear, className }: YearPopoverProps) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const displayYear = year || currentYear.toString();

  // Generate range of years (from 2020 to 2035)
  const years = Array.from({ length: 16 }, (_, i) => 2020 + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            className ||
            "appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 gap-2 hover:border-[#7B0099]/40 min-w-[120px]"
          }
        >
          <span>{displayYear}</span>
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-0 rounded-md border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-card z-50 overflow-hidden"
        align="end"
      >
        {/* Grey Header Banner matching Month Picker */}
        <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
          {displayYear}
        </div>

        {/* Scrollable Year List matching Month Picker Popover */}
        <div className="p-1 max-h-48 overflow-y-auto space-y-0.5">
          {years.map((y) => {
            const isSelected = y.toString() === year || (!year && y === currentYear);
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onSelectYear(y.toString());
                  setOpen(false);
                }}
                className={`w-full py-1.5 px-3 text-xs text-left transition-colors rounded ${
                  isSelected
                    ? "bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 font-bold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>

        {/* Footer matching Month Picker: Clear on left, This year on right */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => {
              onSelectYear("");
              setOpen(false);
            }}
            className="text-[#0091ff] hover:underline text-xs font-medium"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const cy = new Date().getFullYear().toString();
              onSelectYear(cy);
              setOpen(false);
            }}
            className="text-[#0091ff] hover:underline text-xs font-medium"
          >
            This year
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
