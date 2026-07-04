import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleDollarSign, Dice5, Hammer, SkipForward } from "lucide-react";
import {
  canBuyLand,
  canUpgradeLand,
  getLandEconomy,
  getPlayer,
  getPlayerTile,
  getUpgradeCost,
  type MoronarchyState
} from "@moronarchy/core";

interface ActionPanelProps {
  state: MoronarchyState;
  playerId: string;
  isActive: boolean;
  moves: {
    rollDice: () => void;
    buyLand: () => void;
    upgradeLand: () => void;
    skipTileAction: () => void;
  };
}

export const ActionPanel = ({ state, playerId, isActive, moves }: ActionPanelProps) => {
  const reducedMotion = useReducedMotion();
  const player = getPlayer(state, playerId);
  const tile = getPlayerTile(state, playerId);
  const canRoll = isActive && state.phase === "rolling" && !player?.defeated;
  const buyable = isActive && canBuyLand(state, playerId);
  const upgradeable = isActive && canUpgradeLand(state, playerId);
  const economy = tile?.type === "land" ? getLandEconomy(tile.id) : null;
  const upgradeCost = tile?.type === "land" ? getUpgradeCost(tile.id, tile.landLevel) : 0;

  return (
    <section className="action-panel">
      <AnimatePresence mode="wait">
        {state.phase === "rolling" && (
          <motion.div
            key="roll"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
            className="action-card"
          >
            <div>
              <strong>{canRoll ? "Your turn" : "Waiting for rival king"}</strong>
              <span>Roll the dice to march around the kingdom.</span>
            </div>
            <button className="primary-action" disabled={!canRoll} onClick={moves.rollDice}>
              <Dice5 size={20} />
              Roll
            </button>
          </motion.div>
        )}
        {state.phase === "tile-action" && (
          <motion.div
            key="tile-action"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
            className="action-card"
          >
            <div>
              <strong>Tile {tile ? String(tile.id).padStart(2, "0") : "--"}</strong>
              <span>
                {tile?.ownerId
                  ? `Owned by Player ${Number(tile.ownerId) + 1}.`
                  : `Price ${economy?.price ?? 0} coin.`}
              </span>
            </div>
            <div className="action-row">
              {tile?.ownerId === null && (
                <button className="primary-action" disabled={!buyable} onClick={moves.buyLand}>
                  <CircleDollarSign size={18} />
                  Buy
                </button>
              )}
              {tile?.ownerId === playerId && (
                <button className="primary-action" disabled={!upgradeable} onClick={moves.upgradeLand}>
                  <Hammer size={18} />
                  {upgradeCost > 0 ? `Upgrade ${upgradeCost}` : "Max"}
                </button>
              )}
              <button className="ghost-action" disabled={!isActive} onClick={moves.skipTileAction}>
                <SkipForward size={18} />
                Skip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
