import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const getInitialDate = () => {
    if (props.selected instanceof Date && !isNaN(props.selected.getTime())) {
      return props.selected;
    }
    if (props.selected && typeof props.selected === "object" && "from" in props.selected && (props.selected as any).from instanceof Date) {
      return (props.selected as any).from;
    }
    if (props.month instanceof Date && !isNaN(props.month.getTime())) {
      return props.month;
    }
    if (props.defaultMonth instanceof Date && !isNaN(props.defaultMonth.getTime())) {
      return props.defaultMonth;
    }
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    const init = getInitialDate();
    return new Date(init.getFullYear(), init.getMonth(), 1);
  });

  const [dateInputStr, setDateInputStr] = React.useState<string>(() => {
    const init = getInitialDate();
    const d = String(init.getDate()).padStart(2, "0");
    const m = String(init.getMonth() + 1).padStart(2, "0");
    const y = init.getFullYear();
    return `${d}/${m}/${y}`;
  });

  // Sync with props.selected whenever it changes from parent
  React.useEffect(() => {
    let selDate: Date | undefined;
    if (props.selected instanceof Date && !isNaN(props.selected.getTime())) {
      selDate = props.selected;
    } else if (typeof props.selected === "string") {
      const parsed = new Date(props.selected);
      if (!isNaN(parsed.getTime())) selDate = parsed;
    } else if (props.selected && typeof props.selected === "object" && "from" in props.selected && (props.selected as any).from instanceof Date) {
      selDate = (props.selected as any).from;
    }

    if (selDate && !isNaN(selDate.getTime())) {
      const d = String(selDate.getDate()).padStart(2, "0");
      const m = String(selDate.getMonth() + 1).padStart(2, "0");
      const y = selDate.getFullYear();
      setDateInputStr(`${d}/${m}/${y}`);
      setCurrentMonth(new Date(selDate.getFullYear(), selDate.getMonth(), 1));
    }
  }, [props.selected]);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDateInputStr("");
    if ((props as any).onSelect) {
      // @ts-ignore
      props.onSelect(undefined, undefined, undefined, e);
    }
  };

  const handleToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    const d = String(today.getDate()).padStart(2, "0");
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const y = today.getFullYear();
    setDateInputStr(`${d}/${m}/${y}`);
    const monthFirst = new Date(y, today.getMonth(), 1);
    setCurrentMonth(monthFirst);
    props.onMonthChange?.(monthFirst);
    if ((props as any).onSelect) {
      if (props.mode === "range") {
        // @ts-ignore
        props.onSelect({ from: today, to: today }, today, undefined, e);
      } else {
        // @ts-ignore
        props.onSelect(today, today, undefined, e);
      }
    }
  };

  const handleDaySelect = (day: any, selectedDay: any, activeModifiers: any, e: any) => {
    let selDate: Date | undefined;
    if (day instanceof Date && !isNaN(day.getTime())) {
      selDate = day;
    } else if (day && typeof day === "object" && "from" in day && day.from instanceof Date) {
      selDate = day.from;
    }
    if (selDate) {
      const d = String(selDate.getDate()).padStart(2, "0");
      const m = String(selDate.getMonth() + 1).padStart(2, "0");
      const y = selDate.getFullYear();
      setDateInputStr(`${d}/${m}/${y}`);
    }
    // @ts-ignore
    props.onSelect?.(day, selectedDay, activeModifiers, e);
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.length < dateInputStr.length) {
      setDateInputStr(raw);
      return;
    }
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) {
      setDateInputStr(digits);
    } else if (digits.length <= 4) {
      setDateInputStr(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setDateInputStr(`${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`);
    }
  };

  const handleApply = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const clean = dateInputStr.trim();
    const parts = clean.split("/").map(Number);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
          const target = new Date(year, month - 1, day, 12, 0, 0);
          if (target.getFullYear() === year && target.getMonth() === month - 1 && target.getDate() === day) {
            const newMonth = new Date(year, month - 1, 1);
            setCurrentMonth(newMonth);
            props.onMonthChange?.(newMonth);
            if (props.mode === "range") {
              // @ts-ignore
              props.onSelect?.({ from: target, to: target }, target, undefined, e as any);
            } else {
              // @ts-ignore
              props.onSelect?.(target, target, undefined, e as any);
            }
          }
        }
      }
    }
  };

  const customFooter = (
    <div className="pt-2 px-1 border-t border-border/40 mt-2.5 w-full space-y-2">
      {/* Top action row: Clear and Today */}
      <div className="flex items-center justify-between text-xs px-0.5">
        <button
          onClick={handleClear}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-0.5 px-1.5 rounded hover:bg-muted cursor-pointer bg-transparent border-none"
          type="button"
        >
          Clear
        </button>
        <button
          onClick={handleToday}
          className="text-xs font-bold text-[#942392] dark:text-[#f885d5] hover:text-[#5e0080] transition-colors py-0.5 px-1.5 rounded hover:bg-[#942392]/10 cursor-pointer bg-transparent border-none"
          type="button"
        >
          Today
        </button>
      </div>

      {/* Date input row: [ DD/MM/YYYY ] [ Apply ] */}
      <div className="flex items-center gap-1.5 w-full">
        <div className="relative flex-1 flex items-center bg-background border border-border/80 focus-within:border-[#942392] focus-within:ring-1 focus-within:ring-[#942392]/20 rounded-xl px-2.5 h-8.5 transition-all shadow-2xs">
          <input
            type="text"
            placeholder="DD/MM/YYYY"
            value={dateInputStr}
            onChange={handleDateInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleApply(e);
              }
            }}
            className="w-full text-xs font-mono font-bold bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50 placeholder:font-normal placeholder:font-mono"
            maxLength={10}
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          className="h-8.5 px-3.5 rounded-xl bg-[#942392] hover:bg-[#800A7A] active:scale-95 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 uppercase tracking-wider"
        >
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-2 pb-2 relative items-center bg-[#942392] text-white -mt-3 -mx-3 mb-2 shadow-sm rounded-t-md",
        caption_label: "text-sm font-bold text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent border-transparent text-white p-0 opacity-70 hover:opacity-100 hover:bg-white/10 hover:text-white",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full justify-between",
        head_cell: "text-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full justify-between mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#942392] text-white hover:bg-[#5e0080] hover:text-white focus:bg-[#942392] focus:text-white rounded-md",
        day_today: "bg-[#FFFE00] text-[#942392] font-bold rounded-md",
        day_outside:
          "day-outside text-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-foreground aria-selected:opacity-30",
        day_disabled: "text-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      footer={props.footer || customFooter}
      {...props}
      month={props.month || currentMonth}
      onMonthChange={(m) => {
        setCurrentMonth(m);
        props.onMonthChange?.(m);
      }}
      onSelect={handleDaySelect}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
