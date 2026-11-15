import { useCallback, useEffect, useRef, useState } from "react";

type CurtainPhase = "idle" | "in" | "covered" | "out";

type CurtainTriggerFn = (onCovered: () => void) => void;

let registeredTrigger: CurtainTriggerFn | null = null;

/**
 * Plays the Rayhar purple curtain transition when moving from Login into the Portal.
 * Runs `onCovered` once the screen is covered, waits for the next route to mount and paint,
 * then smoothly slides the curtain away.
 */
export function triggerLoginCurtain(onCovered: () => void): void {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !registeredTrigger) {
    onCovered();
    return;
  }

  registeredTrigger(onCovered);
}

export function LoginCurtain() {
  const [phase, setPhase] = useState<CurtainPhase>("idle");
  const phaseRef = useRef<CurtainPhase>("idle");
  const onCoveredRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<number[]>([]);
  const rafsRef = useRef<number[]>([]);

  const clearScheduled = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    rafsRef.current.forEach((id) => window.cancelAnimationFrame(id));
    rafsRef.current = [];
  }, []);

  const updatePhase = useCallback((next: CurtainPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const finishOut = useCallback(() => {
    if (phaseRef.current !== "out") return;
    clearScheduled();
    updatePhase("idle");
  }, [clearScheduled, updatePhase]);

  const handleCovered = useCallback(() => {
    if (phaseRef.current !== "in") return;
    clearScheduled();
    updatePhase("covered");

    const callback = onCoveredRef.current;
    onCoveredRef.current = null;
    callback?.();

    // Let React commit and paint the destination route behind the solid curtain
    // before starting the compositor-only slide-out animation.
    const raf1 = window.requestAnimationFrame(() => {
      const raf2 = window.requestAnimationFrame(() => {
        const settleTimer = window.setTimeout(() => {
          if (phaseRef.current !== "covered") return;
          updatePhase("out");

          const outFallback = window.setTimeout(finishOut, 380);
          timersRef.current.push(outFallback);
        }, 60);
        timersRef.current.push(settleTimer);
      });
      rafsRef.current.push(raf2);
    });
    rafsRef.current.push(raf1);
  }, [clearScheduled, finishOut, updatePhase]);

  useEffect(() => {
    registeredTrigger = (onCovered: () => void) => {
      clearScheduled();
      onCoveredRef.current = onCovered;
      updatePhase("in");

      // Fallback in case animationend is suppressed (e.g. background tab)
      const inFallback = window.setTimeout(handleCovered, 320);
      timersRef.current.push(inFallback);
    };

    return () => {
      registeredTrigger = null;
      onCoveredRef.current = null;
      clearScheduled();
    };
  }, [clearScheduled, handleCovered, updatePhase]);

  if (phase === "idle") return null;

  return (
    <div
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.currentTarget !== e.target) return;
        if (e.animationName === "rayhar-curtain-in") {
          handleCovered();
        } else if (e.animationName === "rayhar-curtain-out") {
          finishOut();
        }
      }}
      style={{
        willChange: "transform",
        backfaceVisibility: "hidden",
        contain: "layout style paint",
        ...(phase === "covered" ? { transform: "translate3d(0, 0, 0)" } : {}),
      }}
      className={`fixed inset-0 z-[99999] pointer-events-none bg-[#942392] ${
        phase === "in"
          ? "login-curtain-in"
          : phase === "out"
            ? "login-curtain-out"
            : ""
      }`}
    />
  );
}
