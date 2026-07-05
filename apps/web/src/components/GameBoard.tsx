import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { MoronarchyState, PlayerState, TileState } from "@moronarchy/core";
import { getTileGridPosition } from "./tile-layout";

const DICE_RESULT_HOLD_MS = 750;
const TOKEN_MOVE_DURATION_MS = 1250;

const dicePips: Record<number, string[]> = {
  1: ["center"],
  2: ["top-left", "bottom-right"],
  3: ["top-left", "center", "bottom-right"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"]
};

interface GameBoardProps {
  state: MoronarchyState;
  currentPlayerId: string;
  turnPlayerId?: string;
  showTurnIndicator?: boolean;
  canRoll?: boolean;
  onRollDice?: () => void;
}

type PlayerPositionMap = Record<string, number>;

const getTurnPlayerOnTile = (
  players: PlayerState[],
  tileId: number,
  turnPlayerId: string
): PlayerState[] => {
  const player = players.find((item) => item.id === turnPlayerId && item.position === tileId && !item.defeated);
  return player ? [player] : [];
};

const getPlayerPositions = (players: PlayerState[]): PlayerPositionMap => {
  return players.reduce<PlayerPositionMap>((positions, player) => {
    positions[player.id] = player.position;
    return positions;
  }, {});
};

const getTileClass = (tile: TileState, currentPlayerId: string): string => {
  const classes = ["tile", `tile-${tile.type}`];
  if (tile.ownerId !== null) classes.push("is-owned");
  if (tile.ownerId === currentPlayerId) classes.push("is-owned-self");
  classes.push(tile.id % 2 === 0 ? "is-tilted-right" : "is-tilted-left");
  return classes.join(" ");
};

const PlayerMarker = ({ label }: { label: string }) => (
  <span className="tile-marker" role="img" aria-label={label}>
    <span className="tile-marker-part tile-marker-head" />
    <span className="tile-marker-part tile-marker-body" />
    <span className="tile-marker-part tile-marker-arm tile-marker-arm-left" />
    <span className="tile-marker-part tile-marker-arm tile-marker-arm-right" />
    <span className="tile-marker-part tile-marker-leg tile-marker-leg-left" />
    <span className="tile-marker-part tile-marker-leg tile-marker-leg-right" />
  </span>
);

export const GameBoard = ({
  state,
  currentPlayerId,
  turnPlayerId = currentPlayerId,
  showTurnIndicator = false,
  canRoll = false,
  onRollDice
}: GameBoardProps) => {
  const diceValue = state.lastDiceRoll?.value ?? 5;
  const pips = dicePips[diceValue] ?? ["top-left", "top-right", "center", "bottom-left", "bottom-right"];
  const actualPlayerPositions = useMemo(() => getPlayerPositions(state.players), [state.players]);
  const [visualPlayerPositions, setVisualPlayerPositions] = useState<PlayerPositionMap>(actualPlayerPositions);
  const [visualTurnPlayerId, setVisualTurnPlayerId] = useState(turnPlayerId);
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const animatedRollKey = useRef<string | null>(null);
  const latestTurnPlayerId = useRef(turnPlayerId);
  const isRollAnimationActive = useRef(false);
  const rollAnimationKey = state.lastDiceRoll
    ? [
        state.lastDiceRoll.playerId,
        state.lastDiceRoll.from,
        state.lastDiceRoll.to,
        state.lastDiceRoll.value
      ].join(":")
    : null;
  const visualPlayers = useMemo(
    () => state.players.map((player) => ({
      ...player,
      position: visualPlayerPositions[player.id] ?? player.position
    })),
    [state.players, visualPlayerPositions]
  );

  useEffect(() => {
    if (!state.lastDiceRoll || !rollAnimationKey) {
      animatedRollKey.current = null;
      isRollAnimationActive.current = false;
      setVisualPlayerPositions(actualPlayerPositions);
      setVisualTurnPlayerId(latestTurnPlayerId.current);
      setMovingPlayerId(null);
      return undefined;
    }

    if (animatedRollKey.current === rollAnimationKey) {
      return undefined;
    }

    animatedRollKey.current = rollAnimationKey;
    isRollAnimationActive.current = true;
    setVisualTurnPlayerId(state.lastDiceRoll.playerId);
    setVisualPlayerPositions({
      ...actualPlayerPositions,
      [state.lastDiceRoll.playerId]: state.lastDiceRoll.from
    });
    setMovingPlayerId(null);

    const moveTimer = window.setTimeout(() => {
      setMovingPlayerId(state.lastDiceRoll?.playerId ?? null);
      setVisualPlayerPositions(actualPlayerPositions);
    }, DICE_RESULT_HOLD_MS);

    const turnTimer = window.setTimeout(() => {
      isRollAnimationActive.current = false;
      setMovingPlayerId(null);
      setVisualPlayerPositions(actualPlayerPositions);
      setVisualTurnPlayerId(latestTurnPlayerId.current);
    }, DICE_RESULT_HOLD_MS + TOKEN_MOVE_DURATION_MS);

    return () => {
      window.clearTimeout(moveTimer);
      window.clearTimeout(turnTimer);
    };
  }, [actualPlayerPositions, rollAnimationKey, state.lastDiceRoll]);

  useEffect(() => {
    latestTurnPlayerId.current = turnPlayerId;

    if (isRollAnimationActive.current) return;

    setVisualPlayerPositions(actualPlayerPositions);
    setVisualTurnPlayerId(turnPlayerId);
    setMovingPlayerId(null);
  }, [actualPlayerPositions, turnPlayerId]);

  return (
    <section className="board-shell" aria-label="Moronarchy board">
      <div className="board-grid">
        {state.tiles.map((tile) => {
          const position = getTileGridPosition(tile.id);
          const occupants = getTurnPlayerOnTile(visualPlayers, tile.id, visualTurnPlayerId);
          return (
            <motion.div
              layout
              key={tile.id}
              className={getTileClass(tile, currentPlayerId)}
              style={{
                gridColumn: position.gridColumn,
                gridRow: position.gridRow
              }}
            >
              <span className="tile-id">{String(tile.id).padStart(2, "0")}</span>
              {tile.ownerId !== null && tile.ownerId !== currentPlayerId && (
                <span className="tile-owner">P{Number(tile.ownerId) + 1}</span>
              )}
              <div className="token-stack">
                {occupants.map((player) => (
                  <motion.span
                    layoutId={`token-${player.id}`}
                    key={player.id}
                    className={`king-token ${movingPlayerId === player.id ? "is-moving" : ""}`}
                    title={player.name}
                    transition={{ layout: { duration: TOKEN_MOVE_DURATION_MS / 1000, ease: "easeInOut" } }}
                  >
                    {showTurnIndicator && player.id === currentPlayerId && (
                      <span className="turn-token-callout" aria-hidden="true">
                        <span className="turn-token-caret" />
                      </span>
                    )}
                    <PlayerMarker label={`${player.name} marker`} />
                  </motion.span>
                ))}
              </div>
            </motion.div>
          );
        })}
        <div className="board-center">
          <div className="dice-callout" aria-label="Dice result preview">
            {state.lastDiceRoll && (
              <div className="speech-bubble" aria-live="polite">
                <span className="speech-text">{state.lastDiceRoll.value}</span>
              </div>
            )}
            <motion.div
              key={state.lastDiceRoll?.value ?? "idle"}
              className="dice"
              data-dice-face={diceValue}
              aria-hidden="true"
              animate={state.lastDiceRoll ? { rotate: [0, -8, 8, 0], scale: [1, 1.06, 1] } : undefined}
            >
              {pips.map((position) => (
                <span key={position} className={`pip pip--${position}`} />
              ))}
            </motion.div>
            <button className="tap-scroll" type="button" disabled={!canRoll} onClick={onRollDice}>
              {canRoll ? "Tap to Scroll" : "Waiting"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
