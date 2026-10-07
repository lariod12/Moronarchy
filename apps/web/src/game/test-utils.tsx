import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { vi } from "vitest";
import type { Mock } from "vitest";
import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { GameRouteTree } from "../screens/game/GameRoutes";
import type { SendMove } from "./game-actions";
import { GameSessionProvider } from "./GameSession";

export const TEST_ROOM = "R001";

const LocationProbe = () => <output data-testid="location">{useLocation().pathname}</output>;

export interface RenderGameOptions {
  // In-game page to start on, e.g. "map" or "manage/5".
  page?: string;
  gameId?: string;
  send?: Mock<SendMove>;
}

// Renders the real in-game route tree for one viewer. `send` records the moves the UI would send; the state itself
// only changes when the test calls `update` with the next engine state.
export const renderGame = (initial: GameState, viewerId: PlayerId, { page = "home", gameId = "test-game", send = vi.fn<SendMove>() }: RenderGameOptions = {}) => {
  const tree = (game: GameState) => (
    <MemoryRouter initialEntries={[`/room/${TEST_ROOM}/${page}`]}>
      <Routes>
        <Route
          path="/room/:roomCode/*"
          element={
            <GameSessionProvider game={game} viewerId={viewerId} roomCode={TEST_ROOM} gameId={gameId} send={send} moveStepMs={10}>
              <LocationProbe />
              <GameRouteTree />
            </GameSessionProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  );
  const view = render(tree(initial));
  return {
    ...view,
    send,
    update: (game: GameState) => view.rerender(tree(game)),
    path: () => screen.getByTestId("location").textContent ?? ""
  };
};

// Holds a long-press button down for `ms` (the test must be using fake timers).
export const holdButton = (button: HTMLElement, ms = 700): void => {
  fireEvent.pointerDown(button);
  act(() => {
    vi.advanceTimersByTime(ms);
  });
  fireEvent.pointerUp(button);
};
