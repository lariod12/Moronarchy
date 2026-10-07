import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createRoomAs, hasHorizontalOverflow, holdButton, joinRoomAs, openPlayer, readRoomCode } from "./helpers";
import type { Player } from "./helpers";

// Play at least MIN_TURNS turns, and keep going (up to MAX_TURNS) until a king has crossed Start, so that the
// card pick and the Start Station are exercised against the real server too.
const MIN_TURNS = 8;
const MAX_TURNS = 34;
const COIN_RESERVE = 150;

// What the turn loop met along the way; printed at the end of the test.
const live = { cards: 0, stations: 0, answered: new Map<string, number>() };

const SHAKING_CROWN = /hold to take your turn/;
const END_TURN_CROWN = /hold to end your turn/;

const activityText = async (page: Page): Promise<string> => (await page.getByTestId("activity-line").innerText()).trim();

const readCoin = async (page: Page): Promise<number> => {
  const text = await page.getByText(/^coin: \d+$/).innerText({ timeout: 3000 });
  return Number(text.replace("coin: ", ""));
};

// Records which tile a king token is on (and whether a popup ever appeared while the king was still walking).
const startTrace = (page: Page, playerId: string): Promise<void> =>
  page.evaluate((id) => {
    const w = window as unknown as { __trace: string[]; __violations: number; __timer: number };
    w.__trace = [];
    w.__violations = 0;
    w.__timer = window.setInterval(() => {
      const tile =
        document.querySelector(`[data-testid="king-token"][data-player="${id}"]`)?.closest('[data-testid="board-tile"]')?.getAttribute("data-tile") ?? "";
      if (tile && w.__trace[w.__trace.length - 1] !== tile) {
        w.__trace.push(tile);
      }
      const walking = document.querySelector(".map")?.getAttribute("data-animating") === "true";
      if (walking && document.querySelector('[role="dialog"]')) {
        w.__violations += 1;
      }
    }, 25);
  }, playerId);

const stopTrace = (page: Page): Promise<{ trace: string[]; violations: number }> =>
  page.evaluate(() => {
    const w = window as unknown as { __trace: string[]; __violations: number; __timer: number };
    window.clearInterval(w.__timer);
    return { trace: w.__trace, violations: w.__violations };
  });

// Answers whatever popup is open, the way a careful player would. Returns false when nothing could be answered
// (no popup, a waiting popup, or the End of turn question that the test opens on purpose).
const tryAnswerDialog = async (page: Page): Promise<boolean> => {
  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) === 0) {
    return false;
  }
  const title = (await dialog.getByRole("heading").innerText({ timeout: 3000 })).trim();
  const key = title.replace(/[0-9]+/g, "N");
  const click = async (name: string | RegExp): Promise<boolean> => {
    const button = dialog.getByRole("button", { name });
    if ((await button.count()) === 0 || !(await button.first().isEnabled())) {
      return false;
    }
    await button.first().click({ timeout: 3000 });
    live.answered.set(key, (live.answered.get(key) ?? 0) + 1);
    return true;
  };

  if (title === "End of turn") {
    return false;
  }
  if (/^Plot \d+$/.test(title)) {
    // Buy while a reserve stays in the purse so that fees cannot bankrupt the test.
    const price = Number(/for (\d+) coin/.exec(await dialog.innerText({ timeout: 3000 }))?.[1]);
    if ((await readCoin(page)) - price >= COIN_RESERVE && (await click("Buy"))) {
      return true;
    }
    return click("Skip");
  }
  if (title === "Message") {
    return (await click(/^Pay \d+$/)) || (await click("Collect"));
  }
  if (/^You rolled/.test(title)) {
    return click("Move");
  }
  if (title === "You have picked") {
    return click("Yes");
  }
  return click("Done");
};

// A popup can close between looking at it and answering it (the other player answered, or the server moved on).
const answerDialog = async (page: Page): Promise<boolean> => {
  try {
    return await tryAnswerDialog(page);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return false;
    }
    throw error;
  }
};

// On the card page and the Start Station the active player has to act on the page itself.
const answerPage = async (page: Page): Promise<boolean> => {
  if ((await page.getByRole("dialog").count()) > 0) {
    return false;
  }
  const path = new URL(page.url()).pathname;
  if (path.endsWith("/cards")) {
    // E7: three cards; tap one, then the "Are you sure?" and "Congratulation!" popups follow.
    await expect(page.getByTestId("upgrade-card")).toHaveCount(3);
    await expect(page.getByText("Upgrade Card", { exact: true })).toBeVisible();
    await page.getByTestId("upgrade-card").first().click();
    live.cards += 1;
    return true;
  }
  if (path.endsWith("/station")) {
    // E8: lap summary, the three tabs and the bottom bar.
    await expect(page.getByTestId("station-summary")).toContainText(/^Lap complete: \+100 coin · Level \d · Income \+\d+$/);
    for (const tab of ["Plots", "Residents", "Shop"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await page.getByRole("tab", { name: "Shop" }).click();
    await expect(page.getByRole("button", { name: /^Buy \d+$/ }).first()).toBeVisible();
    await page.getByRole("button", { name: /^(Continue moving|Done)$/ }).click();
    live.stations += 1;
    return true;
  }
  return false;
};

const isSettled = async (active: Page): Promise<boolean> =>
  (await active.getByText("end turn!").isVisible()) &&
  new URL(active.url()).pathname.endsWith("/map") &&
  (await active.locator('.map[data-animating="false"]').count()) === 1 &&
  (await active.getByRole("dialog").count()) === 0;

// Plays the turn out until the Crown can end it and nothing else is open on the active page.
const resolveUntilSettled = async (active: Page, other: Page): Promise<void> => {
  const deadline = Date.now() + 60_000;
  let calmSince = 0;
  while (Date.now() < deadline) {
    if ((await active.getByRole("heading", { name: "Game over" }).count()) > 0) {
      throw new Error("The match ended early (a king went bankrupt), so the turn loop cannot continue");
    }
    if (await isSettled(active)) {
      calmSince = calmSince || Date.now();
      if (Date.now() - calmSince > 500) {
        return;
      }
    } else {
      calmSince = 0;
    }
    const handled = (await answerDialog(active)) || (await answerDialog(other)) || (await answerPage(active));
    if (!handled) {
      await active.waitForTimeout(120);
    }
  }
  throw new Error(`The turn never settled. Active URL ${active.url()}`);
};

const whoShakes = async (players: Player[]): Promise<Player> => {
  let found: Player | undefined;
  await expect
    .poll(
      async () => {
        for (const player of players) {
          if ((await player.page.getByRole("button", { name: SHAKING_CROWN }).count()) === 1) {
            found = player;
            return player.name;
          }
        }
        return "";
      },
      { timeout: 20_000 }
    )
    .not.toBe("");
  if (!found) {
    throw new Error("Nobody has a shaking crown");
  }
  return found;
};

test.describe("playing turns", () => {
  test("two players play several turns: claim, roll, walk, decide, end turn", async ({ browser }) => {
    test.setTimeout(420_000);
    live.cards = 0;
    live.stations = 0;
    live.answered.clear();
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

      // E2: Dice Status opens the Map, the other hub tiles stay locked.
      for (const player of players) {
        await expect(player.page.getByRole("button", { name: "Stats" })).toBeDisabled();
        await expect(player.page.getByRole("button", { name: "Back" })).toBeDisabled();
      }

      const turnOrder: string[] = [];
      let screenshotTaken = false;
      let reloadChecked = false;

      for (let turn = 1; turn <= MAX_TURNS && (turn <= MIN_TURNS || live.stations === 0); turn += 1) {
        const active = await whoShakes(players);
        const other = players.find((player) => player !== active) as Player;
        turnOrder.push(active.name);

        // The player who waits watches the same Map as the player who moves.
        if (!new URL(other.page.url()).pathname.endsWith("/map")) {
          await other.page.getByRole("button", { name: "Dice Status" }).click();
        }
        await expect(other.page).toHaveURL(/\/map$/);

        // E1: long-press the shaking crown claims the turn and opens the Map.
        await holdButton(active.page, SHAKING_CROWN);
        await expect(active.page).toHaveURL(/\/map$/);
        await expect(active.page.getByText("your turn!")).toBeVisible();
        await expect(other.page.getByRole("button", { name: SHAKING_CROWN })).toHaveCount(0);

        // E3: only the turn player can roll.
        await expect(active.page.getByRole("button", { name: "Tap to Roll" })).toBeEnabled();
        await expect(other.page.getByRole("button", { name: "Tap to Roll" })).toBeDisabled();
        await expect(active.page.getByTestId("board-tile")).toHaveCount(40);
        await expect(active.page.getByTestId("king-token")).toHaveCount(2);

        const before = await activityText(other.page);
        const playerId = await active.page.locator(".king-token--me").getAttribute("data-player");
        if (playerId === null) {
          throw new Error("The active king has no token");
        }
        await startTrace(active.page, playerId);
        await startTrace(other.page, playerId);

        // E4: roll, die shows the value, the king walks tile by tile on both screens.
        await active.page.getByRole("button", { name: "Tap to Roll" }).click();
        await expect(active.page.getByTestId("dice-total")).toBeVisible();
        await expect(other.page.getByTestId("dice-total")).toBeVisible();
        // E10: the activity line of the other page follows.
        await expect.poll(() => activityText(other.page)).not.toBe(before);

        await resolveUntilSettled(active.page, other.page);

        for (const page of [active.page, other.page]) {
          const { trace, violations } = await stopTrace(page);
          expect(violations, `${active.name}: popups appeared while the king was still walking (${page.url()})`).toBe(0);
          expect(trace.length, `${active.name} turn ${turn} trace ${trace.join(">")}`).toBeGreaterThanOrEqual(2);
          for (let index = 1; index < trace.length; index += 1) {
            const step = (Number(trace[index]) - Number(trace[index - 1]) + 40) % 40;
            expect(step, `tile by tile: ${trace.join(">")}`).toBe(1);
          }
        }

        if (new URL(active.page.url()).pathname.endsWith("/map")) {
          expect(await hasHorizontalOverflow(active.page)).toBe(false);
          expect(await hasHorizontalOverflow(other.page)).toBe(false);
        }

        if (!screenshotTaken) {
          screenshotTaken = true;
          await active.page.screenshot({ path: "test-results/ui/screens/e2e-game-map.png" });
        }

        // E12: a reload in the middle of the turn restores it without replaying popups or the walk.
        if (!reloadChecked) {
          reloadChecked = true;
          const tileOf = (page: Page) =>
            page.locator(`[data-testid="king-token"][data-player="${playerId}"]`).locator("xpath=ancestor::*[@data-testid='board-tile']").getAttribute("data-tile");
          const tileBefore = await tileOf(active.page);
          const lineBefore = await activityText(active.page);
          await active.page.reload();
          await expect(active.page.getByText("end turn!")).toBeVisible();
          await expect(active.page).toHaveURL(/\/map$/);
          await expect(active.page.locator('.map[data-animating="false"]')).toHaveCount(1);
          await active.page.waitForTimeout(900);
          await expect(active.page.getByRole("dialog")).toHaveCount(0);
          expect(await tileOf(active.page)).toBe(tileBefore);
          expect(await activityText(active.page)).toBe(lineBefore);
        }

        // E1: end of turn needs a long press and a Yes; No keeps the turn.
        await holdButton(active.page, END_TURN_CROWN);
        await expect(active.page.getByRole("dialog", { name: "End of turn" })).toContainText("This action will be end turn");
        await active.page.getByRole("button", { name: "No" }).click();
        await expect(active.page.getByRole("dialog")).toHaveCount(0);
        await expect(active.page.getByText("end turn!")).toBeVisible();
        await holdButton(active.page, END_TURN_CROWN);
        await active.page.getByRole("button", { name: "Yes" }).click();

        // The turn passes on: the other crown shakes, this one is plain again.
        await expect(other.page.getByRole("button", { name: SHAKING_CROWN })).toBeVisible();
        await expect(active.page.getByText("end turn!")).toHaveCount(0);

        if (turn === 2) {
          for (const player of players) {
            await expect(player.page.getByText("Round 2")).toBeVisible();
          }
        }
      }

      // Turns alternate between the two players.
      for (let index = 1; index < turnOrder.length; index += 1) {
        expect(turnOrder[index], `turn order ${turnOrder.join(",")}`).not.toBe(turnOrder[index - 1]);
      }
      expect(turnOrder.length).toBeGreaterThanOrEqual(MIN_TURNS);
      expect(live.stations, "a king crossed Start and used the Start Station").toBeGreaterThan(0);
      expect(live.cards).toBeGreaterThan(0);
      console.log(`Played ${turnOrder.length} turns. Station visits ${live.stations}. Popups answered: ${[...live.answered].map(([name, count]) => `${name} x${count}`).join(", ")}`);
    } finally {
      for (const player of players) {
        await player.context.close();
      }
    }

    expect(errors).toEqual([]);
  });
});
