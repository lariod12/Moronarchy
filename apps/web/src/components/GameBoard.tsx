import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { MoronarchyState, PlayerState, TileState } from "@moronarchy/core";
import { getTileGridPosition } from "./tile-layout";

const DICE_RESULT_HOLD_MS = 750;
const TOKEN_STEP_DURATION_MS = 260;

type PlayerPositionMap = Record<string, number>;

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
  visiblePlayerIds?: string[];
  showTurnIndicator?: boolean;
  canRoll?: boolean;
  onRollDice?: () => void;
}

const getPlayersOnTile = (players: PlayerState[], tileId: number): PlayerState[] => {
  return players.filter((item) => item.position === tileId && !item.defeated);
};

const getTokenOffset = (players: PlayerState[], player: PlayerState): number => {
  const playersOnTile = getPlayersOnTile(players, player.position);
  if (playersOnTile.length < 2) return 0;

  const playerIndex = playersOnTile.findIndex((item) => item.id === player.id);
  return playerIndex === 0 ? -11 : 11;
};

const getTokenStyle = (players: PlayerState[], player: PlayerState): CSSProperties => {
  const position = getTileGridPosition(player.position);
  return {
    left: `calc(${((position.gridColumn - 0.5) / 11) * 100}% + ${getTokenOffset(players, player)}px)`,
    top: `${((position.gridRow - 0.5) / 11) * 100}%`
  };
};

const getUniquePlayers = (players: PlayerState[]): PlayerState[] => {
  return [...new Map(players.map((player) => [player.id, player])).values()];
};

const getPlayerPositions = (players: PlayerState[]): PlayerPositionMap => {
  return players.reduce<PlayerPositionMap>((positions, player) => {
    positions[player.id] = player.position;
    return positions;
  }, {});
};

const getMovePath = (from: number, steps: number): number[] => {
  return Array.from({ length: steps }, (_, index) => ((from + index) % 40) + 1);
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
  visiblePlayerIds,
  showTurnIndicator = false,
  canRoll = false,
  onRollDice
}: GameBoardProps) => {
  const diceValue = state.lastDiceRoll?.value ?? 5;
  const pips = dicePips[diceValue] ?? ["top-left", "top-right", "center", "bottom-left", "bottom-right"];
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const [showDiceSpeech, setShowDiceSpeech] = useState(false);
  const animatedRollKey = useRef<string | null>(null);
  const isTokenPathAnimating = useRef(false);
  const visiblePlayerIdSet = useMemo(() => (visiblePlayerIds ? new Set(visiblePlayerIds) : null), [visiblePlayerIds]);
  const visiblePlayers = useMemo(
    () =>
      getUniquePlayers(state.players).filter(
        (player) => !player.defeated && (!visiblePlayerIdSet || visiblePlayerIdSet.has(player.id))
      ),
    [state.players, visiblePlayerIdSet]
  );
  const actualPlayerPositions = useMemo(() => getPlayerPositions(visiblePlayers), [visiblePlayers]);
  const actualPlayerPositionsRef = useRef<PlayerPositionMap>(actualPlayerPositions);
  const [visualPlayerPositions, setVisualPlayerPositions] = useState<PlayerPositionMap>(actualPlayerPositions);
  const visualPlayers = useMemo(
    () =>
      visiblePlayers.map((player) => ({
        ...player,
        position: visualPlayerPositions[player.id] ?? player.position
      })),
    [visiblePlayers, visualPlayerPositions]
  );
  const rollAnimationKey = state.lastDiceRoll
    ? [
        state.lastDiceRoll.playerId,
        state.lastDiceRoll.from,
        state.lastDiceRoll.to,
        state.lastDiceRoll.value
      ].join(":")
    : null;
  actualPlayerPositionsRef.current = actualPlayerPositions;

  useEffect(() => {
    if (isTokenPathAnimating.current) return;
    setVisualPlayerPositions(actualPlayerPositions);
  }, [actualPlayerPositions]);

  useLayoutEffect(() => {
    if (!state.lastDiceRoll || !rollAnimationKey) {
      animatedRollKey.current = null;
      isTokenPathAnimating.current = false;
      setMovingPlayerId(null);
      setShowDiceSpeech(false);
      setVisualPlayerPositions(actualPlayerPositionsRef.current);
      return undefined;
    }

    if (animatedRollKey.current === rollAnimationKey) {
      return undefined;
    }

    const roll = state.lastDiceRoll;
    animatedRollKey.current = rollAnimationKey;
    isTokenPathAnimating.current = true;
    setShowDiceSpeech(true);
    setMovingPlayerId(roll.playerId);
    setVisualPlayerPositions({
      ...actualPlayerPositionsRef.current,
      [roll.playerId]: roll.from
    });

    const moveTimers = getMovePath(roll.from, roll.value).map((tileId, index) =>
      window.setTimeout(() => {
        setVisualPlayerPositions((positions) => ({
          ...positions,
          [roll.playerId]: tileId
        }));
      }, DICE_RESULT_HOLD_MS + index * TOKEN_STEP_DURATION_MS)
    );

    const turnTimer = window.setTimeout(() => {
      isTokenPathAnimating.current = false;
      setMovingPlayerId(null);
      setShowDiceSpeech(false);
      setVisualPlayerPositions(actualPlayerPositionsRef.current);
    }, DICE_RESULT_HOLD_MS + roll.value * TOKEN_STEP_DURATION_MS + 80);

    return () => {
      moveTimers.forEach((timerId) => window.clearTimeout(timerId));
      window.clearTimeout(turnTimer);
    };
  }, [rollAnimationKey]);

  return (
    <section className="board-shell" aria-label="Moronarchy board">
      <div className="board-grid">
        {state.tiles.map((tile) => {
          const position = getTileGridPosition(tile.id);
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
            </motion.div>
          );
        })}
        {visualPlayers
          .map((player) => {
            return (
              <span
                key={player.id}
                className={`king-token ${movingPlayerId === player.id ? "is-moving" : ""}`}
                title={player.name}
                style={getTokenStyle(visualPlayers, player)}
              >
                {showTurnIndicator && player.id === currentPlayerId && (
                  <span className="turn-token-callout" aria-hidden="true">
                    <span className="turn-token-caret" />
                  </span>
                )}
                <PlayerMarker label={`${player.name} marker`} />
              </span>
            );
          })}
        <div className="board-center">
          <div className="dice-callout" aria-label="Dice result preview">
            {state.lastDiceRoll && showDiceSpeech && (
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
