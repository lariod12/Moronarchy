import { cx } from "../cx";
import "./Dice.css";

export interface DiceProps {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  rolling?: boolean;
  size?: number;
  className?: string;
}

// Pip cells on a 3x3 grid, numbered 0..8 row by row.
const PIPS: Record<DiceProps["value"], number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

export const Dice = ({ value, rolling = false, size = 72, className }: DiceProps) => (
  <div
    role="img"
    aria-label={`Dice ${value}`}
    className={cx("ui-dice", rolling && "ui-dice--rolling", className)}
    style={{ width: size, height: size }}
  >
    {Array.from({ length: 9 }, (_, cell) => (
      <span key={cell} className={cx("ui-dice__cell", PIPS[value].includes(cell) && "ui-dice__cell--pip")} />
    ))}
  </div>
);
