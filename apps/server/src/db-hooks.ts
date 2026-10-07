import type { PresencePlayer, PresenceTracker } from "./presence.js";

interface PlayerMetadata extends PresencePlayer {
  credentials?: unknown;
  [key: string]: unknown;
}

interface MatchMetadata {
  players?: Record<string, PlayerMetadata | undefined>;
}

interface MatchStateRecord {
  G?: { seats?: { playerId: string }[] };
}

type MaybePromise<T> = T | Promise<T>;

export interface HookedDatabase {
  fetch?: (matchID: string, opts: { state?: true; metadata?: true }) => MaybePromise<{ state?: MatchStateRecord; metadata?: MatchMetadata }>;
  setMetadata?: (matchID: string, metadata: MatchMetadata) => unknown;
  setState?: (matchID: string, state: MatchStateRecord, deltalog?: unknown) => unknown;
  wipe?: (matchID: string) => unknown;
}

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";

// Runs `next` with the value, synchronously for the default in-memory database and after the promise for async ones.
const then = <T, R>(value: MaybePromise<T>, next: (resolved: T) => R | Promise<R>): R | Promise<R> =>
  isPromiseLike(value) ? (value as Promise<T>).then(next) : next(value);

const seatIds = (state: MatchStateRecord | undefined): string[] => (state?.G?.seats ?? []).map((seat) => seat.playerId);

export interface DbHooksOptions {
  presence: PresenceTracker;
}

// Server-side bookkeeping that boardgame.io does not do on its own. Install after applyLobbySecurity so every hook
// sees the final metadata.
//  - presence: feeds the tracker from every metadata write (that is where boardgame.io records connect/disconnect).
//  - slot release: a seat removed from the match state (host kick, Quit / leaveSeat) also frees its boardgame.io
//    player slot, so the room can seat someone new and the old credentials stop working. The default in-memory
//    database hands out its live metadata objects, which is what makes the in-place edit safe against the metadata
//    write boardgame.io does at the end of a move.
export const installDbHooks = (db: HookedDatabase, { presence }: DbHooksOptions): void => {
  const setMetadata = db.setMetadata?.bind(db);
  if (setMetadata) {
    db.setMetadata = (matchID, metadata) => {
      presence.update(matchID, metadata.players as Record<string, PresencePlayer> | undefined);
      return setMetadata(matchID, metadata);
    };
  }

  const wipe = db.wipe?.bind(db);
  if (wipe) {
    db.wipe = (matchID) => {
      presence.forget(matchID);
      return wipe(matchID);
    };
  }

  const setState = db.setState?.bind(db);
  const fetch = db.fetch?.bind(db);
  if (setState && fetch) {
    db.setState = (matchID, state, deltalog) => {
      return then(fetch(matchID, { state: true }), ({ state: previous }) => {
        const result = setState(matchID, state, deltalog);
        const kept = new Set(seatIds(state));
        const removed = seatIds(previous).filter((id) => !kept.has(id));
        if (removed.length === 0) {
          return result;
        }
        return then(fetch(matchID, { metadata: true }), ({ metadata }) => {
          if (!metadata?.players) {
            return result;
          }
          for (const id of removed) {
            const player = metadata.players[id];
            if (player) {
              delete player.name;
              delete player.credentials;
              delete player.isConnected;
            }
          }
          db.setMetadata?.(matchID, metadata);
          return result;
        });
      });
    };
  }
};
