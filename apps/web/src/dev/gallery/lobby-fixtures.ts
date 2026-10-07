import { createMatchState, getLobbyView, sendChat, setReady, sit } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";
import type { MatchPlayer } from "../../match/MatchProvider";
import { toChatLines, toLobbySlots } from "../../screens/lobby/lobby-model";
import type { LobbyViewProps } from "../../screens/lobby/LobbyView";

export interface LobbyFixtureOptions {
  seats: Array<{ id: string; name: string; ready?: boolean }>;
  chat?: Array<{ id: string; text: string }>;
}

// Builds lobby state with the real core functions, so fixtures can never drift from the lobby rules.
export const createLobbyState = ({ seats, chat = [] }: LobbyFixtureOptions): MatchState => {
  const state = createMatchState();
  for (const seat of seats) {
    sit(state, seat.id, seat.name);
  }
  for (const seat of seats) {
    if (seat.ready) {
      setReady(state, seat.id, true);
    }
  }
  for (const message of chat) {
    sendChat(state, message.id, message.text);
  }
  return state;
};

export interface LobbyPropsOptions {
  players?: MatchPlayer[];
  bubbles?: Record<string, string>;
}

export const toLobbyViewProps = (
  state: MatchState,
  viewerId: string,
  roomCode: string,
  { players = [], bubbles = {} }: LobbyPropsOptions = {}
): Pick<LobbyViewProps, "roomCode" | "slots" | "chat" | "lobby"> => ({
  roomCode,
  slots: toLobbySlots(state, viewerId, players, bubbles),
  chat: toChatLines(state, viewerId),
  lobby: getLobbyView(state, viewerId)
});

const CHAT = [
  { id: "0", text: "Do something" },
  { id: "0", text: "don't leave me alonee" },
  { id: "1", text: "stupid userr" }
];

export const lobbyHostWaiting = (): MatchState =>
  createLobbyState({
    seats: [
      { id: "0", name: "Alice" },
      { id: "1", name: "Bob", ready: true },
      { id: "2", name: "Cara" }
    ],
    chat: CHAT
  });

export const lobbyHostCanStart = (): MatchState =>
  createLobbyState({
    seats: [
      { id: "0", name: "Alice" },
      { id: "1", name: "Bob", ready: true },
      { id: "2", name: "Cara", ready: true }
    ],
    chat: CHAT
  });

export const lobbyGuestReady = (): MatchState =>
  createLobbyState({
    seats: [
      { id: "0", name: "Alice", ready: true },
      { id: "1", name: "Bob", ready: true },
      { id: "2", name: "Cara" },
      { id: "3", name: "Dan", ready: true }
    ],
    chat: CHAT
  });
