import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if ((props as any).onSelect) {
      // @ts-ignore
      props.onSelect(undefined, undefined, undefined, e);
    }
  };

  const handleToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
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

  const customFooter = (
    <div className="flex items-center justify-between pt-2 px-1 border-t border-border/40 mt-3 w-full">
      <button
        onClick={handleClear}
        className="text-xs font-semibold text-foreground hover:text-foreground transition-colors py-1 px-2.5 rounded hover:bg-muted cursor-pointer bg-transparent border-none"
        type="button"
      >
        Clear
      </button>
      <button
        onClick={handleToday}
        className="text-xs font-bold text-[#7B0099] hover:text-[#5e0080] transition-colors py-1 px-2.5 rounded hover:bg-[#7B0099]/10 cursor-pointer bg-transparent border-none"
        type="button"
      >
        Today
      </button>
    </div>
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-2 pb-2 relative items-center bg-[#7B0099] text-white -mt-3 -mx-3 mb-2 shadow-sm",
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
          "bg-[#7B0099] text-white hover:bg-[#5e0080] hover:text-white focus:bg-[#7B0099] focus:text-white rounded-md",
        day_today: "bg-[#FFFE00] text-[#7B0099] font-bold rounded-md",
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
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
