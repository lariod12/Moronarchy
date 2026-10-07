import { Castle, UsersRound } from "lucide-react";
import type { FightSideView } from "@moronarchy/core/engine";
import { Avatar } from "../../ui/Avatar/Avatar";
import { cx } from "../../ui/cx";
import { HealthBar } from "../../ui/HealthBar/HealthBar";
import { Tag } from "../../ui/Tag/Tag";
import { RoundMarkers } from "./RoundMarkers";
import "./FightView.css";

export interface FighterPanelProps {
  side: FightSideView;
  position: "left" | "right";
  // "You", a king name, "Residents ×3" or "Plot 12 · Lv 2".
  label: string;
  // Floating text over the panel after a round: "-7" or "Blocked".
  floating?: string | null;
  // Float it with motion (a round just resolved here) instead of showing it still (reload).
  floatingFresh?: boolean;
  // This side won the fight (shown once the dice stopped).
  winner?: boolean;
}

const art = (side: FightSideView) => {
  if (side.kind === "garrison") {
    return <UsersRound className="fighter-panel__icon" strokeWidth={1.75} aria-hidden="true" />;
  }
  if (side.kind === "plot") {
    return <Castle className="fighter-panel__icon" strokeWidth={1.75} aria-hidden="true" />;
  }
  return <Avatar size="fill" className="fighter-panel__avatar" />;
};

export const FighterPanel = ({ side, position, label, floating = null, floatingFresh = false, winner = false }: FighterPanelProps) => (
  <section
    className={cx("fighter-panel", side.isViewer && "fighter-panel--me", winner && "fighter-panel--winner")}
    data-winner={String(winner)}
    data-testid="fight-panel"
    data-position={position}
    data-kind={side.kind}
    aria-label={label}
  >
    <HealthBar current={side.health} max={side.maxHealth} />
    <RoundMarkers results={side.results} />
    <div className="fighter-panel__body">
      <Tag className="fighter-panel__name">{label}</Tag>
      <div className="fighter-panel__art">{art(side)}</div>
      <p className="fighter-panel__stats" data-testid="fight-stats">
        ATK {side.attack} · DEF {side.defense}
      </p>
      {winner ? <Tag className="fighter-panel__winner">Winner</Tag> : null}
      {side.buffs.attack > 0 || side.buffs.defense > 0 ? (
        <div className="fighter-panel__buffs" data-testid="fight-buffs">
          {side.buffs.attack > 0 ? <Tag>{`ATK +${side.buffs.attack}`}</Tag> : null}
          {side.buffs.defense > 0 ? <Tag>{`DEF +${side.buffs.defense}`}</Tag> : null}
        </div>
      ) : null}
    </div>
    {floating ? (
      <span className={cx("fighter-panel__float", floatingFresh && "fighter-panel__float--fresh")} data-testid="fight-damage">
        {floating}
      </span>
    ) : null}
  </section>
);
