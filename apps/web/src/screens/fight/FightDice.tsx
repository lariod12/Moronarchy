import { Dice } from "../../ui/Dice/Dice";
import "./FightView.css";

type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface FightDieModel {
  value: DieValue;
  // "4 + 5 = 9" once the round is revealed.
  score: string | null;
  won: boolean;
}

export interface FightDiceProps {
  left: FightDieModel;
  right: FightDieModel;
  rolling: boolean;
}

// Both dice of the newest round. While `rolling` they shake and hide the outcome.
export const FightDice = ({ left, right, rolling }: FightDiceProps) => (
  <div className="fight-dice" data-testid="fight-dice" data-rolling={String(rolling)}>
    {[left, right].map((die, index) => (
      <div key={index === 0 ? "left" : "right"} className="fight-dice__die" data-testid="fight-die">
        <Dice value={die.value} rolling={rolling} size={56} className={die.won && !rolling ? "fight-dice__winner" : undefined} />
        <span className="fight-dice__score" data-testid="fight-score">
          {rolling || die.score === null ? " " : die.score}
        </span>
      </div>
    ))}
  </div>
);
