import { describe, expect, it } from "vitest";
import { BOARD_GRID_SIZE, BOARD_TILE_IDS, getTileCell } from "./board-layout";

describe("getTileCell", () => {
  it("puts the corners where the design has them", () => {
    expect(getTileCell(1)).toEqual({ row: 1, col: 11 }); // top-right
    expect(getTileCell(11)).toEqual({ row: 11, col: 11 }); // bottom-right
    expect(getTileCell(21)).toEqual({ row: 11, col: 1 }); // bottom-left
    expect(getTileCell(31)).toEqual({ row: 1, col: 1 }); // top-left
  });

  it("runs 02..10 down the right column, 20..12 left along the bottom, 30..22 down the left column and 32..40 along the top", () => {
    expect(getTileCell(2)).toEqual({ row: 2, col: 11 });
    expect(getTileCell(10)).toEqual({ row: 10, col: 11 });
    expect(getTileCell(12)).toEqual({ row: 11, col: 10 });
    expect(getTileCell(20)).toEqual({ row: 11, col: 2 });
    expect(getTileCell(22)).toEqual({ row: 10, col: 1 });
    expect(getTileCell(30)).toEqual({ row: 2, col: 1 });
    expect(getTileCell(32)).toEqual({ row: 1, col: 2 });
    expect(getTileCell(40)).toEqual({ row: 1, col: 10 });
  });

  it("gives every tile its own cell on the outer ring", () => {
    const cells = BOARD_TILE_IDS.map((tileId) => getTileCell(tileId));
    expect(new Set(cells.map((cell) => `${cell.row},${cell.col}`)).size).toBe(40);
    for (const { row, col } of cells) {
      expect(row === 1 || row === BOARD_GRID_SIZE || col === 1 || col === BOARD_GRID_SIZE).toBe(true);
    }
  });

  it("neighbouring tiles touch", () => {
    for (const tileId of BOARD_TILE_IDS) {
      const here = getTileCell(tileId);
      const next = getTileCell((tileId % 40) + 1);
      expect(Math.abs(here.row - next.row) + Math.abs(here.col - next.col), `${tileId} -> next`).toBe(1);
    }
  });

  it("rejects tiles off the board", () => {
    expect(() => getTileCell(0)).toThrow();
    expect(() => getTileCell(41)).toThrow();
  });
});
