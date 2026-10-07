import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "../cx";
import "./Dialog.css";

export interface DialogAction {
  label: string;
  onSelect: () => void;
  tone?: "default" | "strong";
}

export interface DialogProps {
  title: string;
  children: ReactNode;
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

  return (
    <div className="ui-dialog-overlay" onKeyDown={handleKeyDown}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx("ui-dialog", className)}>
        <h2 id={titleId} className="ui-dialog__title">
          {title}
        </h2>
        <div className="ui-dialog__body">{children}</div>
        <div className="ui-dialog__actions">
          {actions.map((action, index) => (
            <button
              key={action.label}
              ref={index === 0 ? firstActionRef : undefined}
              type="button"
              className={cx("ui-dialog__action", action.tone === "strong" && "ui-dialog__action--strong")}
              onClick={action.onSelect}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
