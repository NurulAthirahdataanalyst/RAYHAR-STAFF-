import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface MonthPickerProps {
  monthYear: string; // "YYYY-MM"
  onSelectMonthYear: (value: string) => void;
  className?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthPicker({ monthYear, onSelectMonthYear, className }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  
  const currentDate = new Date();
  const currentYearNum = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();

  // Parse selected
  const [selectedYear, selectedMonthStr] = monthYear ? monthYear.split('-') : [currentYearNum.toString(), (currentMonthIdx + 1).toString().padStart(2, '0')];
  const activeYearNum = parseInt(selectedYear) || currentYearNum;
  const activeMonthIdx = (parseInt(selectedMonthStr) || (currentMonthIdx + 1)) - 1;

  const [viewYear, setViewYear] = useState(activeYearNum);

  useEffect(() => {
    if (open) {
      setViewYear(activeYearNum);
    }
  }, [open, activeYearNum]);

  const displayString = `${MONTHS[activeMonthIdx]} ${activeYearNum}`;

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
          <span className="font-black text-foreground uppercase tracking-widest">{displayString}</span>
          <CalendarDays className="w-4 h-4 text-muted-foreground opacity-80" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-card z-50 overflow-hidden"
        align="start"
      >
        {/* Purple Header */}
        <div className="flex items-center justify-between bg-[#7B0099] text-white p-3 pt-4 pb-4">
          <button
            type="button"
            onClick={() => setViewYear((prev) => prev - 1)}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold tracking-wide">
            {viewYear}
          </span>
          <button
            type="button"
            onClick={() => setViewYear((prev) => prev + 1)}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 pt-4 pb-2">
          {/* 3x4 Grid of Months */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {MONTHS.map((m, idx) => {
              const isSelected = viewYear === activeYearNum && idx === activeMonthIdx;
              
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    const monthStr = (idx + 1).toString().padStart(2, '0');
                    onSelectMonthYear(`${viewYear}-${monthStr}`);
                    setOpen(false);
                  }}
                  className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center ${
                    isSelected
                      ? "bg-[#7B0099] text-white shadow-sm"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                const monthStr = (currentMonthIdx + 1).toString().padStart(2, '0');
                onSelectMonthYear(`${currentYearNum}-${monthStr}`);
                setViewYear(currentYearNum);
                setOpen(false);
              }}
              className="text-[#0091ff] hover:underline text-[11px] font-bold"
            >
              This month
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectMonthYear(""); // clear
                setOpen(false);
              }}
              className="text-[#7B0099] hover:underline text-[11px] font-bold"
            >
              All year
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
