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
 * Matches the user-provided design (statement bill with dollar sign, fold curl, lines, and circular cross badge).
 * 100% SVG vector component matching Lucide icon styling, strokeWidth, and currentColor.
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
      {/* Back document outline with receipt fold curl */}
      <path d="M 16 9 V 3.5 A 1.5 1.5 0 0 0 14.5 2 H 3.5 A 1.5 1.5 0 0 0 2 3.5 V 15.5 C 2 18 4.5 18.5 6.5 18.5 C 8 18.5 8.5 17.5 8.5 15.5 V 10.5 C 8.5 9 9.8 8.5 11 8.5 H 18 A 1.5 1.5 0 0 1 19.5 10 V 15" />

      {/* Front sheet left and bottom boundary */}
      <path d="M 8.5 11.5 V 21 A 1 1 0 0 0 9.5 22 H 14.5" />

      {/* Currency / dollar symbol on back sheet */}
      <path d="M 5.2 3.5 v 3.8" strokeWidth={strokeWidth * 0.8} />
      <path
        d="M 6.4 4.1 C 6.4 3.5 5.8 3.5 5.2 3.5 S 4.2 3.5 4.2 4.2 c 0 .8 2.2 .6 2.2 1.5 c 0 .6 -.6 .7 -1.2 .7 s -1 -.1 -1 -.6"
        strokeWidth={strokeWidth * 0.8}
      />

      {/* Back document text lines */}
      <line x1="8.8" y1="4.3" x2="13.2" y2="4.3" strokeWidth={strokeWidth * 0.85} />
      <line x1="8.8" y1="6.5" x2="13.2" y2="6.5" strokeWidth={strokeWidth * 0.85} />

      {/* Front document statement lines */}
      <line x1="11.2" y1="11.8" x2="16.5" y2="11.8" strokeWidth={strokeWidth * 0.85} />
      <line x1="11.2" y1="14.8" x2="16.5" y2="14.8" strokeWidth={strokeWidth * 0.85} />
      <line x1="11.2" y1="17.8" x2="14.2" y2="17.8" strokeWidth={strokeWidth * 0.85} />

      {/* Cross Badge Circle at bottom-right */}
      <circle cx="18.5" cy="18.5" r="3.5" strokeWidth={strokeWidth} />
      <line x1="16.8" y1="16.8" x2="20.2" y2="20.2" strokeWidth={strokeWidth * 0.85} />
      <line x1="20.2" y1="16.8" x2="16.8" y2="20.2" strokeWidth={strokeWidth * 0.85} />
    </svg>
  );
}
