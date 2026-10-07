import { Swords } from "lucide-react";
import type { FightRoundRecord, FightSideView, FightView as FightViewModel, PlayerId } from "@moronarchy/core/engine";
import { plotLabel } from "../../game/labels";
import { Button } from "../../ui/Button/Button";
import { FightDice } from "./FightDice";
import type { FightDieModel } from "./FightDice";
import { FighterPanel } from "./FighterPanel";
import "./FightView.css";

export interface FightViewProps {
  view: FightViewModel;
  // King names, to say who the fight is waiting for.
  names: Record<PlayerId, string>;
  // The dice are shaking after a round resolved.
  rolling?: boolean;
  // A round resolved while this page was open: floating labels may move.
  fresh?: boolean;
  canUseItem?: boolean;
  onRoll?: () => void;
  onUseItem?: () => void;
  onRetreat?: () => void;
}

const isDieValue = (value: number): value is 1 | 2 | 3 | 4 | 5 | 6 => Number.isInteger(value) && value >= 1 && value <= 6;

export const sideLabel = (side: FightSideView, plotId: number): string => {
  if (side.kind === "king") {
    return side.isViewer ? "You" : (side.name ?? "Player");
  }
  if (side.kind === "garrison") {
    return `Residents ×${side.aliveResidents ?? 0}`;
  }
  return `${plotLabel(plotId)} · Lv ${side.plotLevel ?? 0}`;
};

const dieOf = (round: FightRoundRecord | null, side: "attacker" | "defender"): FightDieModel => {
  if (!round) {
    return { value: 1, score: null, won: false };
  }
  const roll = side === "attacker" ? round.attackerRoll : round.defenderRoll;
  const score = side === "attacker" ? round.attackerScore : round.defenderScore;
  return { value: isDieValue(roll) ? roll : 1, score: `${roll} + ${score - roll} = ${score}`, won: round.winner === side };
};

// "Blocked" when a passive plot beats the attacker, otherwise the damage the loser took.
const floatingFor = (view: FightViewModel, round: FightRoundRecord | null, loser: "attacker" | "defender"): string | null => {
  if (!round || round.winner === "tie" || round.winner === loser) {
    return null;
  }
  if (round.damage > 0) {
    return `-${round.damage}`;
  }
  return view.defender.kind === "plot" && loser === "attacker" ? "Blocked" : null;
};

const joinNames = (names: string[]): string => names.join(" and ");

const getStatus = (view: FightViewModel, viewerId: PlayerId | null, names: Record<PlayerId, string>): string => {
  const waiting = view.waitingFor.filter((id) => id !== viewerId);
  const roundNo = view.rounds.length + 1;
  if (view.canRoll) {
    return `Round ${roundNo}: roll the dice`;
  }
  if (waiting.length === 0) {
    return `Round ${roundNo}`;
  }
  return `Waiting for ${joinNames(waiting.map((id) => names[id] ?? "the other king"))} to roll…`;
};

const getFinishedStatus = (view: FightViewModel, labelOf: (key: "attacker" | "defender") => string): string => {
  if (view.retreated) {
    const attacker = labelOf("attacker");
    return attacker === "You" ? "You retreated" : `${attacker} retreated`;
  }
  const winner = view.winner === "attacker" ? labelOf("attacker") : labelOf("defender");
  return winner === "You" ? "You win the fight" : `${winner} wins the fight`;
};

// The Fight page: two fighters, the dice of the newest round and the actions of a fighter. Spectators get no buttons.
// Nothing here knows the rules: every number comes from the engine view.
export const FightView = ({ view, names, rolling = false, fresh = false, canUseItem = true, onRoll, onUseItem, onRetreat }: FightViewProps) => {
  const leftIsAttacker = view.viewerRole !== "defender";
  const leftKey = leftIsAttacker ? "attacker" : "defender";
  const rightKey = leftIsAttacker ? "defender" : "attacker";
  const lastRound = view.rounds[view.rounds.length - 1] ?? null;
  const finished = view.winner !== null;
  const isFighter = view.viewerRole !== "spectator" && !finished;
  const viewerSide = view.viewerRole === "attacker" ? view.attacker : view.viewerRole === "defender" ? view.defender : null;
  const hasRolled = viewerSide?.hasRolled ?? false;
  const labelOf = (key: "attacker" | "defender") => sideLabel(view[key], view.plotId);

  let note = "";
  if (lastRound && !rolling) {
    note = lastRound.winner === "tie" ? "Tie — roll again" : `${labelOf(lastRound.winner) === "You" ? "You win" : `${labelOf(lastRound.winner)} wins`} the round`;
  }

  return (
    <div className="fight" data-testid="fight-view" data-role={view.viewerRole} data-kind={view.kind} data-rolling={String(rolling)} data-finished={String(finished)}>
      <div className="fight__arena">
        <FighterPanel
          side={view[leftKey]}
          position="left"
          label={labelOf(leftKey)}
          floating={rolling ? null : floatingFor(view, lastRound, leftKey)}
          floatingFresh={fresh}
          winner={!rolling && view.winner === leftKey}
        />
        <Swords className="fight__swords" size={32} strokeWidth={2} aria-label="versus" role="img" />
        <FighterPanel
          side={view[rightKey]}
          position="right"
          label={labelOf(rightKey)}
          floating={rolling ? null : floatingFor(view, lastRound, rightKey)}
          floatingFresh={fresh}
          winner={!rolling && view.winner === rightKey}
        />
      </div>
      <FightDice left={dieOf(lastRound, leftKey)} right={dieOf(lastRound, rightKey)} rolling={rolling} />
      <p className="fight__note" data-testid="fight-round-note">
        {note || " "}
      </p>
      <p className="fight__status" data-testid="fight-status">
        {finished ? (rolling ? " " : getFinishedStatus(view, labelOf)) : getStatus(view, viewerSide?.playerId ?? null, names)}
      </p>
      {isFighter ? (
        <div className="fight__actions">
          <Button size="sm" onClick={onUseItem} disabled={hasRolled || !canUseItem}>
            Use item
          </Button>
          {hasRolled ? null : (
            <Button tone="strong" className="fight__roll" onClick={onRoll} disabled={!view.canRoll}>
              Roll
            </Button>
          )}
          {view.viewerRole === "attacker" ? (
            <Button size="sm" onClick={onRetreat} disabled={!view.canRetreat}>
              Retreat
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
