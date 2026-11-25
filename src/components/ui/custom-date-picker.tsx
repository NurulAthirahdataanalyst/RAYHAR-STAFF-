import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  displayFormat?: "DD/MM/YYYY" | "DD MMM YYYY";
}

function parseLocalDate(val?: string): Date | undefined {
  if (!val) return undefined;
  const clean = val.slice(0, 10);
  const parts = clean.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const d = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(val);
  if (isNaN(fallback.getTime())) return undefined;
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select Date",
  minDate,
  maxDate,
  disabled = false,
  className,
  displayFormat = "DD/MM/YYYY",
}) => {
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => parseLocalDate(value), [value]);
  const parsedMinDate = React.useMemo(() => parseLocalDate(minDate), [minDate]);
  const parsedMaxDate = React.useMemo(() => parseLocalDate(maxDate), [maxDate]);

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
    <Popover open={open} onOpenChange={(next) => { if (!disabled) setOpen(next); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center justify-between px-3 py-2 bg-background border border-border rounded-xl text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#942392] focus:ring-1 focus:ring-[#942392] transition-all cursor-pointer h-10 gap-2 font-semibold select-none",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <span className={cn("truncate", !parsedDate ? "text-muted-foreground font-normal normal-case" : "font-semibold uppercase tracking-wide")}>
            {formattedText}
          </span>
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 overflow-hidden border-none shadow-2xl rounded-xl bg-card z-[100000]" style={{ zIndex: 100000 }} align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          defaultMonth={parsedDate || parsedMinDate}
          disabled={(d) => {
            const compareDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            if (parsedMinDate && compareDate < parsedMinDate) return true;
            if (parsedMaxDate && compareDate > parsedMaxDate) return true;
            return false;
          }}
          onSelect={(d) => {
            if (d) {
              const compareDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
              if (parsedMinDate && compareDate < parsedMinDate) return;
              if (parsedMaxDate && compareDate > parsedMaxDate) return;
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
