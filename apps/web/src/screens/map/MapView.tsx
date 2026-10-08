import { HORSE_MOVE_BONUS, getItemCount } from "@moronarchy/core/engine";
import type { GameState, PlayerId, TileId } from "@moronarchy/core/engine";
import { Button } from "../../ui/Button/Button";
import { Dice } from "../../ui/Dice/Dice";
import { SpeechBubble } from "../../ui/SpeechBubble/SpeechBubble";
import { MapBoard } from "./MapBoard";
import "./MapView.css";

export interface MapViewProps {
  game: GameState;
  viewerId: PlayerId;
  positions: Record<PlayerId, TileId>;
  // Kings the server reports as disconnected.
  offlineIds?: ReadonlySet<PlayerId>;
  canRoll: boolean;
  canUseHorse?: boolean;
  rolling?: boolean;
  // The turn player token is still walking: popups wait (exposed for browser checks).
  animating?: boolean;
  onRoll?: () => void;
  onUseHorse?: () => void;
  // A fight the viewer is not part of is running: open it as a spectator.
  onWatchFight?: () => void;
}

const isDieValue = (value: number): value is 1 | 2 | 3 | 4 | 5 | 6 => Number.isInteger(value) && value >= 1 && value <= 6;

// A short line under the roll button that tells the viewer what is going on.
export const getMapHint = (game: GameState, viewerId: PlayerId): string => {
  const king = game.kings[viewerId];
  if (!king || king.eliminated) {
    return "You are watching";
  }
  const turnKing = game.kings[game.turn.playerId];
  if (game.turn.playerId !== viewerId) {
    return `${turnKing?.name ?? "Someone"}'s turn`;
  }
  switch (game.turn.step) {
    case "preRoll":
      return "Your turn: roll the dice";
    case "fight":
      return "Fight in progress";
    default:
      return "";
  }
};

export const MapView = ({ game, viewerId, positions, offlineIds, canRoll, canUseHorse = true, rolling = false, animating = false, onRoll, onUseHorse, onWatchFight }: MapViewProps) => {
  const { turn } = game;
  const viewer = game.kings[viewerId];
  const showHorse =
    turn.playerId === viewerId && turn.step === "preRoll" && !turn.horseUsed && viewer !== undefined && getItemCount(viewer, "horse") > 0;
  const dice = turn.dice;
  const hint = getMapHint(game, viewerId);

  return (
    <div className="map" data-animating={String(animating)}>
      <MapBoard game={game} viewerId={viewerId} positions={positions} offlineIds={offlineIds}>
        <div className="map-center">
          <div className="map-center__dice">
            <Dice value={dice && isDieValue(dice.value) ? dice.value : 1} rolling={rolling} size={64} />
            {dice ? (
              <SpeechBubble tail="bottom-left" className="map-center__bubble">
                <span data-testid="dice-total">{dice.value + dice.bonus}</span>
              </SpeechBubble>
            ) : null}
          </div>
          <Button size="sm" onClick={onRoll} disabled={!canRoll}>
            Tap to Roll
          </Button>
          {showHorse ? (
            <Button size="sm" onClick={onUseHorse} disabled={!canUseHorse}>
              {`Use Horse (+${HORSE_MOVE_BONUS})`}
            </Button>
          ) : null}
          {onWatchFight ? (
            <Button size="sm" onClick={onWatchFight}>
              Watch the fight
            </Button>
          ) : null}
          {hint ? <p className="map-center__hint">{hint}</p> : null}
        </div>
      </MapBoard>
    </div>
  );
};
