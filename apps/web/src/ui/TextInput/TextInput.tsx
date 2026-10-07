import type { ComponentPropsWithRef } from "react";
import { cx } from "../cx";
import "./TextInput.css";

export type TextInputProps = Omit<ComponentPropsWithRef<"input">, "type">;

export const TextInput = ({ className, ...rest }: TextInputProps) => (
  <input type="text" className={cx("ui-text-input", className)} autoComplete="off" {...rest} />
);
