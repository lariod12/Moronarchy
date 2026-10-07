import type { ReactNode } from "react";
import { cx } from "../../ui/cx";
import "./GameShell.css";

export interface GameShellProps {
  top: ReactNode;
  hud: ReactNode;
  children: ReactNode;
  overlay?: ReactNode;
  className?: string;
}

export const GameShell = ({ top, hud, children, overlay, className }: GameShellProps) => (
  <div className={cx("shell", className)}>
    {top}
    <main className="shell__content">{children}</main>
    {hud}
    {overlay}
  </div>
);
