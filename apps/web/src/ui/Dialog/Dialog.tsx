import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "../cx";
import "./Dialog.css";

export interface DialogAction {
  label: string;
  onSelect: () => void;
  tone?: "default" | "strong";
  disabled?: boolean;
}

export interface DialogProps {
  title: string;
  children: ReactNode;
  // An empty list makes a message-only dialog (e.g. "waiting for decision").
  actions: DialogAction[];
  onDismiss?: () => void;
  className?: string;
}

export const Dialog = ({ title, children, actions, onDismiss, className }: DialogProps) => {
  const titleId = useId();
  const firstActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstActionRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && onDismiss) {
      event.stopPropagation();
      onDismiss();
    }
  };

  // Focus starts on the first action that can actually be pressed.
  const firstEnabledIndex = actions.findIndex((action) => !action.disabled);

  return (
    <div className="ui-dialog-overlay" onKeyDown={handleKeyDown}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx("ui-dialog", className)}>
        <h2 id={titleId} className="ui-dialog__title">
          {title}
        </h2>
        <div className="ui-dialog__body">{children}</div>
        {actions.length > 0 ? (
          <div className="ui-dialog__actions">
            {actions.map((action, index) => (
              <button
                key={action.label}
                ref={index === firstEnabledIndex ? firstActionRef : undefined}
                type="button"
                className={cx("ui-dialog__action", action.tone === "strong" && "ui-dialog__action--strong")}
                disabled={action.disabled}
                onClick={action.onSelect}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
