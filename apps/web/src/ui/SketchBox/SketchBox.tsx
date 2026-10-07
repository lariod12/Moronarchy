import type { ReactNode } from "react";
import { cx } from "../cx";
import "./SketchBox.css";

export interface SketchBoxProps {
  children?: ReactNode;
  title?: string;
  shadow?: boolean;
  className?: string;
}

export const SketchBox = ({ children, title, shadow = false, className }: SketchBoxProps) => (
  <section className={cx("ui-sketch-box", shadow && "ui-sketch-box--shadow", className)}>
    {title ? <h2 className="ui-sketch-box__title">{title}</h2> : null}
    {children}
  </section>
);
