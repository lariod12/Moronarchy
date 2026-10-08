import { useState } from "react";
import { Dialog } from "../ui/Dialog/Dialog";
import { cx } from "../ui/cx";
import { useSolo } from "./LocalMatchProvider";
import { SOLO_SPEEDS } from "./solo-settings";
import type { SoloSpeed } from "./solo-settings";
import "./BotControl.css";

const SPEED_LABELS: Record<SoloSpeed, string> = { slow: "Slow", normal: "Normal", fast: "Fast" };

export interface BotControlViewProps {
  speed: SoloSpeed;
  paused: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSpeedChange: (speed: SoloSpeed) => void;
  onPauseChange: (paused: boolean) => void;
  onNewGame: () => void;
}

// The floating chip of the solo mode: collapsed it only says Bots (or Bots paused); opened it holds the bot speed,
// Pause / Resume and New game. It is a strip under the activity line, so it never covers the board.
export const BotControlView = ({ speed, paused, expanded, onToggle, onSpeedChange, onPauseChange, onNewGame }: BotControlViewProps) => (
  <div className="bot-control" data-testid="bot-control">
    <button type="button" className={cx("bot-control__chip", paused && "bot-control__chip--paused")} aria-expanded={expanded} onClick={onToggle}>
      {paused ? "Bots paused" : "Bots"}
    </button>
    {expanded ? (
      <div className="bot-control__panel">
        <div role="group" aria-label="Bot speed" className="bot-control__speeds">
          {SOLO_SPEEDS.map((option) => (
            <button
              key={option}
              type="button"
              className={cx("bot-control__option", option === speed && "bot-control__option--active")}
              aria-pressed={option === speed}
              onClick={() => onSpeedChange(option)}
            >
              {SPEED_LABELS[option]}
            </button>
          ))}
        </div>
        <button type="button" className="bot-control__action" onClick={() => onPauseChange(!paused)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" className="bot-control__action" onClick={onNewGame}>
          New game
        </button>
      </div>
    ) : null}
  </div>
);

// Wires the chip to the solo match; New game asks first because it throws the running game away.
export const BotControl = () => {
  const { settings, paused, setPaused, setSpeed, newGame } = useSolo();
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <BotControlView
        speed={settings.speed}
        paused={paused}
        expanded={expanded}
        onToggle={() => setExpanded((open) => !open)}
        onSpeedChange={setSpeed}
        onPauseChange={setPaused}
        onNewGame={() => setConfirming(true)}
      />
      {confirming ? (
        <Dialog
          title="New game?"
          actions={[
            { label: "No", onSelect: () => setConfirming(false) },
            { label: "Yes", tone: "strong", onSelect: newGame }
          ]}
          onDismiss={() => setConfirming(false)}
        >
          The current game will be lost.
        </Dialog>
      ) : null}
    </>
  );
};
