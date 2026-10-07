import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMatchState, setReady, sit } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { ResultScreen } from "./ResultScreen";

const send = vi.fn();
let mockedState: MatchState | null = null;
let mockedPlayerId = "0";

vi.mock("../../match/MatchProvider", () => ({
  useMatch: () => ({ state: mockedState, playerID: mockedPlayerId, matchID: "R001", roomCode: "R001", send })
}));

const clearPlayerSession = vi.fn();
vi.mock("../../api/lobby", () => ({
  clearPlayerSession: (matchID: string) => clearPlayerSession(matchID)
}));

// A finished match: the engine game from the fixtures inside a real match state with the same three seats.
const finishedMatch = (): MatchState => {
  const match = createMatchState();
  for (const [id, name] of [
    ["0", "Alice"],
    ["1", "Bob"],
    ["2", "Cara"]
  ] as const) {
    sit(match, id, name);
  }
  setReady(match, "1", true);
  setReady(match, "2", true);
  match.game = scenarios.finished().game;
  match.stage = "finished";
  return match;
};

const renderResult = () =>
  render(
    <MemoryRouter initialEntries={["/room/R001"]}>
      <Routes>
        <Route path="/" element={<p>Welcome screen</p>} />
        <Route path="/room/:roomCode" element={<ResultScreen />} />
      </Routes>
    </MemoryRouter>
  );

describe("ResultScreen", () => {
  beforeEach(() => {
    send.mockClear();
    clearPlayerSession.mockClear();
    mockedState = finishedMatch();
    mockedPlayerId = "0";
  });

  it("shows the winner and the ranking from the engine", () => {
    renderResult();
    expect(screen.getByRole("heading", { name: "Game over" })).toBeInTheDocument();
    expect(screen.getByText("Winner: Alice")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["1. Alice", "2. Bob", "3. Cara"]);
  });

  it("lets the host send everyone back to the lobby", () => {
    renderResult();
    fireEvent.click(screen.getByRole("button", { name: "Back to lobby" }));
    expect(send).toHaveBeenCalledWith("returnToLobby");
  });

  it("gives a guest only Quit, which clears the session and goes back to Welcome", () => {
    mockedPlayerId = "1";
    renderResult();
    expect(screen.queryByRole("button", { name: "Back to lobby" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quit" }));
    expect(clearPlayerSession).toHaveBeenCalledWith("R001");
    expect(screen.getByText("Welcome screen")).toBeInTheDocument();
  });
});
