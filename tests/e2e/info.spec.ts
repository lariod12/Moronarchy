import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { END_TURN_CROWN, SHAKING_CROWN, answerDialog, createRoomAs, hasHorizontalOverflow, holdButton, joinRoomAs, openPlayer, readRoomCode, resolveUntilSettled, whoShakes } from "./helpers";
import type { Player } from "./helpers";

// Two players play a few real turns (buying what they can), then every Home tile is opened on both phones:
// Stats with the arrows, Plots (Mine / All / detail), Residents, Items, Events and the Map's Positions tab.
const TURNS = 3;

const topBarTitle = async (page: Page): Promise<string> => (await page.locator(".shell-top-bar__side--end").innerText()).trim();

const rowsOf = (page: Page) => page.locator("tbody tr:not(.ui-data-table__action-row)");

// Notification popups (a fee received, an item found) sit on top of every page: clear them before navigating.
const clearDialogs = async (page: Page): Promise<void> => {
  for (let attempt = 0; attempt < 8 && (await page.getByRole("dialog").count()) > 0; attempt += 1) {
    if (!(await answerDialog(page))) {
      await page.waitForTimeout(150);
    }
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

// A crown tap goes to the Map, or Home when already on the Map.
const goHomeWithCrown = async (page: Page): Promise<void> => {
  const crown = page.getByRole("button", { name: /^Crown/ });
  const wasOnMap = /\/map$/.test(page.url());
  await crown.click();
  if (!wasOnMap) {
    await expect(page).toHaveURL(/\/map$/);
    await crown.click();
  }
  await expect(page).toHaveURL(/\/home$/);
};

const openFromHome = async (page: Page, tile: string): Promise<void> => {
  await clearDialogs(page);
  await goHomeWithCrown(page);
  await page.getByRole("button", { name: tile, exact: true }).click();
};

const playTurn = async (players: Player[]): Promise<void> => {
  const active = await whoShakes(players);
  const other = players.find((player) => player !== active) as Player;
  await holdButton(active.page, SHAKING_CROWN);
  await expect(active.page).toHaveURL(/\/map$/);
  await active.page.getByRole("button", { name: "Tap to Roll" }).click();
  await resolveUntilSettled(active.page, other.page);
  await holdButton(active.page, END_TURN_CROWN);
  await expect(other.page.getByRole("button", { name: SHAKING_CROWN })).toBeVisible();
};

// Every info page on one phone. `me` / `them` are the names of the two kings.
const walkInfoPages = async (player: Player, me: string, them: string, overflowCheck: boolean): Promise<{ ownedPlots: number }> => {
  const { page } = player;
  const noOverflow = async (label: string): Promise<void> => {
    if (overflowCheck) {
      expect(await hasHorizontalOverflow(page), `${me}: overflow on ${label}`).toBe(false);
    }
  };

  // I1: every tile is enabled on Home.
  await clearDialogs(page);
  await goHomeWithCrown(page);
  for (const tile of ["Map", "Stats", "Plots", "Residents", "Items", "Events"]) {
    await expect(page.getByRole("button", { name: tile, exact: true })).toBeEnabled();
  }
  await noOverflow("home");

  // I2 + I9: Stats shows my king, the arrows walk to the other king and back, Back and Crown navigate.
  await page.getByRole("button", { name: "Stats", exact: true }).click();
  await expect(page).toHaveURL(/\/stats\/\d$/);
  expect(await topBarTitle(page)).toBe("Players Info");
  await expect(page.getByRole("heading", { name: me })).toBeVisible();
  for (const label of ["Level", "Coin", "Health", "Max Health", "Attack", "Defense", "Lucky", "Laps", "Plots"]) {
    await expect(page.getByText(new RegExp(`^${label}: `))).toBeVisible();
  }
  await noOverflow("stats");
  await page.getByRole("button", { name: "Next king" }).click();
  await expect(page.getByRole("heading", { name: them })).toBeVisible();
  await page.screenshot({ path: `test-results/ui/screens/e2e-info-stats-${me}.png` });
  await page.getByRole("button", { name: "Next king" }).click();
  await expect(page.getByRole("heading", { name: me })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/home$/);

  // The HUD avatar opens my own Players Info from anywhere.
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await clearDialogs(page);
  await page.getByRole("button", { name: new RegExp(`^${me}: profile`) }).click();
  await expect(page).toHaveURL(/\/stats\/\d$/);
  await expect(page.getByRole("heading", { name: me })).toBeVisible();

  // I3: Plots Mine shows my plots (or the empty state), All lists the 39 plots with an Owner column.
  await openFromHome(page, "Plots");
  await expect(page).toHaveURL(/\/plots$/);
  expect(await topBarTitle(page)).toBe("Plots");
  const mine = await rowsOf(page).count();
  if (mine === 0) {
    await expect(page.getByText("You own no plots yet")).toBeVisible();
  } else {
    await expect(page.getByRole("columnheader")).toHaveText(["Plots", "Level", "Income", "Price"]);
  }
  await noOverflow("plots mine");
  await page.getByRole("tab", { name: "All" }).click();
  await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();
  await expect(rowsOf(page)).toHaveCount(39);
  await noOverflow("plots all");
  await page.getByRole("button", { name: "View All" }).click();
  await expect(page.getByTestId("plots-grid").getByRole("button")).toHaveCount(39);
  await noOverflow("plots grid");
  await page.getByRole("button", { name: "View Table" }).click();

  // I4: a plot detail opens with its tags, and Upgrade is locked outside the Start station.
  await page.getByRole("button", { name: "details" }).click();
  await expect(page.getByTestId("plot-detail")).toBeVisible();
  expect(await topBarTitle(page)).toMatch(/^Plot \d+$/);
  for (const label of ["Level", "Price", "Income", "Fee", "Health", "Defense", "Max Resident", "Owner"]) {
    await expect(page.getByText(new RegExp(`^${label}: `))).toBeVisible();
  }
  await noOverflow("plot detail");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/plots\?scope=all$/);
  await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  if (mine > 0) {
    await page.getByRole("tab", { name: "Mine" }).click();
    await page.getByRole("button", { name: "details" }).click();
    await expect(page.getByText(`Owner: ${me}`)).toBeVisible();
    const upgrade = page.getByRole("button", { name: /^Upgrade/ });
    await expect(upgrade).toBeDisabled();
    await expect(page.getByTestId("upgrade-hint")).toBeVisible();
    await page.screenshot({ path: `test-results/ui/screens/e2e-info-plot-${me}.png` });
  }

  // I5: Residents overview with two cards, and a kind page.
  await openFromHome(page, "Residents");
  await expect(page).toHaveURL(/\/residents$/);
  expect(await topBarTitle(page)).toBe("Residents");
  await expect(page.getByRole("button", { name: /Warrior/ })).toContainText(/x\d+/);
  await expect(page.getByRole("button", { name: /Farmer/ })).toContainText(/x\d+/);
  await noOverflow("residents");
  await page.getByRole("button", { name: /Farmer/ }).click();
  await expect(page).toHaveURL(/\/residents\/farmer$/);
  expect(await topBarTitle(page)).toBe("Farmer");
  await noOverflow("residents farmer");
  await page.getByRole("button", { name: "Back" }).click();

  // I6: Items grid (or the empty state), and the detail of the first item.
  await openFromHome(page, "Items");
  await expect(page).toHaveURL(/\/items$/);
  expect(await topBarTitle(page)).toBe("Items");
  const itemCards = page.getByTestId("items-grid").getByRole("button");
  if ((await itemCards.count()) === 0) {
    await expect(page.getByText("You have no items yet")).toBeVisible();
  } else {
    await itemCards.first().click();
    await expect(page.getByTestId("item-detail")).toBeVisible();
    await page.getByRole("button", { name: "View Details" }).click();
    await expect(page.getByRole("dialog", { name: "Description" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await noOverflow("item detail");
    await page.getByRole("button", { name: "Back" }).click();
  }
  await noOverflow("items");

  // I7: Events shows the History tab and either the list or the empty state.
  await openFromHome(page, "Events");
  await expect(page).toHaveURL(/\/events$/);
  expect(await topBarTitle(page)).toBe("Events");
  await expect(page.getByRole("tab", { name: "History Events" })).toBeVisible();
  if ((await page.getByTestId("event-card").count()) === 0) {
    await expect(page.getByText("No events yet")).toBeVisible();
  }
  await noOverflow("events");

  // I8: the Map's Positions tab lists both kings in turn order.
  await openFromHome(page, "Map");
  await expect(page).toHaveURL(/\/map$/);
  expect(await topBarTitle(page)).toBe("Map");
  await page.getByRole("tab", { name: "Positions" }).click();
  await expect(page.getByRole("columnheader")).toHaveText(["Turn", "Player", "Position", "Laps"]);
  await expect(page.getByTestId("positions-player")).toHaveCount(2);
  await expect(page.getByTestId("positions")).toContainText(me);
  await expect(page.getByTestId("positions")).toContainText(them);
  await noOverflow("positions");
  await page.screenshot({ path: `test-results/ui/screens/e2e-info-positions-${me}.png` });
  await page.getByRole("tab", { name: "Board" }).click();
  await expect(page.getByTestId("board-tile")).toHaveCount(40);

  // Back returns to the previous page and the Crown to Home.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/home$/);
  return { ownedPlots: mine };
};

test.describe("info pages", () => {
  test("two players open every Home tile after a few real turns", async ({ browser }) => {
    test.setTimeout(360_000);
    const errors: string[] = [];
    const alice = await openPlayer(browser, "Alice", errors);
    const bob = await openPlayer(browser, "Bob", errors, { width: 320, height: 640 });
    const players = [alice, bob];

    try {
      const code = await createRoomAs(alice.page, "Alice");
      await joinRoomAs(bob.page, "Bob", code);
      await bob.page.getByRole("button", { name: "Ready" }).click();
      await alice.page.getByRole("button", { name: "Start" }).click();
      for (const player of players) {
        await expect(player.page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
        expect(await readRoomCode(player.page)).toBe(code);
      }

      for (let turn = 1; turn <= TURNS; turn += 1) {
        await playTurn(players);
      }

      const aliceResult = await walkInfoPages(alice, "Alice", "Bob", false);
      const bobResult = await walkInfoPages(bob, "Bob", "Alice", true);
      console.log(`Plots owned after ${TURNS} turns: Alice ${aliceResult.ownedPlots}, Bob ${bobResult.ownedPlots}`);

      // The data is the same on both phones: whatever one king owns shows up in the other one's All list.
      await alice.page.goto(`/room/${code}/plots?scope=all`);
      await expect(rowsOf(alice.page)).toHaveCount(39);
      const ownerCell = alice.page.locator("tbody tr:not(.ui-data-table__action-row) td:nth-child(5)");
      const owners = await ownerCell.allInnerTexts();
      expect(owners.filter((owner) => owner.trim() === "Alice")).toHaveLength(aliceResult.ownedPlots);
      expect(owners.filter((owner) => owner.trim() === "Bob")).toHaveLength(bobResult.ownedPlots);
    } finally {
      for (const player of players) {
        await player.context.close();
      }
    }

    expect(errors).toEqual([]);
  });
});
