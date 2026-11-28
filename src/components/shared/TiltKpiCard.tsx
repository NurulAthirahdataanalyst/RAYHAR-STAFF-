import { useRef, type PointerEvent, type ReactNode } from "react";

export const KPI_INTERACTIVE_STYLES = `
  .kpi-tilt-scene {
    perspective: 1000px;
  }
  .kpi-tilt-carrier {
    position: relative;
    transform-style: preserve-3d;
    will-change: transform;
    border-radius: var(--card-radius, 24px);
    transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform 200ms ease;
  }
  .kpi-tilt-carrier.is-live {
    transition: transform 90ms ease-out;
  }
  .kpi-tilt-carrier::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: var(--card-radius, 24px);
    padding: 1px;
    background: radial-gradient(
      var(--spot-size, 140px) circle at var(--mx, 50%) var(--my, 50%),
      rgba(var(--kpi-rgb, 148, 35, 146), 0.95) 0%,
      rgba(var(--kpi-rgb, 148, 35, 146), 0.35) 45%,
      transparent 75%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 200ms ease;
    pointer-events: none;
    z-index: 25;
  }
  .kpi-tilt-scene:hover > .kpi-tilt-carrier::before {
    opacity: 1;
  }
  .kpi-interactive-card {
    position: relative;
    cursor: pointer;
    transition: border-color 200ms ease;
  }
  .kpi-tilt-scene:hover .kpi-interactive-card,
  .kpi-interactive-card:hover {
    border-color: rgba(var(--kpi-rgb, 148, 35, 146), 0.35);
  }
  @media (prefers-reduced-motion: reduce) {
    .kpi-tilt-carrier,
    .kpi-tilt-carrier.is-live {
      transition: none;
      transform: none;
    }
  }
`;

export function TiltKpiCard({
  children,
  kpiRgb = "148, 35, 146",
  fillHeight = true,
  className = "",
}: {
  children: ReactNode;
  kpiRgb?: string;
  fillHeight?: boolean;
  className?: string;
}) {
  const carrierRef = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const carrier = carrierRef.current;
    if (!carrier) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    carrier.style.setProperty("--mx", `${x.toFixed(1)}px`);
    carrier.style.setProperty("--my", `${y.toFixed(1)}px`);

    const childEl = carrier.firstElementChild as HTMLElement | null;
    if (childEl) {
      carrier.style.setProperty("--card-radius", getComputedStyle(childEl).borderRadius);
    }

    const maxDim = Math.max(r.width, r.height, 1);
    const spotSize = Math.max(130, Math.min(280, Math.round(maxDim * 0.35)));
    carrier.style.setProperty("--spot-size", `${spotSize}px`);

    if (
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const px = x / r.width;
    const py = y / r.height;
    const maxDeg = Math.min(7, 980 / maxDim);
    carrier.style.setProperty("--rx", `${((0.5 - py) * maxDeg).toFixed(2)}deg`);
    carrier.style.setProperty("--ry", `${((px - 0.5) * maxDeg).toFixed(2)}deg`);
    carrier.classList.add("is-live");
  };

  const handlePointerLeave = () => {
    const carrier = carrierRef.current;
    if (!carrier) return;
    carrier.classList.remove("is-live");
    carrier.style.setProperty("--rx", "0deg");
    carrier.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      className={`kpi-tilt-scene ${fillHeight ? "h-full" : "h-fit"} ${className}`}
      style={{ ["--kpi-rgb" as string]: kpiRgb }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div ref={carrierRef} className={`kpi-tilt-carrier ${fillHeight ? "h-full" : ""}`}>
        {children}
      </div>
    </div>
  );
}
