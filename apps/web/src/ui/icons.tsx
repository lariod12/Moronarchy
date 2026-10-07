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

// Luchador-style masks for the two resident kinds: Warrior is filled, Farmer is an outline.
const MASK_OUTLINE = "M32 3 C48 3 55 18 55 34 C55 50 46 61 32 61 C18 61 9 50 9 34 C9 18 16 3 32 3 Z";
const MASK_FEATURES = [
  "M17 24 C17 20 24 19 28 23 C28 28 24 30 20 29 C18 28 17 26 17 24 Z",
  "M47 24 C47 20 40 19 36 23 C36 28 40 30 44 29 C46 28 47 26 47 24 Z",
  "M32 31 L28 38 L36 38 Z"
] as const;

export const WarriorMaskIcon = (props: IconProps) => (
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
    <path d={MASK_OUTLINE} fill="currentColor" />
    <g fill="none" stroke="var(--paper)" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
      {MASK_FEATURES.map((path) => (
        <path key={path} d={path} />
      ))}
      <rect x="21" y="43" width="22" height="9" rx="4.5" />
    </g>
  </svg>
);

export const FarmerMaskIcon = (props: IconProps) => (
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
    <path d={MASK_OUTLINE} fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="round" />
    <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
      {MASK_FEATURES.map((path) => (
        <path key={path} d={path} />
      ))}
      <rect x="21" y="43" width="22" height="9" rx="4.5" />
    </g>
  </svg>
);

export const HorseIcon = (props: IconProps) => (
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="currentColor" {...props}>
    <path d="M9 56 L12 38 C12 31 17 27 24 27 L35 27 L43 15 L40 8 L49 6 L57 14 L59 23 L51 25 L45 35 L47 56 L41 56 L38 41 L24 41 L22 56 Z" />
    <path d="M24 27 C24 33 30 35 36 33 L36 27 Z" fill="var(--paper)" />
    <circle cx="51" cy="14" r="2" fill="var(--paper)" />
  </svg>
);

export const SickleIcon = (props: IconProps) => (
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
    <path d="M52 8 C30 5 12 20 15 42 C20 28 33 20 52 21 C57 21 57 13 52 8 Z" fill="currentColor" />
    <path d="M16 40 L9 56" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
  </svg>
);

// The two faces of the end of the game (wireframes 97 and 98): a laughing face with rolled eyes, and a sad one.
export const HappyFaceIcon = (props: IconProps) => (
  <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" {...props}>
    <circle cx="50" cy="50" r="48" fill="currentColor" />
    <rect x="17" y="26" width="28" height="22" rx="10" fill="var(--paper)" />
    <rect x="55" y="26" width="28" height="22" rx="10" fill="var(--paper)" />
    <circle cx="30" cy="33" r="5" fill="currentColor" />
    <circle cx="68" cy="33" r="5" fill="currentColor" />
    <path d="M15 56 L85 56 Q82 86 50 89 Q18 86 15 56 Z" fill="var(--paper)" />
    <path d="M42 84 Q48 68 70 66 Q68 83 42 84 Z" fill="currentColor" />
  </svg>
);

export const SadFaceIcon = (props: IconProps) => (
  <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" {...props}>
    <circle cx="50" cy="50" r="48" fill="currentColor" />
    <circle cx="35" cy="42" r="6" fill="var(--paper)" />
    <circle cx="65" cy="42" r="6" fill="var(--paper)" />
    <path d="M29 74 Q50 50 71 74" fill="none" stroke="var(--paper)" strokeWidth="6" strokeLinecap="round" />
  </svg>
);
