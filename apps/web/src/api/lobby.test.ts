import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  createMatch: vi.fn(),
  joinMatch: vi.fn(),
  getMatch: vi.fn()
}));

vi.mock("boardgame.io/client", () => ({
  LobbyClient: class {
    createMatch = client.createMatch;
    joinMatch = client.joinMatch;
    getMatch = client.getMatch;
  }
}));

import {
  LOBBY_REQUEST_TIMEOUT_MS,
  clearPlayerSession,
  createRoom,
  describeLobbyError,
  getPlayerSession,
  joinRoom,
  LobbyError,
  normalizeRoomCode,
  sanitizePlayerName
} from "./lobby";
import type { LobbyErrorCode } from "./lobby";

const httpError = (status: number, details: unknown): Error =>
  Object.assign(new Error(`HTTP status ${status}`), { details });

const joinCode = async (roomCode: string): Promise<LobbyErrorCode | null> => {
  try {
    await joinRoom(roomCode, "Bob");
    return null;
  } catch (error) {
    return error instanceof LobbyError ? error.code : null;
  }
};

describe("lobby client helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("sanitizes player names before sending them to the lobby API", () => {
    expect(sanitizePlayerName("  Bob\u0007   The King With A Very Long Name ")).toBe("Bob The King With");
  });

  it("falls back to King when the name is blank", () => {
    expect(sanitizePlayerName("   ")).toBe("King");
  });

  it("normalizes room codes", () => {
    expect(normalizeRoomCode("  rab2c ")).toBe("RAB2C");
  });

  it("describes every error code", () => {
    expect(describeLobbyError("NOT_FOUND")).toBe("Room not found");
    expect(describeLobbyError("FULL")).toBe("Room is full");
    expect(describeLobbyError("STARTED")).toBe("Game already started");
    expect(describeLobbyError("NETWORK")).toBe("Cannot reach the server");
  });

  it("creates a room as seat 0 and stores the session", async () => {
    client.createMatch.mockResolvedValue({ matchID: "RABCD" });
    client.joinMatch.mockResolvedValue({ playerID: "0", playerCredentials: "secret" });
    const session = await createRoom("  Alice ");
    expect(session).toEqual({ matchID: "RABCD", playerID: "0", playerName: "Alice", credentials: "secret" });
    expect(client.joinMatch).toHaveBeenCalledWith("moronarchy", "RABCD", { playerID: "0", playerName: "Alice" });
    expect(getPlayerSession("RABCD")).toEqual(session);
    clearPlayerSession("RABCD");
    expect(getPlayerSession("RABCD")).toBeNull();
  });

  it("joins with a normalized code", async () => {
    client.joinMatch.mockResolvedValue({ playerID: "2", playerCredentials: "c2" });
    const session = await joinRoom(" rabcd ", "Bob");
    expect(client.joinMatch).toHaveBeenCalledWith("moronarchy", "RABCD", { playerName: "Bob" });
    expect(session.playerID).toBe("2");
    expect(session.matchID).toBe("RABCD");
  });

  it("maps 404 to NOT_FOUND", async () => {
    client.joinMatch.mockRejectedValue(httpError(404, "Match RZZZZ not found"));
    expect(await joinCode("RZZZZ")).toBe("NOT_FOUND");
  });

  it("maps a full room 409 to FULL", async () => {
    client.joinMatch.mockRejectedValue(httpError(409, "Match RABCD reached maximum number of players (6)"));
    expect(await joinCode("RABCD")).toBe("FULL");
  });

  it("maps the started-match 409 to STARTED", async () => {
    client.joinMatch.mockRejectedValue(httpError(409, "Match already started."));
    expect(await joinCode("RABCD")).toBe("STARTED");
  });

  it("maps failed requests to NETWORK", async () => {
    client.joinMatch.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await joinCode("RABCD")).toBe("NETWORK");
    client.createMatch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(createRoom("Alice")).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("gives up with NETWORK when the server never answers (e.g. a firewall drops the request)", async () => {
    vi.useFakeTimers();
    try {
      client.createMatch.mockReturnValue(new Promise(() => undefined));
      const pending = createRoom("Alice");
      const assertion = expect(pending).rejects.toMatchObject({ code: "NETWORK" });
      await vi.advanceTimersByTimeAsync(LOBBY_REQUEST_TIMEOUT_MS);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects implausible codes without calling the server", async () => {
    expect(await joinCode("../etc")).toBe("NOT_FOUND");
    expect(await joinCode("")).toBe("NOT_FOUND");
    expect(client.joinMatch).not.toHaveBeenCalled();
  });
});
