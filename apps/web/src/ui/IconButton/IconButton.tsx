import type { ReactNode } from "react";
import { cx } from "../cx";
import "./IconButton.css";

export interface IconButtonProps {
  "aria-label": string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const IconButton = ({ children, onClick, disabled, className, "aria-label": ariaLabel }: IconButtonProps) => (
  <button type="button" className={cx("ui-icon-button", className)} aria-label={ariaLabel} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);
