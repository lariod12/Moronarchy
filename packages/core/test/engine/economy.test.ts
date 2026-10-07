import { describe, expect, it } from "vitest";
import {
  getInflationMultiplier,
  getPlotBasePrice,
  getPlotFee,
  getPlotHealCost,
  getPlotIncome,
  getPlotPrice,
  getPlotUpgradeCost,
  getResidentHealCost,
  getResidentUpgradeCost
} from "../../src/engine";
import { addResident, createTestGame, givePlot } from "../../src/testing";

describe("plot economy", () => {
  it("uses the regional base price", () => {
    expect(getPlotBasePrice(2)).toBe(60);
    expect(getPlotBasePrice(10)).toBe(60);
    expect(getPlotBasePrice(11)).toBe(80);
    expect(getPlotBasePrice(20)).toBe(80);
    expect(getPlotBasePrice(21)).toBe(100);
    expect(getPlotBasePrice(31)).toBe(120);
    expect(getPlotBasePrice(40)).toBe(120);
    expect(getPlotPrice(25)).toBe(100);
  });

  it("matches the fee table by region and level", () => {
    const state = createTestGame(2);
    const table: Record<number, number[]> = {
      2: [15, 30, 54, 84, 120, 168],
      15: [20, 40, 72, 112, 160, 224],
      25: [25, 50, 90, 140, 200, 280],
      35: [30, 60, 108, 168, 240, 336]
    };
    for (const [tile, fees] of Object.entries(table)) {
      fees.forEach((fee, level) => {
        const plot = givePlot(state, "0", Number(tile), level);
        expect(getPlotFee(state, plot)).toBe(fee);
      });
    }
  });

  it("applies royal inflation from round 20 in steps of 5 rounds", () => {
    expect(getInflationMultiplier(1)).toBe(1);
    expect(getInflationMultiplier(19)).toBe(1);
    expect(getInflationMultiplier(20)).toBe(1.25);
    expect(getInflationMultiplier(24)).toBe(1.25);
    expect(getInflationMultiplier(25)).toBe(1.5);
    expect(getInflationMultiplier(30)).toBe(1.75);

    const state = createTestGame(2);
    const plot = givePlot(state, "0", 2, 3); // base fee 84
    const feeAt = (round: number) => {
      state.round = round;
      return getPlotFee(state, plot);
    };
    expect(feeAt(19)).toBe(84);
    expect(feeAt(20)).toBe(105);
    expect(feeAt(24)).toBe(105);
    expect(feeAt(25)).toBe(126);
  });

  it("marketBoom multiplies fees by 1.5", () => {
    const state = createTestGame(2);
    const plot = givePlot(state, "0", 2, 3);
    state.activeGlobalEvents.push({ eventId: "marketBoom", startRound: 1, endRound: 1 });
    expect(getPlotFee(state, plot)).toBe(126);
    state.round = 2; // window over even if not cleaned up yet
    expect(getPlotFee(state, plot)).toBe(84);
  });

  it("computes income with farmer bonus", () => {
    const state = createTestGame(2);
    const plot = givePlot(state, "0", 2, 0);
    expect(getPlotIncome(state, plot)).toBe(3);
    givePlot(state, "0", 2, 5);
    expect(getPlotIncome(state, plot)).toBe(33);
    addResident(state, 2, "farmer", 3);
    addResident(state, 2, "warrior", 2);
    expect(getPlotIncome(state, plot)).toBe(33 + 30);
    const high = givePlot(state, "0", 35, 3);
    expect(getPlotIncome(state, high)).toBe(34);
  });

  it("computes upgrade and heal costs", () => {
    const state = createTestGame(2);
    const costs = [0, 1, 2, 3, 4].map((level) => getPlotUpgradeCost(givePlot(state, "0", 2, level)));
    expect(costs).toEqual([30, 45, 60, 75, 90]);
    expect(getPlotUpgradeCost(givePlot(state, "0", 2, 5))).toBeNull();

    const plot = givePlot(state, "0", 2, 2);
    plot.health = 0;
    expect(getPlotHealCost(plot)).toBe(40);
    plot.health = 20;
    expect(getPlotHealCost(plot)).toBe(18);
    plot.health = 35;
    expect(getPlotHealCost(plot)).toBe(0);
  });

  it("computes resident upgrade and heal costs", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 5);
    const warrior = addResident(state, 2, "warrior", 1);
    const farmer = addResident(state, 2, "farmer", 1);
    expect(getResidentUpgradeCost(warrior)).toBe(40);
    warrior.level = 2;
    expect(getResidentUpgradeCost(warrior)).toBe(80);
    expect(getResidentUpgradeCost(farmer)).toBe(25);
    farmer.level = 5;
    expect(getResidentUpgradeCost(farmer)).toBeNull();

    warrior.level = 1;
    warrior.health = 15;
    expect(getResidentHealCost(warrior)).toBe(5);
    warrior.health = 30;
    expect(getResidentHealCost(warrior)).toBe(0);
  });
});
