import React from "react";

/**
 * ReplacementLeaveIcon
 * Matches the user-provided design (2nd screenshot):
 * Two connected staff silhouette icons with rounded swap / exchange flow curves.
 * Supports currentColor so it seamlessly adapts to text-blue-500, dark mode, etc.
 */
export function ReplacementLeaveIcon({
  className = "w-9 h-9 sm:w-10 sm:h-10 text-blue-500",
  strokeWidth = 2,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      aria-label="Replacement Leave"
      role="img"
    >
      <span
        className="w-full h-full block"
        style={{
          maskImage: `url('/images/replacement-leave.png')`,
          WebkitMaskImage: `url('/images/replacement-leave.png')`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          backgroundColor: "currentColor",
        }}
      />
    </span>
  );
}

/**
 * UnpaidLeaveIcon
 * Matches the user-provided design (3rd screenshot):
 * Unpaid bill / statement slip showing dollar sign with a cross (X) badge.
 * Supports currentColor so it seamlessly adapts to text-slate-500, dark mode, etc.
 */
export function UnpaidLeaveIcon({
  className = "w-9 h-9 sm:w-10 sm:h-10 text-slate-500",
  strokeWidth = 2,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      aria-label="Unpaid Leave"
      role="img"
    >
      <span
        className="w-full h-full block"
        style={{
          maskImage: `url('/images/unpaid-leave.png')`,
          WebkitMaskImage: `url('/images/unpaid-leave.png')`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          backgroundColor: "currentColor",
        }}
      />
    </span>
  );
}
