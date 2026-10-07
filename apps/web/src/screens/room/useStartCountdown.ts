import { useEffect, useState } from "react";
import type { MatchStage } from "@moronarchy/core/match";

export const START_COUNTDOWN_FROM = 3;
export const START_COUNTDOWN_TICK_MS = 1000;

// Counts 3 -> 2 -> 1 (then null) when this client watches the stage flip from lobby to playing.
// A client that first sees an already running match gets no countdown.
export const useStartCountdown = (
  stage: MatchStage | null,
  from: number = START_COUNTDOWN_FROM,
  tickMs: number = START_COUNTDOWN_TICK_MS
): number | null => {
  const [previousStage, setPreviousStage] = useState<MatchStage | null>(stage);
  const [count, setCount] = useState<number | null>(null);

  // Adjusted during render so the first "playing" frame never shows the game before the overlay.
  if (stage !== previousStage) {
    setPreviousStage(stage);
    if (previousStage === "lobby" && stage === "playing") {
      setCount(from);
    }
  }

  useEffect(() => {
    if (count === null) {
      return;
    }
    const timer = setTimeout(() => setCount(count > 1 ? count - 1 : null), tickMs);
    return () => clearTimeout(timer);
  }, [count, tickMs]);

  return count;
};
