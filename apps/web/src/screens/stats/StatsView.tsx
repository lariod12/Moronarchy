import { ChevronLeft, ChevronRight } from "lucide-react";
import { getKingInfo } from "@moronarchy/core/engine";
import type { GameState, KingInfo, PlayerId } from "@moronarchy/core/engine";
import { Avatar } from "../../ui/Avatar/Avatar";
import { IconButton } from "../../ui/IconButton/IconButton";
import { InfoCard } from "../info/InfoCard";
import { EmptyState } from "../info/EmptyState";
import "../info/info-page.css";
import "./StatsView.css";

export interface StatsViewProps {
  game: GameState;
  // Whose page this is.
  playerId: PlayerId;
  viewerId: PlayerId;
  // Step to the king before / after in turn order (not given when there is only one king).
  onPrev?: () => void;
  onNext?: () => void;
}

// "Attack: 7 (+2)": the effective value with the equipment part shown separately.
const withBonus = (value: number, bonus: number): string => (bonus > 0 ? `${value} (+${bonus})` : String(value));

export const getStatRows = (info: KingInfo): Array<{ label: string; value: string | number }> => [
  { label: "Level", value: info.level },
  { label: "Coin", value: info.coin },
  { label: "Health", value: info.health },
  { label: "Max Health", value: info.maxHealth },
  { label: "Attack", value: withBonus(info.attack, info.bonus.attack) },
  { label: "Defense", value: withBonus(info.defense, info.bonus.defense) },
  { label: "Lucky", value: withBonus(info.lucky, info.bonus.lucky) },
  { label: "Laps", value: info.laps },
  { label: "Plots", value: info.plotsOwned }
];

// Players Info: one king at a time, with arrows to the other kings. Everybody can read everybody (spectators too).
export const StatsView = ({ game, playerId, viewerId, onPrev, onNext }: StatsViewProps) => {
  const info = getKingInfo(game, playerId);
  if (!info) {
    return <EmptyState text="Unknown player" />;
  }
  return (
    <div className="info-page" data-testid="stats-page" data-player={playerId}>
      <InfoCard
        title={info.name}
        stats={getStatRows(info)}
        muted={info.eliminated}
        icon={<Avatar size="fill" crossed={info.eliminated} className="info-card__avatar" />}
        titleStart={
          onPrev ? (
            <IconButton aria-label="Previous king" className="stats-arrow" onClick={onPrev}>
              <ChevronLeft />
            </IconButton>
          ) : undefined
        }
        titleEnd={
          onNext ? (
            <IconButton aria-label="Next king" className="stats-arrow" onClick={onNext}>
              <ChevronRight />
            </IconButton>
          ) : undefined
        }
      />
      {info.eliminated ? <p className="info-hint">Out of the game</p> : playerId === viewerId ? <p className="info-hint">This is your king</p> : null}
    </div>
  );
};
