import { AnimatePresence, motion } from "motion/react";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router";
import type { MoronarchyState } from "@moronarchy/core";
import { ActionPanel } from "./ActionPanel";
import { GameBoard } from "./GameBoard";
import { PlayerHud } from "./PlayerHud";

interface GameTableProps {
  G: MoronarchyState;
  ctx: {
    currentPlayer: string;
    gameover?: { winner?: string };
  };
  moves: {
    [moveName: string]: (...args: unknown[]) => void;
  };
  playerID?: string | null;
  matchID?: string;
  isActive?: boolean;
  isConnected?: boolean;
}

export const GameTable = ({
  G,
  ctx,
  moves,
  playerID,
  matchID = "local",
  isActive = false
}: GameTableProps) => {
  const navigate = useNavigate();
  const currentPlayerId = playerID ?? "0";
  const winner = G.winnerId ?? ctx.gameover?.winner ?? null;
  const latestLog = G.logs[0]?.message ?? "Roll dice and claim the kingdom.";
  const currentPlayer = G.players.find((player) => player.id === currentPlayerId);
  const canRoll = isActive && G.phase === "rolling" && !currentPlayer?.defeated;

  return (
    <main className="phone-frame game-screen screen-ingame-main-board-your-turn">
      <header className="frame-top">
        <span className="tag">Round {Math.min(G.currentRound, G.maxRounds)}</span>
        <span className="tag center">{matchID.slice(0, 6)}</span>
        <button className="map-button" type="button" aria-label="Open map overview">
          Map
        </button>
      </header>

      <GameBoard
        state={G}
        currentPlayerId={currentPlayerId}
        canRoll={canRoll}
        latestLog={latestLog}
        onRollDice={() => moves.rollDice?.()}
      />

      {G.phase === "tile-action" && (
        <ActionPanel
          state={G}
          playerId={currentPlayerId}
          isActive={isActive}
          moves={{
            rollDice: () => moves.rollDice?.(),
            buyLand: () => moves.buyLand?.(),
            upgradeLand: () => moves.upgradeLand?.(),
            skipTileAction: () => moves.skipTileAction?.()
          }}
        />
      )}

      <PlayerHud state={G} playerId={currentPlayerId} matchID={matchID} />

      <AnimatePresence>
        {winner && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="result-modal"
              initial={{ scale: 0.94, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 18 }}
            >
              <Crown size={38} />
              <span>Game Over</span>
              <strong>Player {Number(winner) + 1} wins</strong>
              <button className="primary-action" onClick={() => navigate(`/result/${matchID}`)}>
                View result
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};
