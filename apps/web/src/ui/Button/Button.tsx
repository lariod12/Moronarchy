import type { ButtonHTMLAttributes } from "react";
import { cx } from "../cx";
import "./Button.css";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  tone?: "default" | "strong";
  size?: "md" | "sm";
  type?: "button" | "submit";
}

export const Button = ({ tone = "default", size = "md", type = "button", className, children, ...rest }: ButtonProps) => (
  <button
    type={type}
    className={cx("ui-button", tone === "strong" && "ui-button--strong", size === "sm" && "ui-button--sm", className)}
    {...rest}
  >
    {children}
  </button>
);
