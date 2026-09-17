import React from "react";

/**
 * ReplacementLeaveIcon
 * Matches the user-provided design (2nd screenshot):
 * Two staff silhouettes connected with rounded exchange/replacement flow curves.
 * 100% SVG vector component matching Lucide icon styling and currentColor.
 */
export function ReplacementLeaveIcon({
  className = "w-9 h-9 sm:w-10 sm:h-10 text-blue-500",
  strokeWidth = 2.2,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-label="Replacement Leave"
      role="img"
      {...props}
    >
      {/* Top-Left Person: Head */}
      <circle cx="7" cy="6.5" r="2.4" />
      {/* Top-Left Person: Torso */}
      <path d="M 4 14.5 C 4 11.5 10 11.5 10 14.5" />
      {/* Top Connecting Flow Curve */}
      <path d="M 11.5 5.5 h 4 a 2.5 2.5 0 0 1 2.5 2.5 v 2.2" />

      {/* Bottom-Right Person: Head */}
      <circle cx="17" cy="13" r="2.4" />
      {/* Bottom-Right Person: Torso */}
      <path d="M 14 21 C 14 18 20 18 20 21" />
      {/* Bottom Connecting Flow Curve */}
      <path d="M 12.5 18.5 h -4 a 2.5 2.5 0 0 1 -2.5 -2.5 v -2.2" />
    </svg>
  );
}

/**
 * UnpaidLeaveIcon
 * Matches the user-provided design (3rd screenshot):
 * Unpaid statement / receipt bill with dollar sign, text lines, and a circular cross (X) badge.
 * 100% SVG vector component matching Lucide icon styling and currentColor.
 */
export function UnpaidLeaveIcon({
  className = "w-9 h-9 sm:w-10 sm:h-10 text-slate-500",
  strokeWidth = 2.2,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-label="Unpaid Leave"
      role="img"
      {...props}
    >
      {/* Back Document Outline */}
      <path d="M 4 3 h 10 a 2 2 0 0 1 2 2 v 4" />

      {/* Dollar sign on back document */}
      <path d="M 7.5 4.5 v 4" strokeWidth={strokeWidth * 0.8} />
      <path
        d="M 8.8 5.3 C 8.8 4.7 8 4.7 7.5 4.7 S 6.3 4.7 6.3 5.4 c 0 .7 2.4 .5 2.4 1.5 c 0 .7 -.7 .8 -1.2 .8 s -1.2 -.1 -1.2 -.8"
        strokeWidth={strokeWidth * 0.8}
      />

      {/* Horizontal text lines next to dollar sign */}
      <line x1="11.5" y1="5.3" x2="14.5" y2="5.3" strokeWidth={strokeWidth} />
      <line x1="11.5" y1="7.5" x2="14.5" y2="7.5" strokeWidth={strokeWidth} />

      {/* Front Document with left curl / fold */}
      <path d="M 4 3 v 7 a 2.5 2.5 0 0 0 5 0 v -1 a 2.2 2.2 0 0 1 4.4 0 v 6 a 2 2 0 0 1 -2 2 H 7 a 2 2 0 0 1 -2 -2 V 11" />

      {/* Front Document horizontal content lines */}
      <line x1="8.5" y1="11.5" x2="14" y2="11.5" strokeWidth={strokeWidth} />
      <line x1="8.5" y1="14" x2="14" y2="14" strokeWidth={strokeWidth} />
      <line x1="8.5" y1="16.5" x2="12.5" y2="16.5" strokeWidth={strokeWidth} />

      {/* Cross Badge Circle at bottom-right */}
      <circle cx="18" cy="18" r="3.8" strokeWidth={strokeWidth} />
      <line x1="16.3" y1="16.3" x2="19.7" y2="19.7" strokeWidth={strokeWidth} />
      <line x1="19.7" y1="16.3" x2="16.3" y2="19.7" strokeWidth={strokeWidth} />
    </svg>
  );
}
