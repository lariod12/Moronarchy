export const MAX_PLAYER_NAME_LENGTH = 18;
export const MAX_CHAT_TEXT_LENGTH = 120;

const isControlCode = (code: number): boolean => code < 32 || code === 127;

const stripControlCharacters = (value: string): string => {
  return Array.from(value)
    .filter((character) => !isControlCode(character.charCodeAt(0)))
    .join("");
};

const replaceControlCharacters = (value: string): string => {
  return Array.from(value)
    .map((character) => (isControlCode(character.charCodeAt(0)) ? " " : character))
    .join("");
};

export const sanitizePlayerName = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return stripControlCharacters(value).replace(/\s+/g, " ").trim().slice(0, MAX_PLAYER_NAME_LENGTH).trim();
};

export const sanitizeChatText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return replaceControlCharacters(value).replace(/\s+/g, " ").trim().slice(0, MAX_CHAT_TEXT_LENGTH).trim();
};
