import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <PopoverContent className="w-auto p-0 overflow-hidden border-none shadow-2xl rounded-xl bg-card" align="start">
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
