import { cx } from "../cx";
import { AvatarSilhouette } from "../icons";
import { Tag } from "../Tag/Tag";
import "./Avatar.css";

export interface AvatarProps {
  name?: string;
  crossed?: boolean;
  size?: "sm" | "md" | "lg" | "fill";
  className?: string;
}

export const Avatar = ({ name, crossed = false, size = "md", className }: AvatarProps) => (
  <div className={cx("ui-avatar", `ui-avatar--${size}`, crossed && "ui-avatar--crossed", className)}>
    {name ? <Tag className="ui-avatar__name">{name}</Tag> : null}
    <AvatarSilhouette className="ui-avatar__figure" />
    {crossed ? (
      <svg className="ui-avatar__cross" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <line x1="4" y1="94" x2="96" y2="6" />
        <line x1="4" y1="6" x2="96" y2="94" />
      </svg>
    ) : null}
  </div>
);
