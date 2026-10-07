import { useId } from "react";
import type { FormEvent } from "react";
import { MAX_PLAYER_NAME_LENGTH } from "@moronarchy/core/match";
import { BlockingOverlay } from "../../ui/BlockingOverlay/BlockingOverlay";
import { Button } from "../../ui/Button/Button";
import { cx } from "../../ui/cx";
import { AvatarSilhouette } from "../../ui/icons";
import { Tag } from "../../ui/Tag/Tag";
import { TextInput } from "../../ui/TextInput/TextInput";
import "./WelcomeView.css";

export type WelcomeBusy = "creating" | "joining" | null;

export interface WelcomeViewProps {
  name: string;
  roomCode: string;
  busy?: WelcomeBusy;
  error?: string | null;
  onNameChange?: (name: string) => void;
  onRoomCodeChange?: (roomCode: string) => void;
  onSubmit?: () => void;
}

const BUSY_TITLES: Record<Exclude<WelcomeBusy, null>, string> = {
  creating: "Waiting for creating room",
  joining: "Joining room"
};

export const WelcomeView = ({
  name,
  roomCode,
  busy = null,
  error = null,
  onNameChange,
  onRoomCodeChange,
  onSubmit
}: WelcomeViewProps) => {
  const nameId = useId();
  const roomId = useId();
  const errorId = useId();
  const hasName = name.trim().length > 0;
  const joining = roomCode.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasName && !busy) {
      onSubmit?.();
    }
  };

  return (
    <div className="screen welcome">
      <h1 className="welcome__title">
        <Tag className="welcome__title-tag">Welcome Moronarchy</Tag>
      </h1>

      <div className="welcome__panel">
        <p className={cx("welcome__preview", !hasName && "welcome__preview--empty")} data-testid="welcome-preview">
          {hasName ? name.trim() : "Player Name"}
        </p>
        <AvatarSilhouette className="welcome__avatar" />
      </div>

      <form className="welcome__form" onSubmit={handleSubmit} noValidate>
        <div className="welcome__row">
          <label className="welcome__label" htmlFor={nameId}>
            <Tag>Name</Tag>
          </label>
          <TextInput
            id={nameId}
            value={name}
            maxLength={MAX_PLAYER_NAME_LENGTH}
            enterKeyHint="next"
            onChange={(event) => onNameChange?.(event.target.value)}
          />
        </div>
        <div className="welcome__row">
          <label className="welcome__label" htmlFor={roomId}>
            <Tag tone={joining ? "default" : "muted"}>Join room</Tag>
          </label>
          <TextInput
            id={roomId}
            value={roomCode}
            maxLength={12}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => onRoomCodeChange?.(event.target.value)}
          />
        </div>
        {error ? (
          <p id={errorId} className="welcome__error" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="welcome__submit" disabled={!hasName || busy !== null}>
          {joining ? "Join" : "Create"}
        </Button>
      </form>

      {busy ? <BlockingOverlay title={BUSY_TITLES[busy]} /> : null}
    </div>
  );
};
