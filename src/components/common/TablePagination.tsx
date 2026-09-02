import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const fromIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50 ${className}`}>
      <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest flex-wrap">
        <span>
          TOTAL SHOWING {fromIndex} TO {toIndex} OF {totalItems} ENTRIES
        </span>
        <div className="flex items-center gap-2">
          <span>Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              onPageSizeChange(Number(val));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[65px] bg-white dark:bg-card">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 rounded-md border-gray-200 dark:border-slate-800 bg-white dark:bg-card text-foreground disabled:opacity-40"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">
                ...
              </span>
            );
          }
          const pageNum = page as number;
          const isActive = currentPage === pageNum;
          return (
            <Button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={`h-7 min-w-[28px] px-2 rounded-md text-[11px] font-bold ${
                isActive
                  ? 'bg-[#942392] hover:bg-[#5e0080] text-white border-[#942392]'
                  : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-card text-foreground'
              }`}
            >
              {pageNum}
            </Button>
          );
        })}

        <Button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 rounded-md border-gray-200 dark:border-slate-800 bg-white dark:bg-card text-foreground disabled:opacity-40"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ── CUSTOM DATE PICKER (Purple Theme matching Attendance page) ──
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  displayFormat?: "DD/MM/YYYY" | "DD MMM YYYY";
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select Date",
  className,
  displayFormat = "DD/MM/YYYY",
}) => {
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parts = value.split("-");
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(value);
  }, [value]);

  const formattedText = React.useMemo(() => {
    if (!parsedDate || isNaN(parsedDate.getTime())) return placeholder;
    if (displayFormat === "DD MMM YYYY") {
      return parsedDate
        .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        .toUpperCase();
    }
    const d = String(parsedDate.getDate()).padStart(2, "0");
    const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const y = parsedDate.getFullYear();
    return `${d}/${m}/${y}`;
  }, [parsedDate, displayFormat, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between px-3 py-2 bg-background border border-border rounded-xl text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#942392] focus:ring-1 focus:ring-[#942392] transition-all cursor-pointer h-10 gap-2 font-semibold select-none",
            className
          )}
        >
          <span className="font-semibold uppercase tracking-wide truncate">{formattedText}</span>
          <CalendarDays className="w-4 h-4 text-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 overflow-hidden border-none shadow-2xl rounded-xl bg-card z-[200]" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={(d) => {
            if (d) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              onChange(`${year}-${month}-${day}`);
              setOpen(false);
            } else {
              onChange("");
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

// ── CUSTOM TIME PICKER (Purple Theme matching Date Picker) ──
export interface CustomTimePickerProps {
  value: string; // HH:mm (24-hr format like "09:00" or "14:30")
  onChange: (timeStr: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select Time",
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  // Parse 24-hr HH:mm into 12-hr hour, min, period
  const { hour12, minute, period, display12Hr } = React.useMemo(() => {
    if (!value) {
      return { hour12: 9, minute: 0, period: "AM" as "AM" | "PM", display12Hr: placeholder };
    }
    const [hStr, mStr] = value.split(":");
    let h = parseInt(hStr || "9", 10);
    const m = parseInt(mStr || "0", 10);
    const p: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;

    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${p}`;
    return { hour12: h, minute: m, period: p, display12Hr: formatted };
  }, [value, placeholder]);

  const updateTime = (newHour12: number, newMin: number, newPeriod: "AM" | "PM") => {
    let h24 = newHour12;
    if (newPeriod === "AM") {
      if (h24 === 12) h24 = 0;
    } else {
      if (h24 < 12) h24 += 12;
    }
    const result = `${String(h24).padStart(2, "0")}:${String(newMin).padStart(2, "0")}`;
    onChange(result);
  };

  const handleHourClick = (h: number) => {
    updateTime(h, minute, period);
  };

  const handleMinuteClick = (m: number) => {
    updateTime(hour12, m, period);
  };

  const handlePeriodClick = (p: "AM" | "PM") => {
    updateTime(hour12, minute, p);
  };

  const handleNow = () => {
    const now = new Date();
    const h24 = now.getHours();
    const m = now.getMinutes();
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between px-3 py-2 bg-background border border-border rounded-xl text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#942392] focus:ring-1 focus:ring-[#942392] transition-all cursor-pointer h-10 gap-2 font-semibold select-none",
            className
          )}
        >
          <span className="font-semibold uppercase tracking-wide truncate">{display12Hr}</span>
          <Clock className="w-4 h-4 text-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 overflow-hidden border-border/80 shadow-2xl rounded-xl bg-card z-[200]"
        align="start"
      >
        {/* Header */}
        <div className="bg-[#942392] text-white px-4 py-2.5 text-center font-bold text-sm shadow-sm flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-purple-200">Select Time</span>
          <span className="font-mono text-base font-black">{display12Hr}</span>
        </div>

        {/* Body: 3 columns */}
        <div className="flex p-3 gap-2 divide-x divide-border/40 text-xs">
          {/* Hour */}
          <div className="flex flex-col items-center gap-1 max-h-48 overflow-y-auto px-1">
            <span className="text-[10px] font-bold uppercase text-foreground mb-1">Hour</span>
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleHourClick(h)}
                className={cn(
                  "w-9 h-8 rounded-md font-bold transition-all text-xs flex items-center justify-center cursor-pointer",
                  hour12 === h
                    ? "bg-[#942392] text-white shadow-sm"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* Minute */}
          <div className="flex flex-col items-center gap-1 max-h-48 overflow-y-auto px-2">
            <span className="text-[10px] font-bold uppercase text-foreground mb-1">Min</span>
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleMinuteClick(m)}
                className={cn(
                  "w-9 h-8 rounded-md font-bold transition-all text-xs flex items-center justify-center cursor-pointer",
                  minute === m
                    ? "bg-[#942392] text-white shadow-sm"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {String(m).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* Period */}
          <div className="flex flex-col items-center gap-2 px-2 pt-1">
            <span className="text-[10px] font-bold uppercase text-foreground mb-1">Period</span>
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodClick(p)}
                className={cn(
                  "w-12 h-10 rounded-md font-bold transition-all text-xs flex items-center justify-center cursor-pointer",
                  period === p
                    ? "bg-[#942392] text-white shadow-sm"
                    : "hover:bg-muted text-foreground border border-border/40"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 bg-muted/20">
          <button
            type="button"
            onClick={handleNow}
            className="text-xs font-bold text-[#942392] hover:text-[#5e0080] transition-colors py-1 px-2.5 rounded hover:bg-[#942392]/10 cursor-pointer"
          >
            Now
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-bold text-white bg-[#942392] hover:bg-[#5e0080] transition-colors py-1 px-3 rounded shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};