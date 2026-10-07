import { describe, expect, it } from "vitest";
import { createRoomCodeGenerator, isRoomCode, ROOM_CODE_ALPHABET } from "./room-code.js";

const sequence = (values: number[]): (() => number) => {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
};

describe("room codes", () => {
  it("generates R + 4 characters from the unambiguous alphabet", () => {
    const next = createRoomCodeGenerator();
    for (let index = 0; index < 200; index += 1) {
      const code = next();
      expect(code).toMatch(/^R[A-Z2-9]{4}$/);
      expect([...code.slice(1)].every((char) => ROOM_CODE_ALPHABET.includes(char))).toBe(true);
    }
  });

  it("never uses ambiguous characters", () => {
    for (const char of ["I", "O", "0", "1"]) {
      expect(ROOM_CODE_ALPHABET).not.toContain(char);
    }
    expect(ROOM_CODE_ALPHABET).toHaveLength(32);
  });

  it("maps the random source onto the alphabet deterministically", () => {
    const next = createRoomCodeGenerator(sequence([0, 0.5, 0.999, 0.25]));
    expect(next()).toBe(`R${ROOM_CODE_ALPHABET[0]}${ROOM_CODE_ALPHABET[16]}${ROOM_CODE_ALPHABET[31]}${ROOM_CODE_ALPHABET[8]}`);
  });

  it("retries while the code is taken", () => {
    const taken = new Set<string>();
    const random = sequence([0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5]);
    const first = ROOM_CODE_ALPHABET[0];
    taken.add(`R${first}${first}${first}${first}`);
    const next = createRoomCodeGenerator(random, (code) => taken.has(code));
    const middle = ROOM_CODE_ALPHABET[16];
    expect(next()).toBe(`R${middle}${middle}${middle}${middle}`);
  });

  it("falls back to 6 characters after 50 collisions", () => {
    const next = createRoomCodeGenerator(
      () => 0,
      (code) => code.length === 5
    );
    const code = next();
    expect(code).toMatch(/^R[A-Z2-9]{6}$/);
    expect(isRoomCode(code)).toBe(true);
  });

  it("validates room codes", () => {
    expect(isRoomCode("RABCD")).toBe(true);
    expect(isRoomCode("R2345")).toBe(true);
    expect(isRoomCode("RABCDEF")).toBe(true);
    expect(isRoomCode("RABC")).toBe(false);
    expect(isRoomCode("RABCDEFG")).toBe(false);
    expect(isRoomCode("rabcd")).toBe(false);
    expect(isRoomCode("RAB1D")).toBe(false);
    expect(isRoomCode("XABCD")).toBe(false);
    expect(isRoomCode(undefined)).toBe(false);
  });
});
