import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-[4px] border-2 border-slate-300 dark:border-slate-600 ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-[#942392] data-[state=checked]:bg-[#942392] data-[state=checked]:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#942392] focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current animate-in zoom-in-50 duration-200")}>
      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 24, strokeDashoffset: 0, animation: "dash 0.3s ease-in-out" }}>
        <polyline points="20 6 9 17 4 12" />
        <style>
          {`
            @keyframes dash {
              0% { stroke-dashoffset: 24; }
              100% { stroke-dashoffset: 0; }
            }
          `}
        </style>
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
