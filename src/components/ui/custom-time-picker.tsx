import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Keyboard, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomTimePickerProps {
  value: string; // HH:mm (24-hr format like "09:00" or "14:30")
  onChange: (timeStr: string) => void;
  placeholder?: string;
  className?: string;
}

const ITEM_HEIGHT = 36;
const HOURS_LIST = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => i);

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select Time",
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  // Formatted 12-hr display for trigger button
  const display12Hr = React.useMemo(() => {
    if (!value) return placeholder;
    const [hStr, mStr] = value.split(":");
    let h = parseInt(hStr || "12", 10);
    const m = parseInt(mStr || "0", 10);
    const p = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${p}`;
  }, [value, placeholder]);

  // Local state while popover is open
  const [selectedHour, setSelectedHour] = React.useState(12);
  const [selectedMinute, setSelectedMinute] = React.useState(0);
  const [selectedPeriod, setSelectedPeriod] = React.useState<"AM" | "PM">("AM");
  const [hourInput, setHourInput] = React.useState("12");
  const [minuteInput, setMinuteInput] = React.useState("00");
  const [activeField, setActiveField] = React.useState<"hour" | "minute" | null>(null);

  // Mode: "wheel" (desktop) vs "keypad" (mobile)
  const isMobileDefault = typeof window !== "undefined" && window.innerWidth < 640;
  const [mode, setMode] = React.useState<"wheel" | "keypad">(isMobileDefault ? "keypad" : "wheel");

  const hourScrollRef = React.useRef<HTMLDivElement>(null);
  const minScrollRef = React.useRef<HTMLDivElement>(null);

  // Select hour helper
  const selectHour = (h: number) => {
    setSelectedHour(h);
    setHourInput(String(h).padStart(2, "0"));
    const hIdx = HOURS_LIST.indexOf(h);
    if (hourScrollRef.current && hIdx !== -1) {
      hourScrollRef.current.scrollTo({ top: hIdx * ITEM_HEIGHT, behavior: "smooth" });
    }
  };

  // Select minute helper
  const selectMinute = (m: number) => {
    setSelectedMinute(m);
    setMinuteInput(String(m).padStart(2, "0"));
    const mIdx = MINUTES_LIST.indexOf(m);
    if (minScrollRef.current && mIdx !== -1) {
      minScrollRef.current.scrollTo({ top: mIdx * ITEM_HEIGHT, behavior: "smooth" });
    }
  };

  // Step helpers for chevron buttons
  const stepHour = (dir: number) => {
    const currentIdx = HOURS_LIST.indexOf(selectedHour);
    const nextIdx = (currentIdx + dir + HOURS_LIST.length) % HOURS_LIST.length;
    selectHour(HOURS_LIST[nextIdx]);
  };

  const stepMinute = (dir: number) => {
    const nextMin = (selectedMinute + dir + 60) % 60;
    selectMinute(nextMin);
  };

  // Initialize values when popover opens (ONLY runs on open change)
  React.useEffect(() => {
    if (open) {
      let h12 = 12;
      let min = 0;
      let p: "AM" | "PM" = "AM";

      if (value) {
        const [hStr, mStr] = value.split(":");
        let h = parseInt(hStr || "12", 10);
        min = parseInt(mStr || "0", 10);
        p = h >= 12 ? "PM" : "AM";
        if (h === 0) h12 = 12;
        else if (h > 12) h12 = h - 12;
        else h12 = h;
      }

      setSelectedHour(h12);
      setSelectedMinute(min);
      setSelectedPeriod(p);
      setHourInput(String(h12).padStart(2, "0"));
      setMinuteInput(String(min).padStart(2, "0"));
      setActiveField(null);

      const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
      setMode(isMobile ? "keypad" : "wheel");

      setTimeout(() => {
        const hIdx = HOURS_LIST.indexOf(h12);
        if (hourScrollRef.current && hIdx !== -1) {
          hourScrollRef.current.scrollTop = hIdx * ITEM_HEIGHT;
        }
        const mIdx = MINUTES_LIST.indexOf(min);
        if (minScrollRef.current && mIdx !== -1) {
          minScrollRef.current.scrollTop = mIdx * ITEM_HEIGHT;
        }
      }, 50);
    }
  }, [open]);

  // When switching to wheel mode, scroll into view (ONLY runs on mode change)
  React.useEffect(() => {
    if (mode === "wheel" && open) {
      setTimeout(() => {
        const hIdx = HOURS_LIST.indexOf(selectedHour);
        if (hourScrollRef.current && hIdx !== -1) {
          hourScrollRef.current.scrollTop = hIdx * ITEM_HEIGHT;
        }
        const mIdx = MINUTES_LIST.indexOf(selectedMinute);
        if (minScrollRef.current && mIdx !== -1) {
          minScrollRef.current.scrollTop = mIdx * ITEM_HEIGHT;
        }
      }, 50);
    }
  }, [mode]);

  // Native wheel listeners to bypass modal scroll-locks and enable silky smooth wheel scrolling
  React.useEffect(() => {
    if (!open || mode !== "wheel") return;
    const hourEl = hourScrollRef.current;
    const minEl = minScrollRef.current;
    if (!hourEl || !minEl) return;

    let hourTimer: ReturnType<typeof setTimeout>;
    let minTimer: ReturnType<typeof setTimeout>;

    const onHourWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      hourEl.scrollTop += e.deltaY;
      clearTimeout(hourTimer);
      hourTimer = setTimeout(() => {
        const top = hourEl.scrollTop;
        const idx = Math.max(0, Math.min(HOURS_LIST.length - 1, Math.round(top / ITEM_HEIGHT)));
        hourEl.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
      }, 150);
    };

    const onMinWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      minEl.scrollTop += e.deltaY;
      clearTimeout(minTimer);
      minTimer = setTimeout(() => {
        const top = minEl.scrollTop;
        const idx = Math.max(0, Math.min(MINUTES_LIST.length - 1, Math.round(top / ITEM_HEIGHT)));
        minEl.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
      }, 150);
    };

    hourEl.addEventListener("wheel", onHourWheel, { passive: false });
    minEl.addEventListener("wheel", onMinWheel, { passive: false });

    return () => {
      hourEl.removeEventListener("wheel", onHourWheel);
      minEl.removeEventListener("wheel", onMinWheel);
      clearTimeout(hourTimer);
      clearTimeout(minTimer);
    };
  }, [open, mode]);

  // Handle Hour scroll
  const handleHourScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const index = Math.round(top / ITEM_HEIGHT);
    if (index >= 0 && index < HOURS_LIST.length) {
      const h = HOURS_LIST[index];
      if (h !== undefined && h !== selectedHour) {
        setSelectedHour(h);
        setHourInput(String(h).padStart(2, "0"));
      }
    }
  };

  // Handle Minute scroll
  const handleMinuteScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const index = Math.round(top / ITEM_HEIGHT);
    if (index >= 0 && index < MINUTES_LIST.length) {
      const m = MINUTES_LIST[index];
      if (m !== undefined && m !== selectedMinute) {
        setSelectedMinute(m);
        setMinuteInput(String(m).padStart(2, "0"));
      }
    }
  };

  // Mouse drag-to-scroll handler
  const handleDragStart = (
    e: React.MouseEvent<HTMLDivElement>,
    containerRef: React.RefObject<HTMLDivElement | null>,
    listLength: number,
    onSelect: (val: number) => void,
    list: number[]
  ) => {
    if (e.button !== 0 || !containerRef.current) return;
    const container = containerRef.current;
    const startY = e.clientY;
    const startScrollTop = container.scrollTop;
    let hasMoved = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dy) > 4) {
        hasMoved = true;
      }
      container.scrollTop = startScrollTop - dy;
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      if (hasMoved) {
        const top = container.scrollTop;
        const idx = Math.max(0, Math.min(listLength - 1, Math.round(top / ITEM_HEIGHT)));
        container.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
        onSelect(list[idx]);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Keypad / direct input handlers
  const handleHourInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setHourInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      setSelectedHour(num);
      const hIdx = HOURS_LIST.indexOf(num);
      if (mode === "wheel" && hourScrollRef.current && hIdx !== -1) {
        hourScrollRef.current.scrollTo({ top: hIdx * ITEM_HEIGHT, behavior: "smooth" });
      }
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(hourInput, 10);
    if (isNaN(num) || num < 1) num = 12;
    if (num > 12) num = 12;
    setSelectedHour(num);
    setHourInput(String(num).padStart(2, "0"));
    const hIdx = HOURS_LIST.indexOf(num);
    if (mode === "wheel" && hourScrollRef.current && hIdx !== -1) {
      hourScrollRef.current.scrollTo({ top: hIdx * ITEM_HEIGHT, behavior: "smooth" });
    }
  };

  const handleMinuteInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMinuteInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 59) {
      setSelectedMinute(num);
      const mIdx = MINUTES_LIST.indexOf(num);
      if (mode === "wheel" && minScrollRef.current && mIdx !== -1) {
        minScrollRef.current.scrollTo({ top: mIdx * ITEM_HEIGHT, behavior: "smooth" });
      }
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minuteInput, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    setSelectedMinute(num);
    setMinuteInput(String(num).padStart(2, "0"));
    const mIdx = MINUTES_LIST.indexOf(num);
    if (mode === "wheel" && minScrollRef.current && mIdx !== -1) {
      minScrollRef.current.scrollTo({ top: mIdx * ITEM_HEIGHT, behavior: "smooth" });
    }
  };

  // Confirm and Cancel
  const handleConfirm = () => {
    let h24 = selectedHour;
    if (selectedPeriod === "AM") {
      if (h24 === 12) h24 = 0;
    } else {
      if (h24 < 12) h24 += 12;
    }
    const result = `${String(h24).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;
    onChange(result);
    setOpen(false);
  };

  // Set to current time now
  const handleSetTimeNow = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;

    setSelectedHour(hours);
    setSelectedMinute(minutes);
    setSelectedPeriod(period);
    setHourInput(String(hours).padStart(2, "0"));
    setMinuteInput(String(minutes).padStart(2, "0"));
    if (mode === "wheel") {
      const hIdx = HOURS_LIST.indexOf(hours);
      if (hourScrollRef.current && hIdx !== -1) {
        hourScrollRef.current.scrollTo({ top: hIdx * ITEM_HEIGHT, behavior: "smooth" });
      }
      const mIdx = MINUTES_LIST.indexOf(minutes);
      if (minScrollRef.current && mIdx !== -1) {
        minScrollRef.current.scrollTo({ top: mIdx * ITEM_HEIGHT, behavior: "smooth" });
      }
    }
  };

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
          <span className={cn("truncate", !value ? "text-muted-foreground font-normal normal-case" : "font-semibold uppercase tracking-wide")}>
            {display12Hr}
          </span>
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] sm:w-[300px] p-4 sm:p-5 overflow-hidden border border-border/80 shadow-2xl rounded-3xl bg-card z-[100000]"
        style={{ zIndex: 100000 }}
        align="start"
      >
        {/* Title */}
        <div className="text-xs font-semibold text-muted-foreground/80 mb-3 select-none">
          {mode === "wheel" ? "Select time" : "Enter Time"}
        </div>

        {/* Display Row: [ 12 ] : [ 00 ] + AM/PM */}
        <div className="flex items-center justify-between gap-1 sm:gap-1.5">
          <div className="flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={hourInput}
              onChange={handleHourInput}
              onBlur={handleHourBlur}
              onFocus={() => setActiveField("hour")}
              className={cn(
                "w-16 sm:w-20 h-14 sm:h-16 text-center text-3xl sm:text-4xl font-semibold rounded-2xl transition-all outline-none",
                activeField === "hour"
                  ? "bg-purple-50 dark:bg-[#942392]/20 border-2 border-[#942392] text-[#942392]"
                  : "bg-slate-100 dark:bg-slate-800 text-foreground border-2 border-transparent"
              )}
            />
            {mode === "keypad" && (
              <span className="text-[11px] text-muted-foreground font-medium mt-1 select-none">Hour</span>
            )}
          </div>

          <span className="text-3xl font-black text-foreground/70 select-none -mt-1 sm:-mt-2">:</span>

          <div className="flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={minuteInput}
              onChange={handleMinuteInput}
              onBlur={handleMinuteBlur}
              onFocus={() => setActiveField("minute")}
              className={cn(
                "w-16 sm:w-20 h-14 sm:h-16 text-center text-3xl sm:text-4xl font-semibold rounded-2xl transition-all outline-none",
                activeField === "minute"
                  ? "bg-purple-50 dark:bg-[#942392]/20 border-2 border-[#942392] text-[#942392]"
                  : "bg-slate-100 dark:bg-slate-800 text-foreground border-2 border-transparent"
              )}
            />
            {mode === "keypad" && (
              <span className="text-[11px] text-muted-foreground font-medium mt-1 select-none">Minute</span>
            )}
          </div>

          {/* AM / PM Toggle Box */}
          <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden divide-y divide-border/80 ml-2 h-14 sm:h-16 w-12 sm:w-14 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedPeriod("AM")}
              className={cn(
                "flex-1 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer select-none",
                selectedPeriod === "AM"
                  ? "bg-[#fce7f3] dark:bg-[#942392]/30 text-[#942392] dark:text-purple-300 font-black"
                  : "bg-transparent text-muted-foreground hover:bg-muted/50"
              )}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod("PM")}
              className={cn(
                "flex-1 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer select-none",
                selectedPeriod === "PM"
                  ? "bg-[#fce7f3] dark:bg-[#942392]/30 text-[#942392] dark:text-purple-300 font-black"
                  : "bg-transparent text-muted-foreground hover:bg-muted/50"
              )}
            >
              PM
            </button>
          </div>
        </div>

        {/* Wheel Spinner Section (Desktop / Wheel mode) */}
        {mode === "wheel" && (
          <div className="relative mt-3 mb-1 select-none">
            {/* Top Chevron Up controls */}
            <div className="flex items-center justify-around mb-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => stepHour(-1)}
                className="w-8 h-6 flex items-center justify-center rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#942392] transition-colors cursor-pointer"
                title="Previous hour"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => stepMinute(-1)}
                className="w-8 h-6 flex items-center justify-center rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#942392] transition-colors cursor-pointer"
                title="Previous minute"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            {/* Spinner wheel viewport */}
            <div className="relative flex items-center justify-around h-[180px] overflow-hidden select-none">
              {/* Top and bottom subtle fade masks */}
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-card to-transparent pointer-events-none z-20" />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />

              {/* Active middle highlight capsule across both columns */}
              <div className="absolute inset-x-4 top-[72px] h-[36px] bg-[#ede9fe]/90 dark:bg-[#942392]/25 rounded-xl border border-purple-200/80 dark:border-[#942392]/40 pointer-events-none z-0" />

              {/* Hours Column */}
              <div
                ref={hourScrollRef}
                onScroll={handleHourScroll}
                onMouseDown={(e) => handleDragStart(e, hourScrollRef, HOURS_LIST.length, selectHour, HOURS_LIST)}
                className="h-full w-24 overflow-y-auto scrollbar-none py-[72px] z-10 text-center cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {HOURS_LIST.map((h) => {
                  const isSelected = selectedHour === h;
                  return (
                    <div
                      key={h}
                      onClick={() => selectHour(h)}
                      className={cn(
                        "h-[36px] flex items-center justify-center cursor-pointer transition-all duration-150 select-none",
                        isSelected
                          ? "text-[#942392] font-black text-base scale-110"
                          : "text-foreground/45 hover:text-foreground/80 text-sm font-medium hover:scale-105"
                      )}
                    >
                      {String(h).padStart(2, "0")}
                    </div>
                  );
                })}
              </div>

              {/* Minutes Column */}
              <div
                ref={minScrollRef}
                onScroll={handleMinuteScroll}
                onMouseDown={(e) => handleDragStart(e, minScrollRef, MINUTES_LIST.length, selectMinute, MINUTES_LIST)}
                className="h-full w-24 overflow-y-auto scrollbar-none py-[72px] z-10 text-center cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {MINUTES_LIST.map((m) => {
                  const isSelected = selectedMinute === m;
                  return (
                    <div
                      key={m}
                      onClick={() => selectMinute(m)}
                      className={cn(
                        "h-[36px] flex items-center justify-center cursor-pointer transition-all duration-150 select-none",
                        isSelected
                          ? "text-[#942392] font-black text-base scale-110"
                          : "text-foreground/45 hover:text-foreground/80 text-sm font-medium hover:scale-105"
                      )}
                    >
                      {String(m).padStart(2, "0")}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Chevron Down controls */}
            <div className="flex items-center justify-around mt-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => stepHour(1)}
                className="w-8 h-6 flex items-center justify-center rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#942392] transition-colors cursor-pointer"
                title="Next hour"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => stepMinute(1)}
                className="w-8 h-6 flex items-center justify-center rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#942392] transition-colors cursor-pointer"
                title="Next minute"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer / Actions */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 select-none">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setMode((m) => (m === "wheel" ? "keypad" : "wheel"))}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-[#942392] hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
              title={mode === "wheel" ? "Switch to keypad input" : "Switch to wheel spinner"}
            >
              {mode === "wheel" ? <Keyboard className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={handleSetTimeNow}
              className="text-[11px] sm:text-xs font-bold text-[#942392] hover:text-[#5e0080] hover:bg-purple-50 dark:hover:bg-[#942392]/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-[#942392]/30 active:scale-95 whitespace-nowrap shadow-2xs"
            >
              Time Now
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs sm:text-sm font-bold text-[#942392] hover:text-[#5e0080] hover:bg-purple-50 dark:hover:bg-purple-950/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="text-xs sm:text-sm font-black text-[#942392] hover:text-[#5e0080] hover:bg-purple-50 dark:hover:bg-purple-950/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer tracking-wider"
            >
              OK
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
