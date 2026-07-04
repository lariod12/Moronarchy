import { Client, type BoardProps } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import type { ComponentType } from "react";
import { GAME_SERVER_URL } from "@/api/lobby";
import { GameTable } from "@/components/GameTable";
import type { MoronarchyState } from "@moronarchy/core";
import { MoronarchyGame } from "./moronarchy-game";

const BoardgameClient = Client({
  game: MoronarchyGame,
  board: GameTable as ComponentType<BoardProps<MoronarchyState>>,
  multiplayer: SocketIO({ server: GAME_SERVER_URL }),
  debug: false
});

interface GameClientProps {
  matchID: string;
  playerID: string;
  credentials: string;
}

export const GameClient = ({ matchID, playerID, credentials }: GameClientProps) => {
  return <BoardgameClient matchID={matchID} playerID={playerID} credentials={credentials} />;
};
