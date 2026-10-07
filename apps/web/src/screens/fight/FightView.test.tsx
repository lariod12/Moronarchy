import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getFightView, getFinalFightView } from "@moronarchy/core/engine";
import type { FightView as FightViewModel } from "@moronarchy/core/engine";
import * as scenarios from "../../dev/gallery/game-fixtures";
import type { GameScenario } from "../../dev/gallery/game-fixtures";
import { FightView } from "./FightView";
import type { FightViewProps } from "./FightView";

const viewOf = ({ game, viewerId }: GameScenario): { view: FightViewModel; names: Record<string, string> } => {
  const view = getFightView(game, viewerId);
  if (!view) {
    throw new Error("no fight");
  }
  return { view, names: Object.fromEntries(Object.values(game.kings).map((king) => [king.id, king.name])) };
};

const show = (scenario: GameScenario, props: Partial<FightViewProps> = {}) => {
  const { view, names } = viewOf(scenario);
  const handlers = { onRoll: vi.fn(), onUseItem: vi.fn(), onRetreat: vi.fn() };
  render(<FightView view={view} names={names} {...handlers} {...props} />);
  return handlers;
};

const panels = (): HTMLElement[] => screen.getAllByTestId("fight-panel");

describe("FightView", () => {
  it("puts the viewer on the left with You, health, and both fighters side by side", () => {
    show(scenarios.fightKingStart("0"));
    const [left, right] = panels();
    expect(left).toHaveAttribute("data-position", "left");
    expect(within(left as HTMLElement).getByText("You")).toBeInTheDocument();
    expect(within(left as HTMLElement).getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
    expect(within(right as HTMLElement).getByText("Bob")).toBeInTheDocument();
    expect(within(right as HTMLElement).getByRole("meter")).toHaveTextContent("100/100");
    expect(screen.getAllByRole("meter")).toHaveLength(2);
    expect(screen.getByRole("img", { name: "versus" })).toBeInTheDocument();
  });

  it("shows the attacker on the left when the viewer only watches, without any button", () => {
    show(scenarios.fightSpectator());
    const [left] = panels();
    expect(within(left as HTMLElement).getByText("Bob")).toBeInTheDocument();
    expect(screen.getByTestId("fight-view")).toHaveAttribute("data-role", "spectator");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByTestId("fight-status")).toHaveTextContent("Waiting for Bob and Alice to roll…");
  });

  it("marks won and lost rounds under the health bars (crown / cross)", () => {
    show(scenarios.fightKingMid("1"));
    const [mine, theirs] = panels();
    expect(within(mine as HTMLElement).getAllByTestId("round-marker").map((marker) => marker.getAttribute("data-result"))).toEqual(["won", "lost"]);
    expect(within(theirs as HTMLElement).getAllByTestId("round-marker").map((marker) => marker.getAttribute("data-result"))).toEqual(["lost", "won"]);
  });

  it("shows each die with its score line, the round winner and the damage on the losing panel", () => {
    show(scenarios.fightKingMid("1"));
    // Round 2: Bob rolled 2 (+5) against Alice 6 (+5): Alice wins and Bob takes 8.
    expect(screen.getAllByTestId("fight-score").map((node) => node.textContent)).toEqual(["2 + 5 = 7", "6 + 5 = 11"]);
    expect(screen.getByTestId("fight-round-note")).toHaveTextContent("Alice wins the round");
    const [mine, theirs] = panels();
    expect(within(mine as HTMLElement).getByTestId("fight-damage")).toHaveTextContent("-8");
    expect(within(theirs as HTMLElement).queryByTestId("fight-damage")).not.toBeInTheDocument();
  });

  it("hides the outcome while the dice are rolling", () => {
    show(scenarios.fightKingMid("1"), { rolling: true });
    expect(screen.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "true");
    expect(screen.queryByTestId("fight-damage")).not.toBeInTheDocument();
    expect(screen.getByTestId("fight-round-note").textContent?.trim()).toBe("");
    expect(screen.getAllByTestId("fight-score").map((node) => node.textContent?.trim())).toEqual(["", ""]);
  });

  it("offers Roll to a king who has not rolled", () => {
    const handlers = show(scenarios.fightKingMid("1"));
    expect(screen.getByTestId("fight-status")).toHaveTextContent("Round 3: roll the dice");
    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    expect(handlers.onRoll).toHaveBeenCalledTimes(1);
  });

  it("shows who the fight waits for after the viewer rolled", () => {
    show(scenarios.fightWaiting());
    expect(screen.queryByRole("button", { name: "Roll" })).not.toBeInTheDocument();
    expect(screen.getByTestId("fight-status")).toHaveTextContent("Waiting for Alice to roll…");
    expect(screen.getByRole("button", { name: "Use item" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retreat" })).toBeDisabled();
  });

  it("offers Retreat and Use item to the attacker", () => {
    const attacker = show(scenarios.fightKingStart("1"));
    fireEvent.click(screen.getByRole("button", { name: "Retreat" }));
    expect(attacker.onRetreat).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Use item" }));
    expect(attacker.onUseItem).toHaveBeenCalledTimes(1);
  });

  it("gives the defending king Roll and Use item but no Retreat", () => {
    show(scenarios.fightKingStart("0"));
    expect(screen.getByRole("button", { name: "Roll" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Use item" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Retreat" })).not.toBeInTheDocument();
  });

  it("disables Use item when no usable item exists", () => {
    show(scenarios.fightKingStart("1"), { canUseItem: false });
    expect(screen.getByRole("button", { name: "Use item" })).toBeDisabled();
  });

  it("draws the residents with the number still alive", () => {
    show(scenarios.fightGarrison());
    const garrison = panels()[1] as HTMLElement;
    expect(garrison).toHaveAttribute("data-kind", "garrison");
    expect(within(garrison).getByText("Residents ×1")).toBeInTheDocument();
    expect(within(garrison).getByRole("meter")).toHaveAttribute("aria-valuemax", "80");
  });

  it("draws the plot with its level and says Blocked when it wins a round", () => {
    show(scenarios.fightPlot());
    const [mine, plot] = panels();
    expect(within(plot as HTMLElement).getByText("Plot 5 · Lv 2")).toBeInTheDocument();
    expect(within(plot as HTMLElement).getByRole("meter")).toHaveAttribute("aria-valuemax", "35");
    expect(within(mine as HTMLElement).getByTestId("fight-damage")).toHaveTextContent("Blocked");
  });

  it("shows the active buffs as tags on the panel", () => {
    show(scenarios.fightBuffs());
    const [mine, theirs] = panels();
    expect(within(mine as HTMLElement).getByText("ATK +3")).toBeInTheDocument();
    expect(within(mine as HTMLElement).getByText("DEF +3")).toBeInTheDocument();
    expect(within(theirs as HTMLElement).getByText("ATK +3")).toBeInTheDocument();
    expect(within(theirs as HTMLElement).queryByText(/DEF \+/)).not.toBeInTheDocument();
  });

  it("says when a round is a tie", () => {
    const scenario = scenarios.fightKingMid("1");
    const round = scenario.game.fight?.rounds[1];
    if (!round) {
      throw new Error("round missing");
    }
    round.winner = "tie";
    round.damage = 0;
    show(scenario);
    expect(screen.getByTestId("fight-round-note")).toHaveTextContent("Tie — roll again");
    expect(screen.queryByTestId("fight-damage")).not.toBeInTheDocument();
  });

  describe("when the fight is over", () => {
    const showFinal = (scenario: GameScenario, props: Partial<FightViewProps> = {}) => {
      const view = getFinalFightView(scenario.game, scenario.viewerId);
      if (!view) {
        throw new Error("no finished fight");
      }
      const names = Object.fromEntries(Object.values(scenario.game.kings).map((king) => [king.id, king.name]));
      render(<FightView view={view} names={names} {...props} />);
    };

    it("keeps the deciding round, the winner and no buttons", () => {
      showFinal(scenarios.fightWon());
      expect(screen.getAllByTestId("fight-score").map((node) => node.textContent)).toEqual(["6 + 5 = 11", "1 + 4 = 5"]);
      expect(screen.getByTestId("fight-round-note")).toHaveTextContent("You win the round");
      expect(screen.getByTestId("fight-status")).toHaveTextContent("You win the fight");
      const [mine, theirs] = panels();
      expect(mine).toHaveAttribute("data-winner", "true");
      expect(within(mine as HTMLElement).getByText("Winner")).toBeInTheDocument();
      expect(theirs).toHaveAttribute("data-winner", "false");
      expect(within(mine as HTMLElement).getAllByTestId("round-marker")).toHaveLength(2);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("hides the winner while the last round is still rolling", () => {
      showFinal(scenarios.fightWon(), { rolling: true });
      expect(screen.queryByText("Winner")).not.toBeInTheDocument();
      expect(screen.getByTestId("fight-status").textContent?.trim()).toBe("");
      expect(screen.queryByTestId("fight-damage")).not.toBeInTheDocument();
    });

    it("names the winner for someone who only watched", () => {
      showFinal({ game: scenarios.fightWon().game, viewerId: "2" });
      expect(screen.getByTestId("fight-status")).toHaveTextContent("Alice wins the fight");
    });

    it("says who retreated", () => {
      showFinal(scenarios.fightRetreated());
      expect(screen.getByTestId("fight-status")).toHaveTextContent("You retreated");
    });
  });
});
