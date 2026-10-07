import { getBlockingPlayerIds } from "@moronarchy/core/engine";
import type { MatchState } from "@moronarchy/core/match";
import type { PresenceTracker } from "./presence.js";

interface StoredMatch {
  state?: { G?: MatchState };
  metadata?: { players?: Record<string, { credentials?: unknown } | undefined> };
}

export interface RefereeDatabase {
  fetch: (matchID: string, opts: { state: true; metadata: true }) => StoredMatch | Promise<StoredMatch>;
}

const RETRY_MS = 5000;

export interface AbsentRefereeOptions {
  db: RefereeDatabase;
  presence: PresenceTracker;
  // How long a player must be disconnected while the game waits on them before they are removed.
  timeoutMs: number;
  intervalMs?: number;
  now?: () => number;
  // Removes the player from the game; must go through the normal move path (see forfeit-client.ts).
  forfeit: (matchID: string, playerID: string, credentials: string) => Promise<unknown>;
  // Extra safety net: true when the socket server still has a live connection for this player (boardgame.io's
  // `isConnected` is last-writer-wins per socket, so a late disconnect of an old socket can flag a connected player).
  isSocketConnected?: (matchID: string, playerID: string) => boolean;
  onError?: (error: unknown, matchID: string, playerID: string) => void;
}

export interface AbsentReferee {
  stop: () => void;
  // One pass over all disconnected players; the interval timer calls this. Exposed for tests.
  check: () => Promise<void>;
}

// Watches players that are disconnected while the game is waiting on them (they are the turn player, owe a decision or
// owe a fight roll) and removes them once that has lasted `timeoutMs`. Connected players are never touched, and neither
// is anyone in the lobby or after the game: only a running game can be frozen by a missing player.
export const startAbsentReferee = ({
  db,
  presence,
  timeoutMs,
  intervalMs = 2000,
  now = Date.now,
  forfeit,
  isSocketConnected,
  onError
}: AbsentRefereeOptions): AbsentReferee => {
  // When the game was first seen waiting on an absent player, so a player who goes offline while it is not their turn
  // gets the full timeout once it becomes their turn.
  const blockingSince = new Map<string, number>();
  const inFlight = new Set<string>();
  const lastAttempt = new Map<string, number>();

  const check = async (): Promise<void> => {
    const live = new Set<string>();
    for (const { matchID, playerID, since } of presence.listAbsent()) {
      const key = `${matchID}\u0000${playerID}`;
      try {
        const { state, metadata } = await db.fetch(matchID, { state: true, metadata: true });
        const match = state?.G;
        if (!match || match.stage !== "playing" || !match.game) {
          continue;
        }
        if (!getBlockingPlayerIds(match.game).includes(playerID)) {
          continue;
        }
        if (isSocketConnected?.(matchID, playerID)) {
          continue;
        }
        live.add(key);
        const blockedAt = blockingSince.get(key) ?? now();
        blockingSince.set(key, blockedAt);
        if (inFlight.has(key) || now() - Math.max(since, blockedAt) < timeoutMs) {
          continue;
        }
        // A failed attempt (server hiccup) is retried, but not on every pass.
        if (now() - (lastAttempt.get(key) ?? -Infinity) < RETRY_MS) {
          continue;
        }
        const credentials = metadata?.players?.[playerID]?.credentials;
        if (typeof credentials !== "string" || credentials.length === 0) {
          continue;
        }
        inFlight.add(key);
        lastAttempt.set(key, now());
        void forfeit(matchID, playerID, credentials)
          .catch((error: unknown) => onError?.(error, matchID, playerID))
          .finally(() => inFlight.delete(key));
      } catch (error) {
        onError?.(error, matchID, playerID);
      }
    }
    for (const key of blockingSince.keys()) {
      if (!live.has(key)) {
        blockingSince.delete(key);
        lastAttempt.delete(key);
      }
    }
  };

  let running = false;
  const timer = setInterval(() => {
    if (running) {
      return;
    }
    running = true;
    void check().finally(() => {
      running = false;
    });
  }, intervalMs);
  timer.unref?.();

  return {
    check,
    stop: () => clearInterval(timer)
  };
};
