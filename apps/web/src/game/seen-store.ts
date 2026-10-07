import type { PlayerId } from "@moronarchy/core/engine";

// What this browser tab already showed, kept in sessionStorage so a reload does not replay popups.
// Storage can be missing or throw (private windows, blocked site data), so every access is guarded.

export interface SeenSnapshot {
  seq: number | null;
  dismissed: string[];
}

const key = (gameId: string, playerId: PlayerId): string => `moronarchy:seen:${gameId}:${playerId}`;

export const loadSeen = (gameId: string, playerId: PlayerId): SeenSnapshot => {
  try {
    const raw = sessionStorage.getItem(key(gameId, playerId));
    if (!raw) {
      return { seq: null, dismissed: [] };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const { seq, dismissed } = parsed as { seq?: unknown; dismissed?: unknown };
      return {
        seq: typeof seq === "number" ? seq : null,
        dismissed: Array.isArray(dismissed) ? dismissed.filter((value): value is string => typeof value === "string") : []
      };
    }
  } catch {
    // fall through to an empty snapshot
  }
  return { seq: null, dismissed: [] };
};

export const saveSeen = (gameId: string, playerId: PlayerId, snapshot: SeenSnapshot): void => {
  try {
    sessionStorage.setItem(key(gameId, playerId), JSON.stringify(snapshot));
  } catch {
    // the popups may repeat after a reload, which is acceptable
  }
};
