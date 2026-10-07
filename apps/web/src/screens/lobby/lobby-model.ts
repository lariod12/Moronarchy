import { MATCH_SEATS } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";
import type { MatchPlayer } from "../../match/MatchProvider";

export interface LobbySlotModel {
  playerId: string;
  name: string;
  ready: boolean;
  isHost: boolean;
  isSelf: boolean;
  connected: boolean;
  bubbleText?: string;
}

export interface LobbyChatLine {
  seq: number;
  name: string;
  text: string;
  isSelf: boolean;
}

// Seat N always sits in grid cell N, so a kicked or departed player leaves a visible gap instead of shifting everyone.
export const toLobbySlots = (
  state: MatchState,
  viewerId: string,
  players: MatchPlayer[],
  bubbles: Record<string, string>
): Array<LobbySlotModel | null> => {
  const slots: Array<LobbySlotModel | null> = Array.from({ length: MATCH_SEATS }, () => null);
  for (const seat of state.seats) {
    const index = Number(seat.playerId);
    if (!Number.isInteger(index) || index < 0 || index >= MATCH_SEATS) {
      continue;
    }
    const player = players.find((candidate) => candidate.id === seat.playerId);
    slots[index] = {
      playerId: seat.playerId,
      name: seat.name,
      ready: seat.ready,
      isHost: state.hostId === seat.playerId,
      isSelf: seat.playerId === viewerId,
      // Until the server reports presence for a seat, assume it is online.
      connected: player?.isConnected ?? true,
      bubbleText: bubbles[seat.playerId]
    };
  }
  return slots;
};

export const toChatLines = (state: MatchState, viewerId: string): LobbyChatLine[] =>
  state.chat.map((message) => ({
    seq: message.seq,
    name: message.name,
    text: message.text,
    isSelf: message.playerId === viewerId
  }));
