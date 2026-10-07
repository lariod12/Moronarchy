import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { maskMatchFor } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";
import { MatchContext } from "../match/MatchProvider";
import type { MatchContextValue, MatchPlayer } from "../match/MatchProvider";
import { createBrowserRandom, createBrowserRng } from "./browser-rng";
import { applyBotStep, applyHumanMove, getBotStyle, HUMAN_ID, SOLO_ROOM_CODE, startSoloGame } from "./solo-match";
import { saveSolo } from "./solo-settings";
import type { SoloSettings, SoloSpeed } from "./solo-settings";

export const SOLO_SETUP_PATH = "/solo";

export interface SoloValue {
  settings: SoloSettings;
  // The unmasked match (the bots need no masking; the screens get the masked one through useMatch).
  match: MatchState;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: SoloSpeed) => void;
  // Lets one bot act (the BotDriver calls this at the bots' pace).
  commitBot: (botId: string) => void;
  // Forgets this game and returns to the setup screen.
  newGame: () => void;
}

const SoloContext = createContext<SoloValue | null>(null);

export const useSolo = (): SoloValue => {
  const value = useContext(SoloContext);
  if (!value) {
    throw new Error("useSolo must be used inside a LocalMatchProvider");
  }
  return value;
};

export interface LocalMatchProviderProps {
  settings: SoloSettings;
  match: MatchState;
  children: ReactNode;
}

// Stands in for the server in a solo game: provides the same MatchContext the online MatchProvider does, but runs the
// real match moves in this tab. The human is seat 0 and the host; the bots only act through the BotDriver.
export const LocalMatchProvider = ({ settings: initialSettings, match: initialMatch, children }: LocalMatchProviderProps) => {
  const navigate = useNavigate();
  const [match, setMatch] = useState(initialMatch);
  const [settings, setSettings] = useState(initialSettings);
  const [paused, setPaused] = useState(false);
  const matchRef = useRef(initialMatch);
  const settingsRef = useRef(initialSettings);
  const closedRef = useRef(false);

  const commit = useCallback((next: MatchState) => {
    matchRef.current = next;
    setMatch(next);
    if (!closedRef.current) {
      saveSolo({ settings: settingsRef.current, match: next });
    }
  }, []);

  // A fresh game (and "Play Again") begins in the lobby with everyone seated: start it from there so that the room
  // screen sees the lobby -> playing change and shows its 3-2-1 countdown. Reads the ref so StrictMode starts it once.
  useLayoutEffect(() => {
    if (matchRef.current.stage !== "lobby") {
      return;
    }
    const next = structuredClone(matchRef.current);
    if (startSoloGame(next, createBrowserRng()).ok) {
      commit(next);
    }
  }, [match, commit]);

  // Forgets the saved game (keeping the settings) and stops saving, as this match is over.
  const forget = useCallback(() => {
    closedRef.current = true;
    saveSolo({ settings: settingsRef.current, match: null });
  }, []);

  const send = useCallback(
    (move: string, ...args: unknown[]) => {
      if (move === "leaveSeat") {
        // Quit: there is no seat to give back, only the saved game to forget.
        forget();
        return;
      }
      const next = applyHumanMove(matchRef.current, move, args, createBrowserRandom());
      if (next) {
        commit(next);
      }
    },
    [commit, forget]
  );

  const commitBot = useCallback(
    (botId: string) => {
      try {
        const next = applyBotStep(matchRef.current, botId, getBotStyle(settingsRef.current.style, botId), createBrowserRng());
        if (next) {
          commit(next);
        }
      } catch (error) {
        // A bot command the engine refused is a bug: stop the bots instead of looping on it.
        console.warn("Bot stopped:", error);
        setPaused(true);
      }
    },
    [commit]
  );

  const setSpeed = useCallback(
    (speed: SoloSpeed) => {
      const next = { ...settingsRef.current, speed };
      settingsRef.current = next;
      setSettings(next);
      if (!closedRef.current) {
        saveSolo({ settings: next, match: matchRef.current });
      }
    },
    []
  );

  const newGame = useCallback(() => {
    forget();
    navigate(SOLO_SETUP_PATH, { replace: true });
  }, [forget, navigate]);

  const players = useMemo<MatchPlayer[]>(() => match.seats.map((seat) => ({ id: seat.playerId, name: seat.name, isConnected: true })), [match.seats]);
  const view = useMemo(() => maskMatchFor(match, HUMAN_ID), [match]);

  const matchValue = useMemo<MatchContextValue>(
    () => ({
      state: view,
      playerID: HUMAN_ID,
      matchID: SOLO_ROOM_CODE,
      roomCode: SOLO_ROOM_CODE,
      players,
      selfConnected: true,
      kicked: false,
      send,
      leaveTo: SOLO_SETUP_PATH
    }),
    [view, players, send]
  );

  const soloValue = useMemo<SoloValue>(
    () => ({ settings, match, paused, setPaused, setSpeed, commitBot, newGame }),
    [settings, match, paused, setSpeed, commitBot, newGame]
  );

  return (
    <SoloContext.Provider value={soloValue}>
      <MatchContext.Provider value={matchValue}>{children}</MatchContext.Provider>
    </SoloContext.Provider>
  );
};
