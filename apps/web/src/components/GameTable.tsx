import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router";
import { getStartingPlayerId } from "@/api/game-start";
import {
  canBuyLand,
  getLandEconomy,
  getPlayerTile,
  getUpgradeableOwnedLands,
  getUpgradeCost,
  type MoronarchyState
} from "@moronarchy/core";
import { GameBoard } from "./GameBoard";
import { PlayerHud } from "./PlayerHud";

const LAND_PURCHASE_POPUP_DELAY_MS = 2000;

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
  matchData?: Array<{
    id: number;
    name?: string;
    isConnected?: boolean;
  }>;
  isActive?: boolean;
  isConnected?: boolean;
}

export const GameTable = ({
  G,
  ctx,
  moves,
  playerID,
  matchID = "local",
  matchData,
  isActive = false
}: GameTableProps) => {
  const navigate = useNavigate();
  const currentPlayerId = playerID ?? "0";
  const [isLandPurchasePopupReady, setIsLandPurchasePopupReady] = useState(false);
  const startingPlayerId = getStartingPlayerId(matchID);
  const startingPlayerMoveQueued = useRef(false);
  const winner = G.winnerId ?? ctx.gameover?.winner ?? null;
  const currentPlayer = G.players.find((player) => player.id === currentPlayerId);
  const canRoll = isActive && G.phase === "rolling" && !currentPlayer?.defeated;
  const showTurnIndicator = currentPlayerId === ctx.currentPlayer && !currentPlayer?.defeated;
  const currentTile = getPlayerTile(G, currentPlayerId);
  const currentLandEconomy = currentTile?.type === "land" ? getLandEconomy(currentTile.id) : null;
  const isCurrentPlayerTurn = isActive && currentPlayerId === ctx.currentPlayer && !currentPlayer?.defeated;
  const isUnownedCurrentLand =
    isCurrentPlayerTurn &&
    G.phase === "tile-action" &&
    currentTile?.type === "land" &&
    currentTile.ownerId === null;
  const canPurchaseCurrentLand = canBuyLand(G, currentPlayerId);
  const isLapUpgradeReady = isCurrentPlayerTurn && G.phase === "lap-upgrade";
  const upgradeableOwnedLands = isLapUpgradeReady ? getUpgradeableOwnedLands(G, currentPlayerId) : [];
  const joinedPlayerIds = useMemo(() => {
    const joinedIds = matchData
      ?.filter((player) => player.name)
      .map((player) => String(player.id));

    if (!joinedIds?.length) return undefined;

    return joinedIds.includes(currentPlayerId) ? joinedIds : [...joinedIds, currentPlayerId];
  }, [currentPlayerId, matchData]);

  useEffect(() => {
    if (!startingPlayerId || startingPlayerMoveQueued.current) return;
    if (playerID !== "0" || G.startingPlayerId || ctx.currentPlayer !== "0") return;
    if (matchData && (!joinedPlayerIds || joinedPlayerIds.length < 2)) return;

    startingPlayerMoveQueued.current = true;
    moves.chooseStartingPlayer?.(startingPlayerId, joinedPlayerIds);
  }, [G.startingPlayerId, ctx.currentPlayer, joinedPlayerIds, matchData, moves, playerID, startingPlayerId]);

  useEffect(() => {
    setIsLandPurchasePopupReady(false);

    if (!isUnownedCurrentLand) return undefined;

    const timerId = window.setTimeout(() => {
      setIsLandPurchasePopupReady(true);
    }, LAND_PURCHASE_POPUP_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [
    currentTile?.id,
    G.lastDiceRoll?.from,
    G.lastDiceRoll?.playerId,
    G.lastDiceRoll?.to,
    G.lastDiceRoll?.value,
    isUnownedCurrentLand
  ]);

  return (
    <main className="phone-frame game-screen screen-ingame-main-board-your-turn">
      <header className="frame-top">
        <span className="tag">Round {Math.min(G.currentRound, G.maxRounds)}</span>
        <span className="tag center">{matchID.slice(0, 6)}</span>
      </header>

      <GameBoard
        state={G}
        currentPlayerId={currentPlayerId}
        turnPlayerId={ctx.currentPlayer}
        visiblePlayerIds={joinedPlayerIds}
        showTurnIndicator={showTurnIndicator}
        canRoll={canRoll}
        onRollDice={() => moves.rollDice?.()}
      />

      <PlayerHud state={G} playerId={currentPlayerId} matchID={matchID} />

      <AnimatePresence>
        {isUnownedCurrentLand && isLandPurchasePopupReady && currentTile && currentLandEconomy && (
          <motion.div
            className="land-purchase-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="land-purchase-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="land-purchase-title"
              initial={{ scale: 0.96, y: 14, rotate: -1 }}
              animate={{ scale: 1, y: 0, rotate: -1 }}
              exit={{ scale: 0.96, y: 14, rotate: -1 }}
            >
              <div className="land-purchase-copy">
                <span className="land-purchase-kicker">Tile {String(currentTile.id).padStart(2, "0")}</span>
                <strong id="land-purchase-title">Buy this land?</strong>
                <span>Price: {currentLandEconomy.price} coin</span>
              </div>
              <div className="land-purchase-actions">
                <button type="button" className="ghost-action" onClick={() => moves.skipTileAction?.()}>
                  Skip
                </button>
                <button
                  type="button"
                  className="primary-action"
                  disabled={!canPurchaseCurrentLand}
                  onClick={() => moves.buyLand?.()}
                >
                  Buy
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLapUpgradeReady && upgradeableOwnedLands.length > 0 && (
          <motion.div
            className="land-purchase-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="land-purchase-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="lap-upgrade-title"
              initial={{ scale: 0.96, y: 14, rotate: -1 }}
              animate={{ scale: 1, y: 0, rotate: -1 }}
              exit={{ scale: 0.96, y: 14, rotate: -1 }}
            >
              <div className="land-purchase-copy">
                <span className="land-purchase-kicker">King Level {currentPlayer?.level ?? 1}</span>
                <strong id="lap-upgrade-title">Upgrade owned land?</strong>
                <span>One royal upgrade is available.</span>
              </div>
              <div className="lap-upgrade-list">
                {upgradeableOwnedLands.map((tile) => {
                  const cost = getUpgradeCost(tile.id, tile.landLevel);
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className="lap-upgrade-option"
                      onClick={() => moves.upgradeLand?.(tile.id)}
                    >
                      <span>Tile {String(tile.id).padStart(2, "0")}</span>
                      <strong>
                        L{tile.landLevel} to L{tile.landLevel + 1}
                      </strong>
                      <span>{cost} coin</span>
                    </button>
                  );
                })}
              </div>
              <div className="land-purchase-actions">
                <button type="button" className="ghost-action" onClick={() => moves.skipTileAction?.()}>
                  Skip
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
