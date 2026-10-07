import { sanitizePlayerName } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";

export type SoloStyle = "careful" | "aggressive" | "mixed";
export type SoloSpeed = "slow" | "normal" | "fast";

export interface SoloSettings {
  name: string;
  bots: number;
  style: SoloStyle;
  speed: SoloSpeed;
}

export const MIN_BOTS = 1;
export const MAX_BOTS = 5;

export const SOLO_STYLES: readonly SoloStyle[] = ["careful", "aggressive", "mixed"];
export const SOLO_SPEEDS: readonly SoloSpeed[] = ["slow", "normal", "fast"];

export const DEFAULT_SOLO_SETTINGS: SoloSettings = { name: "", bots: 3, style: "mixed", speed: "normal" };

// Pause between two bot actions.
export const BOT_DELAY_MS: Record<SoloSpeed, number> = { slow: 1200, normal: 600, fast: 150 };

export const SOLO_STORAGE_KEY = "moronarchy:solo";
const STORAGE_VERSION = 1;

// Settings and the running match live under one key: reloading keeps the game, "Quit" keeps only the settings.
export interface SoloSave {
  settings: SoloSettings;
  match: MatchState | null;
}

export const sanitizeSettings = (value: unknown): SoloSettings => {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const bots = typeof raw.bots === "number" && Number.isInteger(raw.bots) ? Math.min(MAX_BOTS, Math.max(MIN_BOTS, raw.bots)) : DEFAULT_SOLO_SETTINGS.bots;
  return {
    name: sanitizePlayerName(raw.name),
    bots,
    style: SOLO_STYLES.find((style) => style === raw.style) ?? DEFAULT_SOLO_SETTINGS.style,
    speed: SOLO_SPEEDS.find((speed) => speed === raw.speed) ?? DEFAULT_SOLO_SETTINGS.speed
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

// Enough structure to be sure the UI and the engine will not crash on it; anything else counts as corrupt.
export const isPlausibleMatch = (value: unknown): value is MatchState => {
  if (!isRecord(value) || !Array.isArray(value.seats) || value.seats.length < 2 || typeof value.gamesPlayed !== "number") {
    return false;
  }
  if (value.stage === "lobby") {
    return true;
  }
  if (value.stage !== "playing" && value.stage !== "finished") {
    return false;
  }
  const game = value.game;
  return (
    isRecord(game) &&
    (game.phase === "playing" || game.phase === "finished") &&
    isRecord(game.kings) &&
    isRecord(game.turn) &&
    Array.isArray(game.plots) &&
    typeof game.round === "number" &&
    value.seats.every((seat) => isRecord(seat) && typeof seat.playerId === "string" && isRecord(game.kings) && game.kings[seat.playerId] !== undefined)
  );
};

export const loadSolo = (): SoloSave => {
  try {
    const raw = localStorage.getItem(SOLO_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed) && parsed.version === STORAGE_VERSION) {
        return { settings: sanitizeSettings(parsed.settings), match: isPlausibleMatch(parsed.match) ? parsed.match : null };
      }
    }
  } catch {
    // Missing, blocked or corrupt storage falls back to the setup screen.
  }
  return { settings: { ...DEFAULT_SOLO_SETTINGS }, match: null };
};

export const saveSolo = (save: SoloSave): void => {
  try {
    localStorage.setItem(SOLO_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, settings: save.settings, match: save.match }));
  } catch {
    // The game still runs; it just cannot be resumed after a reload.
  }
};

// Forgets the running match but keeps the settings (the setup screen prefills from them).
export const clearSoloMatch = (): void => {
  saveSolo({ settings: loadSolo().settings, match: null });
};
