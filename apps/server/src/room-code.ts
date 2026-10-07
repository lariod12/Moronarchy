export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ROOM_CODE_PREFIX = "R";
const SHORT_CODE_LENGTH = 4;
const LONG_CODE_LENGTH = 6;
const MAX_SHORT_TRIES = 50;

const ROOM_CODE_PATTERN = /^R[A-Z2-9]{4,6}$/;

export const isRoomCode = (value: unknown): value is string => typeof value === "string" && ROOM_CODE_PATTERN.test(value);

const randomChars = (random: () => number, length: number): string => {
  let chars = "";
  for (let index = 0; index < length; index += 1) {
    chars += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)] ?? ROOM_CODE_ALPHABET[0];
  }
  return chars;
};

// Short, easy to read out loud: "R" + 4 characters; falls back to 6 characters when the short space is crowded.
export const createRoomCodeGenerator =
  (random: () => number = Math.random, isTaken: (code: string) => boolean = () => false): (() => string) =>
  () => {
    for (let attempt = 0; attempt < MAX_SHORT_TRIES; attempt += 1) {
      const code = ROOM_CODE_PREFIX + randomChars(random, SHORT_CODE_LENGTH);
      if (!isTaken(code)) {
        return code;
      }
    }
    for (;;) {
      const code = ROOM_CODE_PREFIX + randomChars(random, LONG_CODE_LENGTH);
      if (!isTaken(code)) {
        return code;
      }
    }
  };
