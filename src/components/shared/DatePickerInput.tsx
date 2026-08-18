import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePickerInput({ value, onChange, placeholder = "Select date", minDate, className, disabled }: DatePickerInputProps) {
  const date = value ? new Date(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "appearance-none flex w-full items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-foreground text-[11px] sm:text-xs font-black rounded-2xl shadow-sm outline-none cursor-pointer uppercase tracking-widest h-12 sm:h-14 gap-3 hover:border-[#7B0099]/40",
            !date && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <span>{date ? format(date, "dd/MM/yyyy") : placeholder}</span>
          <CalendarIcon className="w-4 h-4 text-muted-foreground opacity-80" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 overflow-hidden rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card z-50" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              const adjustedDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
              onChange(adjustedDate.toISOString().split("T")[0]);
            }
          }}
          disabled={(d) => {
            if (!minDate) return false;
            const compareDate = new Date(d);
            compareDate.setHours(0, 0, 0, 0);
            const min = new Date(minDate);
            min.setHours(0, 0, 0, 0);
            return compareDate < min;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
