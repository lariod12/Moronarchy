// Who is connected right now, as far as the lobby metadata knows. boardgame.io keeps `players[id].isConnected` in the
// match metadata (set on every socket connect / disconnect); the tracker is fed from every metadata write and adds
// the one thing the metadata lacks: since when a seated player has been gone.

export interface PresencePlayer {
  name?: unknown;
  isConnected?: boolean;
}

export interface AbsentPlayer {
  matchID: string;
  playerID: string;
  since: number;
}

export interface PresenceTracker {
  update: (matchID: string, players: Record<string, PresencePlayer> | undefined) => void;
  // Timestamp the player was first seen disconnected, or null when they are connected, unseated or never connected yet.
  absentSince: (matchID: string, playerID: string) => number | null;
  listAbsent: () => AbsentPlayer[];
  forget: (matchID: string) => void;
}

interface Entry {
  // A player who joined but was never seen connected is still loading the page: not absent.
  seenConnected: boolean;
  absentSince: number | null;
}

export const createPresenceTracker = (now: () => number = Date.now): PresenceTracker => {
  const matches = new Map<string, Map<string, Entry>>();

  return {
    update: (matchID, players) => {
      const entries = matches.get(matchID) ?? new Map<string, Entry>();
      for (const [playerID, player] of Object.entries(players ?? {})) {
        const seated = typeof player.name === "string" && player.name.length > 0;
        if (!seated) {
          entries.delete(playerID);
          continue;
        }
        const entry = entries.get(playerID) ?? { seenConnected: false, absentSince: null };
        if (player.isConnected === true) {
          entry.seenConnected = true;
          entry.absentSince = null;
        } else if (player.isConnected === false && entry.seenConnected && entry.absentSince === null) {
          entry.absentSince = now();
        }
        entries.set(playerID, entry);
      }
      matches.set(matchID, entries);
    },
    absentSince: (matchID, playerID) => matches.get(matchID)?.get(playerID)?.absentSince ?? null,
    listAbsent: () => {
      const absent: AbsentPlayer[] = [];
      for (const [matchID, entries] of matches) {
        for (const [playerID, entry] of entries) {
          if (entry.absentSince !== null) {
            absent.push({ matchID, playerID, since: entry.absentSince });
          }
        }
      }
      return absent;
    },
    forget: (matchID) => {
      matches.delete(matchID);
    }
  };
};
