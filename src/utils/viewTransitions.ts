export type TransitionOriginSource =
  | {
      clientX?: number;
      clientY?: number;
      currentTarget?: EventTarget | null;
    }
  | HTMLElement
  | null
  | undefined;

let activeTransitionId = 0;

function getOriginCoordinates(source?: TransitionOriginSource): { x: number; y: number } {
  const fallback = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };

  if (!source) return fallback;

  if (source instanceof HTMLElement) {
    const rect = source.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  if (typeof source.clientX === "number" && typeof source.clientY === "number" && (source.clientX > 0 || source.clientY > 0)) {
    return {
      x: source.clientX,
      y: source.clientY,
    };
  }

  if (source.currentTarget instanceof HTMLElement) {
    const rect = source.currentTarget.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  return fallback;
}

/**
 * Runs a DOM update inside a circular clip-path View Transition expanding from the click origin.
 * Falls back immediately to running `updateDom` if the browser lacks View Transitions support
 * or if reduced motion is enabled.
 */
export function runCircularRevealTransition(
  updateDom: () => void,
  source?: TransitionOriginSource
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    updateDom();
    return;
  }

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };

  if (prefersReducedMotion || typeof doc.startViewTransition !== "function") {
    updateDom();
    return;
  }

  const { x, y } = getOriginCoordinates(source);
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transitionId = ++activeTransitionId;
  document.documentElement.classList.add("vt-circular");

  let didUpdate = false;
  const runUpdateOnce = () => {
    if (didUpdate) return;
    didUpdate = true;
    updateDom();
  };

  try {
    const transition = doc.startViewTransition(runUpdateOnce);

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 420,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});

    transition.finished
      .catch(() => {})
      .finally(() => {
        if (activeTransitionId === transitionId) {
          document.documentElement.classList.remove("vt-circular");
        }
      });
  } catch {
    if (activeTransitionId === transitionId) {
      document.documentElement.classList.remove("vt-circular");
    }
    runUpdateOnce();
  }
}
