import { useEffect, useRef, useState } from "react";
import { getBlockingPlayerIds } from "@moronarchy/core/engine";
import type { GameState, PlayerId } from "@moronarchy/core/engine";

// Same default as the server's MORONARCHY_ABSENT_TIMEOUT_MS: how long a player may be gone while the game waits on them.
export const ABSENT_TIMEOUT_MS = 30_000;
export const RECONNECTED_NOTICE_MS = 3000;
const TICK_MS = 250;

export type AbsentStatus =
  // The game waits on a king who is offline; the server removes them in about `secondsLeft` seconds.
  | { kind: "absent"; playerId: PlayerId; secondsLeft: number }
  // The king that was being counted down came back.
  | { kind: "reconnected"; playerId: PlayerId };

// Kings the game is waiting on (see getBlockingPlayerIds) who the server reports as disconnected.
export const getAbsentBlockers = (game: GameState, offlineIds: ReadonlySet<PlayerId>): PlayerId[] =>
  getBlockingPlayerIds(game).filter((playerId) => offlineIds.has(playerId));

// The countdown the banner shows. The server owns the real clock (it removes the player); this is an estimate that
// starts when this client first saw the game waiting on an offline king, so it can only run a little behind.
export const useAbsentCountdown = (
  game: GameState,
  offlineIds: ReadonlySet<PlayerId>,
  timeoutMs: number = ABSENT_TIMEOUT_MS
): AbsentStatus | null => {
  const blockers = getAbsentBlockers(game, offlineIds);
  const blockersKey = blockers.join(",");
  const startedAt = useRef(new Map<PlayerId, number>());
  const [, setTick] = useState(0);
  const [reconnected, setReconnected] = useState<PlayerId | null>(null);

  useEffect(() => {
    const started = startedAt.current;
    const now = Date.now();
    for (const playerId of blockers) {
      if (!started.has(playerId)) {
        started.set(playerId, now);
      }
    }
    for (const playerId of [...started.keys()]) {
      if (blockers.includes(playerId)) {
        continue;
      }
      started.delete(playerId);
      // Back online (not removed, not just waiting on somebody else): say so for a moment.
      if (!offlineIds.has(playerId) && game.kings[playerId] && !game.kings[playerId].eliminated) {
        setReconnected(playerId);
      }
    }
    setTick((tick) => tick + 1);
    // `blockersKey` stands for `blockers`; the rest is read fresh whenever the key changes.
  }, [blockersKey]);

  useEffect(() => {
    if (blockersKey === "") {
      return;
    }
    const timer = setInterval(() => setTick((tick) => tick + 1), TICK_MS);
    return () => clearInterval(timer);
  }, [blockersKey]);

  useEffect(() => {
    if (reconnected === null) {
      return;
    }
    const timer = setTimeout(() => setReconnected(null), RECONNECTED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [reconnected]);

  if (blockers.length > 0) {
    const now = Date.now();
    let best: AbsentStatus | null = null;
    for (const playerId of blockers) {
      const elapsed = now - (startedAt.current.get(playerId) ?? now);
      const secondsLeft = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
      if (best === null || (best.kind === "absent" && secondsLeft < best.secondsLeft)) {
        best = { kind: "absent", playerId, secondsLeft };
      }
    }
    return best;
  }
  return reconnected !== null && !offlineIds.has(reconnected) && game.kings[reconnected] && !game.kings[reconnected].eliminated
    ? { kind: "reconnected", playerId: reconnected }
    : null;
};
