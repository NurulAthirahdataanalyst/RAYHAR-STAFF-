import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
        className="w-auto p-0 overflow-hidden border-border/80 shadow-2xl rounded-xl bg-card z-[150]"
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
