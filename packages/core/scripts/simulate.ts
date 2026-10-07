import { percentile, runMany } from "../src/testing";
import type { BotStyle } from "../src/testing";

const SEEDS = 100;
const PLAYER_COUNTS = [2, 4, 6];
const STYLES: BotStyle[] = ["careful", "aggressive"];

const format = (value: number | null): string => (value === null ? "-" : String(value));

const rows: string[][] = [["players", "style", "games", "median", "p10", "p90", "median 1st elim", "unfinished"]];
for (const players of PLAYER_COUNTS) {
  for (const style of STYLES) {
    const results = runMany({ players, style, seeds: SEEDS });
    const finished = results.filter((result) => result.finished);
    const rounds = finished.map((result) => result.rounds);
    const firstElims = results
      .map((result) => result.firstEliminationRound)
      .filter((round): round is number => round !== null);
    rows.push([
      String(players),
      style,
      String(results.length),
      format(percentile(rounds, 0.5)),
      format(percentile(rounds, 0.1)),
      format(percentile(rounds, 0.9)),
      format(percentile(firstElims, 0.5)),
      String(results.length - finished.length)
    ]);
  }
}

const widths = (rows[0] ?? []).map((_, column) => Math.max(...rows.map((row) => (row[column] ?? "").length)));
for (const row of rows) {
  console.log(row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ").trimEnd());
}
