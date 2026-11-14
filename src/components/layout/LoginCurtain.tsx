import { useEffect, useRef, useState } from "react";

type CurtainPhase = "idle" | "in" | "out";

type CurtainTriggerFn = (onCovered: () => void) => void;

let registeredTrigger: CurtainTriggerFn | null = null;

/**
 * Plays the Rayhar purple curtain transition when moving from Login into the Portal.
 * Runs `onCovered` once the screen is covered, then slides the curtain away.
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
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };

    registeredTrigger = (onCovered: () => void) => {
      clearTimers();
      setPhase("in");

      const coverTimer = window.setTimeout(() => {
        onCovered();
        setPhase("out");

        const doneTimer = window.setTimeout(() => {
          setPhase("idle");
        }, 310);
        timersRef.current.push(doneTimer);
      }, 240);

      timersRef.current.push(coverTimer);
    };

    return () => {
      registeredTrigger = null;
      clearTimers();
    };
  }, []);

  if (phase === "idle") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] pointer-events-none bg-[#942392] ${
        phase === "in" ? "login-curtain-in" : "login-curtain-out"
      }`}
    />
  );
}
