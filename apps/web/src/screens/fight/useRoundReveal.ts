import { useEffect, useRef, useState } from "react";

export const REVEAL_MS = 600;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface RoundReveal {
  // The dice are shaking: a round resolved a moment ago.
  rolling: boolean;
  // At least one round resolved while this page was open (so floating labels may move; after a reload they stay still).
  fresh: boolean;
}

// Plays the dice animation when the number of resolved rounds grows. Mounting (or reloading) with rounds already
// played shows them at rest.
export const useRoundReveal = (roundCount: number, durationMs = REVEAL_MS): RoundReveal => {
  const initial = useRef(roundCount);
  const [shown, setShown] = useState(roundCount);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (shown === roundCount) {
      return;
    }
    if (roundCount < shown) {
      setShown(roundCount);
      return;
    }
    const timer = setTimeout(() => setShown(roundCount), durationMs);
    return () => clearTimeout(timer);
  }, [shown, roundCount, durationMs]);

  return { rolling: !reduced && shown < roundCount, fresh: !reduced && roundCount > initial.current };
};
