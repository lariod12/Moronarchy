import { useId } from "react";
import type { FormEvent } from "react";
import { MAX_PLAYER_NAME_LENGTH } from "@moronarchy/core/match";
import { Button } from "../ui/Button/Button";
import { cx } from "../ui/cx";
import { Tag } from "../ui/Tag/Tag";
import { TextInput } from "../ui/TextInput/TextInput";
import { MAX_BOTS, MIN_BOTS, SOLO_SPEEDS, SOLO_STYLES } from "./solo-settings";
import type { SoloSettings, SoloSpeed, SoloStyle } from "./solo-settings";
import "./SoloSetupView.css";

const STYLE_LABELS: Record<SoloStyle, string> = { careful: "Careful", aggressive: "Aggressive", mixed: "Mixed" };
const SPEED_LABELS: Record<SoloSpeed, string> = { slow: "Slow", normal: "Normal", fast: "Fast" };
const BOT_COUNTS = Array.from({ length: MAX_BOTS - MIN_BOTS + 1 }, (_, index) => MIN_BOTS + index);

interface ChoiceRowProps<T extends string | number> {
  label: string;
  options: readonly T[];
  value: T;
  text: (option: T) => string;
  onChange: (option: T) => void;
}

const ChoiceRow = <T extends string | number>({ label, options, value, text, onChange }: ChoiceRowProps<T>) => {
  const labelId = useId();
  return (
    <div className="solo-setup__row">
      <span id={labelId} className="solo-setup__label">
        <Tag>{label}</Tag>
      </span>
      <div role="group" aria-labelledby={labelId} className="solo-setup__choices">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={cx("solo-setup__choice", option === value && "solo-setup__choice--active")}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {text(option)}
          </button>
        ))}
      </div>
    </div>
  );
};

export interface SoloSetupViewProps {
  settings: SoloSettings;
  onChange: (settings: SoloSettings) => void;
  onStart: () => void;
  // Back to Welcome; absent in the single-file build, which has no Welcome.
  onBack?: () => void;
}

export const SoloSetupView = ({ settings, onChange, onStart, onBack }: SoloSetupViewProps) => {
  const nameId = useId();
  const hasName = settings.name.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasName) {
      onStart();
    }
  };

  return (
    <div className="screen solo-setup">
      <h1 className="solo-setup__title">
        <Tag className="solo-setup__title-tag">Play vs bots</Tag>
      </h1>
      <p className="solo-setup__hint">Play a whole game alone against computer kings.</p>

      <form className="solo-setup__form" onSubmit={handleSubmit} noValidate>
        <div className="solo-setup__row">
          <label className="solo-setup__label" htmlFor={nameId}>
            <Tag>Name</Tag>
          </label>
          <TextInput
            id={nameId}
            value={settings.name}
            maxLength={MAX_PLAYER_NAME_LENGTH}
            enterKeyHint="go"
            onChange={(event) => onChange({ ...settings, name: event.target.value })}
          />
        </div>
        <ChoiceRow label="Bots" options={BOT_COUNTS} value={settings.bots} text={String} onChange={(bots) => onChange({ ...settings, bots })} />
        <ChoiceRow label="Bot style" options={SOLO_STYLES} value={settings.style} text={(style) => STYLE_LABELS[style]} onChange={(style) => onChange({ ...settings, style })} />
        <ChoiceRow label="Bot speed" options={SOLO_SPEEDS} value={settings.speed} text={(speed) => SPEED_LABELS[speed]} onChange={(speed) => onChange({ ...settings, speed })} />
        <div className="solo-setup__buttons">
          {onBack ? <Button onClick={onBack}>Back</Button> : null}
          <Button type="submit" tone="strong" disabled={!hasName}>
            Start
          </Button>
        </div>
      </form>
    </div>
  );
};
