import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMatchState, setReady, sit } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { getLoseFace } from "../../game/end-model";
import { saveSeen } from "../../game/seen-store";
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
// Alice won, Bob was knocked out by the finishing move (round 2), Cara went out before him (round 1).
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

// What the tab saved while the game was still being played: nothing in the log of the finish had been seen yet.
const playedBefore = (playerId: string, dismissed: string[] = []): void => {
  saveSeen("R001-0", playerId, { seq: 0, dismissed });
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

const rankingNames = (): (string | null)[] =>
  screen.getAllByTestId("ranking-row").map((row) => row.querySelector(".result-ranking__name")?.textContent ?? null);

describe("ResultScreen", () => {
  beforeEach(() => {
    sessionStorage.clear();
    send.mockClear();
    clearPlayerSession.mockClear();
    mockedState = finishedMatch();
    mockedPlayerId = "0";
  });

  it("shows the winner the Win face first, then the ranking from the engine", () => {
    playedBefore("0");
    renderResult();
    expect(screen.getByText("You win!")).toBeInTheDocument();
    expect(screen.getByText("Last king standing")).toBeInTheDocument();
    expect(screen.queryByTestId("ranking")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See ranking" }));
    expect(screen.queryByTestId("win-face")).not.toBeInTheDocument();
    expect(rankingNames()).toEqual(["Alice (you)", "Bob", "Cara"]);
    expect(screen.getAllByTestId("ranking-row").map((row) => row.querySelector(".result-ranking__status")?.textContent)).toEqual([
      "Winner",
      "Out in round 2",
      "Out in round 1"
    ]);
  });

  it("shows a king knocked out by the finishing move the Lose face first", () => {
    mockedPlayerId = "1";
    playedBefore("1");
    renderResult();
    expect(screen.getByText("You are out!")).toBeInTheDocument();
    expect(screen.getByText("Bankrupt in round 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Keep watching" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See ranking" }));
    expect(rankingNames()).toEqual(["Alice", "Bob (you)", "Cara"]);
  });

  it("takes everyone else straight to the ranking", () => {
    mockedPlayerId = "2";
    const { game } = scenarios.finished();
    const key = getLoseFace(game, "2", 0, new Set())?.key ?? "";
    expect(key).toMatch(/^lose:/);
    playedBefore("2", [key]); // Cara pressed Keep watching when she went out earlier
    renderResult();
    expect(screen.queryByTestId("lose-face")).not.toBeInTheDocument();
    expect(rankingNames()).toEqual(["Alice", "Bob", "Cara (you)"]);
  });

  it("goes straight to the ranking in a tab that never saw the game being played, and after a reload", () => {
    const first = renderResult();
    expect(screen.queryByTestId("win-face")).not.toBeInTheDocument();
    expect(screen.getByTestId("ranking")).toBeInTheDocument();
    first.unmount();

    sessionStorage.clear();
    playedBefore("0");
    const live = renderResult();
    fireEvent.click(screen.getByRole("button", { name: "See ranking" }));
    live.unmount();
    renderResult(); // a reload: the face was answered, so it is not replayed
    expect(screen.queryByTestId("win-face")).not.toBeInTheDocument();
    expect(screen.getByTestId("ranking")).toBeInTheDocument();
  });

  it("lets only the host send everyone back to the lobby with Play Again", () => {
    renderResult();
    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
    expect(send).toHaveBeenCalledWith("returnToLobby");
    expect(screen.queryByText("Waiting for the host to start again")).not.toBeInTheDocument();
  });

  it("keeps Play Again disabled for a guest and says why", () => {
    mockedPlayerId = "1";
    renderResult();
    expect(screen.getByRole("button", { name: "Play Again" })).toBeDisabled();
    expect(screen.getByText("Waiting for the host to start again")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
    expect(send).not.toHaveBeenCalled();
  });

  it("Quit gives the seat back, clears the session and goes back to Welcome", () => {
    mockedPlayerId = "1";
    renderResult();
    fireEvent.click(screen.getByRole("button", { name: "Quit" }));
    expect(send).toHaveBeenCalledWith("leaveSeat");
    expect(clearPlayerSession).toHaveBeenCalledWith("R001");
    expect(screen.getByText("Welcome screen")).toBeInTheDocument();
  });

  it("the Lose face has its own Leave room link", () => {
    mockedPlayerId = "1";
    playedBefore("1");
    renderResult();
    fireEvent.click(screen.getByRole("button", { name: "Leave room" }));
    expect(send).toHaveBeenCalledWith("leaveSeat");
    expect(clearPlayerSession).toHaveBeenCalledWith("R001");
    expect(screen.getByText("Welcome screen")).toBeInTheDocument();
  });
});
