import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const CrownIcon = (props: IconProps) => (
  <svg viewBox="0 0 64 48" aria-hidden="true" focusable="false" fill="currentColor" {...props}>
    <circle cx="6" cy="10" r="4.5" />
    <circle cx="32" cy="6" r="4.5" />
    <circle cx="58" cy="10" r="4.5" />
    <path d="M6 14 L19 26 L32 10 L45 26 L58 14 L53 40 Q53 44 49 44 L15 44 Q11 44 11 40 Z" />
  </svg>
);

export const BackIcon = (props: IconProps) => (
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
    <circle cx="32" cy="32" r="30" fill="currentColor" />
    <path
      d="M12 32 L30 14 L30 24 L50 24 L50 40 L30 40 L30 50 Z"
      fill="var(--paper)"
      stroke="var(--paper)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const AvatarSilhouette = (props: IconProps) => (
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="currentColor" {...props}>
    <circle cx="32" cy="22" r="14" />
    <path d="M4 64 Q4 40 32 40 Q60 40 60 64 Z" />
  </svg>
);
