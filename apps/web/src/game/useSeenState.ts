import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { loadSeen, saveSeen } from "./seen-store";

const MAX_DISMISSED = 20;

export interface SeenState {
  seq: number;
  dismissed: ReadonlySet<string>;
  markSeen: (seq: number) => void;
  dismiss: (key: string) => void;
}

const latestSeq = (game: GameState): number => game.log[game.log.length - 1]?.seq ?? 0;

// Which popups this tab already showed. A tab that has never seen this match starts "caught up", so opening or
// reloading the app never replays old notifications.
export const useSeenState = (gameId: string, viewerId: PlayerId, game: GameState): SeenState => {
  const [state, setState] = useState(() => {
    const stored = loadSeen(gameId, viewerId);
    return { seq: stored.seq ?? latestSeq(game), dismissed: stored.dismissed };
  });

  useEffect(() => {
    saveSeen(gameId, viewerId, { seq: state.seq, dismissed: state.dismissed });
  }, [gameId, viewerId, state]);

  const markSeen = useCallback((seq: number) => setState((previous) => ({ ...previous, seq: Math.max(previous.seq, seq) })), []);
  const dismiss = useCallback(
    (key: string) =>
      setState((previous) =>
        previous.dismissed.includes(key) ? previous : { ...previous, dismissed: [...previous.dismissed, key].slice(-MAX_DISMISSED) }
      ),
    []
  );
  const dismissed = useMemo(() => new Set(state.dismissed), [state.dismissed]);

  return { seq: state.seq, dismissed, markSeen, dismiss };
};
