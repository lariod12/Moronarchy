import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as scenarios from "../dev/gallery/game-fixtures";
import { holdButton, renderGame } from "./test-utils";

describe("GameLayout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects the room root to Home and shows the page title, round and activity line", () => {
    const { game, viewerId } = scenarios.mapStart();
    const view = renderGame(game, viewerId, { page: "" });
    expect(view.path()).toBe("/room/R001/home");
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
    expect(screen.getByTestId("activity-line")).toHaveTextContent("You took the turn");
  });

  it("claims the turn on a long press of the shaking crown and opens the Map", () => {
    const { game, viewerId } = scenarios.awaitingClaim();
    const view = renderGame(game, viewerId, { page: "home" });
    expect(view.path()).toBe("/room/R001/home");
    // A quick tap only goes Home.
    fireEvent.pointerDown(screen.getByRole("button", { name: /hold to take your turn/ }));
    fireEvent.pointerUp(screen.getByRole("button", { name: /hold to take your turn/ }));
    expect(view.send).not.toHaveBeenCalled();

    holdButton(screen.getByRole("button", { name: /hold to take your turn/ }));
    expect(view.send).toHaveBeenCalledWith("claimTurn");
    expect(view.path()).toBe("/room/R001/map");
  });

  it("does nothing on a long press when it is not the viewer's turn", () => {
    const { game } = scenarios.awaitingClaim();
    const view = renderGame(game, "1", { page: "map" });
    holdButton(screen.getByRole("button", { name: /^Crown/ }));
    expect(view.send).not.toHaveBeenCalled();
    expect(view.path()).toBe("/room/R001/map");
  });

  it("opens the Map from Dice Status, goes Back to Home and taps the crown to return Home", () => {
    const { game, viewerId } = scenarios.mapStart();
    const view = renderGame(game, viewerId, { page: "home" });
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Dice Status" }));
    expect(view.path()).toBe("/room/R001/map");
    expect(screen.getAllByText("Map").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(view.path()).toBe("/room/R001/home");

    fireEvent.click(screen.getByRole("button", { name: "Dice Status" }));
    fireEvent.click(screen.getByRole("button", { name: /^Crown/ }));
    expect(view.path()).toBe("/room/R001/home");
  });

  it("ends the turn through the End of turn dialog", () => {
    const { game, viewerId } = scenarios.canEndTurn();
    const view = renderGame(game, viewerId, { page: "map" });
    const crown = screen.getByRole("button", { name: /hold to end your turn/ });
    expect(screen.getByText("end turn!")).toBeInTheDocument();

    holdButton(crown);
    expect(screen.getByRole("dialog", { name: "End of turn" })).toBeInTheDocument();
    expect(screen.getByText(/This action will be end turn/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(view.send).not.toHaveBeenCalled();

    holdButton(crown);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(view.send).toHaveBeenCalledWith("endTurn");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pulls the king to the card pick and walks them through pick, confirm and congratulations", () => {
    const pick = scenarios.cardPick();
    const view = renderGame(pick.game, pick.viewerId, { page: "map" });
    expect(view.path()).toBe("/room/R001/cards");
    expect(screen.getAllByText("Upgrade Card").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getAllByTestId("upgrade-card")).toHaveLength(3);

    fireEvent.click(screen.getAllByTestId("upgrade-card")[0] as HTMLElement);
    expect(screen.getByRole("dialog", { name: "You have picked" })).toHaveTextContent("Max Health +15. Are you sure?");
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(view.send).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByTestId("upgrade-card")[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(view.send).toHaveBeenCalledWith("pickCard", 0);

    // The server accepted the pick: the card page stays for the congratulations.
    view.update(scenarios.station().game);
    expect(screen.getByRole("dialog", { name: "Congratulation!" })).toHaveTextContent("You got Max Health +15");
    expect(view.path()).toBe("/room/R001/cards");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(view.path()).toBe("/room/R001/station");
  });

  it("sends a king that wanders off during the Start Station back to it", () => {
    const { game, viewerId } = scenarios.station();
    const view = renderGame(game, viewerId, { page: "map" });
    expect(view.path()).toBe("/room/R001/station");
    expect(screen.getAllByText("Start Station").length).toBeGreaterThan(0);
  });

  it("does not force other players anywhere", () => {
    const { game } = scenarios.station();
    const view = renderGame(game, "1", { page: "map" });
    expect(view.path()).toBe("/room/R001/map");
  });

  it("keeps a spectator in the game with a Game Over HUD and no crown", () => {
    const { game, viewerId } = scenarios.spectator();
    renderGame(game, viewerId, { page: "map" });
    expect(screen.getByText("Game Over")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Crown/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });

  it("shows Reconnecting while this client is offline and nothing while it is online", () => {
    const { game, viewerId } = scenarios.mapStart();
    const view = renderGame(game, viewerId, { page: "map", selfConnected: false });
    expect(screen.getByTestId("connection-banner")).toHaveTextContent("Reconnecting…");
    view.unmount();
    renderGame(game, viewerId, { page: "map" });
    expect(screen.queryByTestId("connection-banner")).not.toBeInTheDocument();
  });

  it("shows how long until a disconnected king that the game waits on is removed", () => {
    const { game } = scenarios.waitingForAlice();
    renderGame(game, "1", { page: "map", offlinePlayerIds: ["0"] });
    expect(screen.getByTestId("absent-banner")).toHaveTextContent("Alice disconnected — removed in ~30s");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("absent-banner")).toHaveTextContent("Alice disconnected — removed in ~25s");
  });

  it("shows no absent banner when the offline king is not the one the game waits on", () => {
    const { game } = scenarios.waitingForAlice();
    renderGame(game, "1", { page: "map", offlinePlayerIds: ["2"] });
    expect(screen.queryByTestId("absent-banner")).not.toBeInTheDocument();
  });
});
