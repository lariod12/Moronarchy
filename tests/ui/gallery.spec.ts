import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const watchErrors = (page: Page, errors: string[] = []): string[] => {
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  return errors;
};

// Every page load leaves a few MB behind in the browser tab; after about 80 loads in one tab it stalls. Walks over the
// whole gallery therefore move to a fresh tab every FRESH_PAGE_EVERY entries (errors keep going into the same list).
const FRESH_PAGE_EVERY = 25;

const freshPage = async (page: Page, errors: string[], viewport?: { width: number; height: number }): Promise<Page> => {
  const next = await page.context().newPage();
  watchErrors(next, errors);
  if (viewport) {
    await next.setViewportSize(viewport);
  }
  await page.close();
  return next;
};

const getEntryHrefs = async (page: Page): Promise<string[]> => {
  await page.goto("/dev/gallery");
  const links = page.getByTestId("gallery-link");
  await expect(links.first()).toBeVisible();
  return links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
};

const hasHorizontalOverflow = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const element = document.scrollingElement ?? document.documentElement;
    return element.scrollWidth > element.clientWidth;
  });

// The gallery group "Fight": pages of the fight and its popups.
const FIGHT_ENTRY_IDS = [
  "fight-king-start",
  "fight-king-mid",
  "fight-waiting",
  "fight-garrison",
  "fight-plot",
  "fight-buffs",
  "fight-item-sheet",
  "fight-retreat-confirm",
  "fight-spectator",
  "fight-final-round",
  "fight-result-victory",
  "fight-result-defeat",
  "fight-result-destroyed",
  "fight-result-retreat",
  "dialog-fight-notice",
  "dialog-fight-notice-owner"
];

// The gallery group "Info": the in-game information pages.
const INFO_ENTRY_IDS = [
  "stats-me",
  "stats-other",
  "stats-eliminated",
  "plots-mine-table",
  "plots-all-table",
  "plots-grid",
  "plots-empty",
  "plot-detail-upgradable",
  "plot-detail-locked",
  "plot-upgrade-confirm",
  "residents-overview",
  "residents-warrior-table",
  "residents-farmer-grid",
  "resident-detail",
  "items-grid",
  "items-empty",
  "item-detail",
  "item-description",
  "item-choose-plot",
  "events-list",
  "events-empty",
  "map-positions"
];

// Every entry of the gallery group "Game" (plus the spectator shell), checked at phone width.
const GAME_ENTRY_IDS = [
  "map-start",
  "map-midgame",
  "map-rolling",
  "map-horse",
  "dialog-buy",
  "dialog-buy-destroyed",
  "dialog-visitor",
  "dialog-visitor-peace",
  "dialog-owner",
  "dialog-waiting",
  "dialog-lucky-die",
  "dialog-end-turn",
  "dialog-own-plot",
  "dialog-notice",
  "cards-pick",
  "cards-confirm",
  "cards-congrats",
  "station-plots",
  "station-residents",
  "station-shop",
  "station-confirm",
  "manage-plot",
  "activity-line",
  "shell-spectator",
  "dialog-visitor-attack",
  ...FIGHT_ENTRY_IDS,
  ...INFO_ENTRY_IDS
];

// The gallery group "End": the Lose and Win faces and the final Ranking.
const END_ENTRY_IDS = [
  "end-lose-midgame",
  "end-lose-final",
  "end-win",
  "end-ranking-host",
  "end-ranking-guest",
  "end-ranking-6-players",
  "end-spectator-hud"
];

const holdCrown = async (page: Page, name: RegExp, ms: number): Promise<void> => {
  const box = await page.getByRole("button", { name }).boundingBox();
  if (!box) {
    throw new Error("Crown button has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
};

test.describe("gallery", () => {
  test("index lists every entry without errors", async ({ page }) => {
    const errors = watchErrors(page);
    const hrefs = await getEntryHrefs(page);
    expect(hrefs.length).toBeGreaterThanOrEqual(20);
    expect(errors).toEqual([]);
  });

  test("every entry renders without errors or horizontal overflow", async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    const hrefs = await getEntryHrefs(page);
    let current = page;
    for (const [index, href] of hrefs.entries()) {
      if (index > 0 && index % FRESH_PAGE_EVERY === 0) {
        current = await freshPage(current, errors);
      }
      await current.goto(href);
      await expect(current.locator("[data-gallery-entry]"), href).toBeVisible();
      expect(await hasHorizontalOverflow(current), `overflow on ${href}`).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test("long-press entry separates tap from hold", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/long-press");
    const output = page.getByTestId("gallery-last-action");
    await page.getByRole("button", { name: "Long press demo" }).click();
    await expect(output).toHaveText("press");
    await holdCrown(page, /Long press demo/, 800);
    await expect(output).toHaveText("longPress");
    expect(errors).toEqual([]);
  });

  test("shaking crown logs a long press when held", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/shell-shaking");
    await holdCrown(page, /Crown: hold to take your turn/, 800);
    await expect(page.getByTestId("gallery-last-action")).toHaveText("longPress");
    expect(errors).toEqual([]);
  });

  test("confirm dialog logs the chosen action", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/dialog-confirm");
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("Yes");
    expect(errors).toEqual([]);
  });

  test("index has no horizontal overflow at 320px", async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    const narrow = { width: 320, height: 640 };
    await page.setViewportSize(narrow);
    await page.goto("/dev/gallery");
    await expect(page.getByTestId("gallery-link").first()).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    let current = page;
    let visited = 0;
    for (const id of [
      "shell-active",
      "shell-with-dialog",
      "data-table",
      "crown-states",
      "welcome-join",
      "welcome-error",
      "lobby-guest-ready",
      "lobby-host-can-start",
      "lobby-chat-open",
      "lobby-kick-dialog",
      "lobby-starting",
      "game-home",
      ...GAME_ENTRY_IDS
    ]) {
      visited += 1;
      if (visited % FRESH_PAGE_EVERY === 0) {
        current = await freshPage(current, errors, narrow);
      }
      await current.goto(`/dev/gallery/${id}`);
      await expect(current.locator("[data-gallery-entry]")).toBeVisible();
      expect(await hasHorizontalOverflow(current), `overflow on ${id} at 320px`).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test("welcome screen switches between Create and Join and shows its states", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/welcome-create");
    await expect(page.getByRole("button", { name: "Create" })).toBeEnabled();
    await page.goto("/dev/gallery/welcome-join");
    await expect(page.getByRole("button", { name: "Join", exact: true })).toBeEnabled();
    await page.goto("/dev/gallery/welcome-empty");
    await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
    await page.goto("/dev/gallery/welcome-error");
    await expect(page.getByRole("alert")).toHaveText("Room not found");
    await page.goto("/dev/gallery/welcome-busy");
    await expect(page.locator(".ui-blocking-overlay")).toHaveText("Waiting for creating room");
    expect(errors).toEqual([]);
  });

  test("lobby entries show seats, ready labels, host start gating and dialogs", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/lobby-host-waiting");
    await expect(page.getByTestId("seat-card")).toHaveCount(3);
    await expect(page.getByTestId("seat-empty")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Start" })).toBeDisabled();
    await page.goto("/dev/gallery/lobby-host-can-start");
    await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("start");
    await page.goto("/dev/gallery/lobby-guest-ready");
    await expect(page.getByRole("button", { name: "Ready" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".seat-card--offline")).toHaveCount(1);
    await expect(page.locator(".seat-card__bubble")).toHaveCount(2);
    await page.goto("/dev/gallery/lobby-chat-open");
    await expect(page.getByPlaceholder("Say something…")).toBeFocused();
    await page.getByPlaceholder("Say something…").fill("hello");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("gallery-last-action")).toHaveText("chat:hello");
    await page.goto("/dev/gallery/lobby-kick-dialog");
    await expect(page.getByRole("dialog", { name: "Kick Bob?" })).toBeVisible();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("kick:1");
    await page.goto("/dev/gallery/lobby-starting");
    await expect(page.locator(".ui-blocking-overlay")).toContainText("Game Starting");
    expect(errors).toEqual([]);
  });

  test("game home shows the hub with a shaking crown for the turn player", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/game-home");
    await expect(page.getByText("Round 1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crown: hold to take your turn" })).toBeVisible();
    await expect(page.locator(".ui-tile")).toHaveCount(6);
    // Every tile opens something now.
    for (const title of ["Stats", "Plots", "Dice Status", "Residents", "Items", "Events"]) {
      await expect(page.getByRole("button", { name: title })).toBeEnabled();
    }
    await page.getByRole("button", { name: "Residents" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("open:residents");
    expect(errors).toEqual([]);
  });

  test("every Game entry is listed in the gallery", async ({ page }) => {
    const hrefs = await getEntryHrefs(page);
    for (const id of GAME_ENTRY_IDS) {
      expect(hrefs, id).toContain(`/dev/gallery/${id}`);
    }
  });

  test("map shows 40 tiles with tile 01 in the top-right corner and a token per alive king", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/map-midgame");
    await expect(page.getByTestId("board-tile")).toHaveCount(40);
    const box = async (label: string) => {
      const found = await page.locator(`[data-testid="board-tile"][data-tile="${label}"]`).boundingBox();
      if (!found) {
        throw new Error(`tile ${label} has no box`);
      }
      return found;
    };
    const t01 = await box("01");
    const t11 = await box("11");
    const t21 = await box("21");
    const t31 = await box("31");
    expect(t01.x).toBeGreaterThan(t31.x + 100);
    expect(Math.abs(t01.y - t31.y)).toBeLessThan(2);
    expect(t11.y).toBeGreaterThan(t01.y + 100);
    expect(Math.abs(t11.x - t01.x)).toBeLessThan(2);
    expect(Math.abs(t21.y - t11.y)).toBeLessThan(2);
    expect(Math.abs(t21.x - t31.x)).toBeLessThan(2);
    await expect(page.locator(".board-tile--mine")).toHaveCount(3);
    await expect(page.getByTestId("king-token")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Tap to Roll" })).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test("station shows costs and disables what the engine would reject", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/station-plots");
    await expect(page.getByTestId("station-summary")).toContainText("Lap complete: +100 coin");
    await expect(page.getByTestId("station-plot-row")).toHaveCount(2);
    expect(await page.locator(".station__list button:disabled").count()).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "Continue moving" })).toBeEnabled();
    await page.getByRole("tab", { name: "Shop" }).click();
    await expect(page.getByRole("button", { name: /^Buy \d+$/ }).first()).toBeVisible();
    await page.goto("/dev/gallery/manage-plot");
    await expect(page.getByRole("tab", { name: "Shop" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("decision dialogs show their texts and actions", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/dialog-buy");
    await expect(page.getByRole("dialog", { name: "Plot 7" })).toContainText("Buy this plot for 60 coin?");
    await page.getByRole("button", { name: "Buy" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("Buy");
    await page.goto("/dev/gallery/dialog-buy-destroyed");
    await expect(page.getByRole("dialog")).toContainText("You broke Plot 7. Buy it now for 60 coin?");
    await expect(page.getByRole("button", { name: "Buy" })).toBeDisabled();
    await page.goto("/dev/gallery/dialog-visitor");
    await expect(page.getByRole("dialog")).toContainText("Pay 30 coin or attack?");
    await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
    await expect(page.getByText("Fights arrive in the next update")).toHaveCount(0);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("Attack");
    await page.goto("/dev/gallery/dialog-visitor-attack");
    await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
    await page.goto("/dev/gallery/dialog-visitor-peace");
    await expect(page.getByText("Peace Treaty: no attacks")).toBeVisible();
    await expect(page.getByRole("button", { name: "Attack" })).toBeDisabled();
    await page.goto("/dev/gallery/dialog-owner");
    await expect(page.getByRole("dialog")).toContainText("Alice stopped on your Plot 5. Collect 30 coin or attack?");
    await page.goto("/dev/gallery/dialog-waiting");
    await expect(page.getByRole("dialog")).toContainText("waiting for decision");
    await expect(page.getByRole("dialog").getByRole("button")).toHaveCount(0);
    await page.goto("/dev/gallery/dialog-lucky-die");
    await expect(page.getByRole("dialog", { name: "You rolled 3" })).toBeVisible();
    await page.goto("/dev/gallery/dialog-own-plot");
    await expect(page.getByRole("dialog", { name: "Your plot (Plot 5)" })).toBeVisible();
    await page.getByRole("button", { name: "Manage" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("Manage");
    expect(errors).toEqual([]);
  });

  test("upgrade card entries show three cards, the confirmation and the congratulation", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/cards-pick");
    await expect(page.getByTestId("upgrade-card")).toHaveCount(3);
    await page.goto("/dev/gallery/cards-confirm");
    await expect(page.getByRole("dialog", { name: "You have picked" })).toContainText("Are you sure?");
    await page.goto("/dev/gallery/cards-congrats");
    await expect(page.getByRole("dialog", { name: "Congratulation!" })).toContainText("You got");
    expect(errors).toEqual([]);
  });

  test("spectator shell shows Game Over and no crown", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/shell-spectator");
    await expect(page.getByText("Game Over")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Crown/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("every End entry is listed in the gallery", async ({ page }) => {
    const hrefs = await getEntryHrefs(page);
    for (const id of END_ENTRY_IDS) {
      expect(hrefs, id).toContain(`/dev/gallery/${id}`);
    }
    expect(hrefs).not.toContain("/dev/gallery/result-placeholder");
  });

  test("Lose face during play says you are out, in which round, and offers Keep watching and Leave room", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/end-lose-midgame");
    const face = page.getByTestId("lose-face");
    await expect(face).toBeVisible();
    await expect(face.getByRole("heading", { name: "You are out!" })).toBeVisible();
    await expect(face.getByText("Bankrupt in round 3")).toBeVisible();
    await expect(face.getByRole("button", { name: "Keep watching" })).toBeVisible();
    await expect(face.getByRole("button", { name: "Leave room" })).toBeVisible();
    await face.getByRole("button", { name: "Keep watching" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("keepWatching");
    expect(errors).toEqual([]);
  });

  test("Lose face at the finish continues to the ranking", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/end-lose-final");
    await expect(page.getByRole("heading", { name: "You are out!" })).toBeVisible();
    await expect(page.getByText("Bankrupt in round 2")).toBeVisible();
    await page.getByRole("button", { name: "See ranking" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("seeRanking");
    expect(errors).toEqual([]);
  });

  test("Win face celebrates the last king standing", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/end-win");
    await expect(page.getByRole("heading", { name: "You win!" })).toBeVisible();
    await expect(page.getByText("Last king standing")).toBeVisible();
    await page.getByRole("button", { name: "See ranking" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("seeRanking");
    expect(errors).toEqual([]);
  });

  test("ranking lists the kings in order and gates Play Again on the host", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/end-ranking-host");
    await expect(page.locator(".result-ranking__name")).toHaveText(["Alice (you)", "Bob", "Cara"]);
    await expect(page.locator(".result-ranking__status")).toHaveText(["Winner", "Out in round 2", "Out in round 1"]);
    const playAgain = page.getByRole("button", { name: "Play Again" });
    const quit = page.getByRole("button", { name: "Quit" });
    await expect(playAgain).toBeEnabled();
    const [playBox, quitBox] = [await playAgain.boundingBox(), await quit.boundingBox()];
    expect(Math.abs((playBox?.y ?? 0) - (quitBox?.y ?? 99))).toBeLessThan(2); // side by side
    await playAgain.click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("playAgain");
    await expect(page.getByText("Waiting for the host to start again")).toHaveCount(0);

    await page.goto("/dev/gallery/end-ranking-guest");
    await expect(page.locator(".result-ranking__name")).toHaveText(["Alice", "Bob (you)", "Cara"]);
    await expect(page.getByRole("button", { name: "Play Again" })).toBeDisabled();
    await expect(page.getByText("Waiting for the host to start again")).toBeVisible();
    await page.getByRole("button", { name: "Quit" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("quit");

    await page.goto("/dev/gallery/end-ranking-6-players");
    await expect(page.locator(".result-ranking__name")).toHaveText(["Alice", "Bob", "Cara (you)", "Dan", "Eve", "Finn"]);
    expect(errors).toEqual([]);
  });

  test("spectator HUD is crossed out and shows Game Over instead of Back and Crown", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/end-spectator-hud");
    await expect(page.getByText("Game Over")).toBeVisible();
    await expect(page.locator(".ui-avatar--crossed")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Crown/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
    await page.getByRole("button", { name: /^Game Over/ }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("press");
    expect(errors).toEqual([]);
  });

  test("end entries have no horizontal overflow at 320px", async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 320, height: 640 });
    for (const id of END_ENTRY_IDS) {
      await page.goto(`/dev/gallery/${id}`);
      await expect(page.locator("[data-gallery-entry]")).toBeVisible();
      expect(await hasHorizontalOverflow(page), `overflow on ${id} at 320px`).toBe(false);
    }
    // The six-player ranking still shows both buttons inside the frame.
    await page.goto("/dev/gallery/end-ranking-6-players");
    for (const name of ["Play Again", "Quit"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.x, name).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, name).toBeLessThanOrEqual(320);
      expect(box!.y + box!.height, name).toBeLessThanOrEqual(640);
    }
    expect(errors).toEqual([]);
  });

  test("fight at 1-1 shows two health bars, round markers, dice scores and the damage", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/fight-king-mid");
    await expect(page.getByText("Fight", { exact: true })).toBeVisible();
    await expect(page.getByRole("meter")).toHaveCount(2);
    await expect(page.getByTestId("fight-panel")).toHaveCount(2);
    await expect(page.getByTestId("round-marker")).toHaveCount(4);
    await expect(page.locator('[data-testid="round-marker"][data-result="won"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="round-marker"][data-result="lost"]')).toHaveCount(2);
    await expect(page.getByTestId("fight-score")).toHaveText(["2 + 5 = 7", "6 + 5 = 11"]);
    await expect(page.getByTestId("fight-damage")).toHaveText("-8");
    await expect(page.getByRole("button", { name: "Roll" })).toBeEnabled();
    await page.getByRole("button", { name: "Roll" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("roll");
    expect(errors).toEqual([]);
  });

  test("fight states: waiting, garrison, plot, buffs and spectator", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/fight-waiting");
    await expect(page.getByTestId("fight-status")).toHaveText("Waiting for Alice to roll…");
    await expect(page.getByRole("button", { name: "Roll" })).toHaveCount(0);
    await page.goto("/dev/gallery/fight-garrison");
    await expect(page.getByText("Residents ×1", { exact: true })).toBeVisible();
    await page.goto("/dev/gallery/fight-plot");
    await expect(page.getByText("Plot 5 · Lv 2", { exact: true })).toBeVisible();
    await expect(page.getByTestId("fight-damage")).toHaveText("Blocked");
    await page.goto("/dev/gallery/fight-buffs");
    await expect(page.getByText("ATK +3")).toHaveCount(2);
    await expect(page.getByText("DEF +3")).toHaveCount(1);
    await page.goto("/dev/gallery/fight-final-round");
    // The deciding round stays on screen: both score lines, the winner, no buttons, empty garrison pool.
    await expect(page.getByTestId("fight-score")).toHaveText(["6 + 5 = 11", "1 + 4 = 5"]);
    await expect(page.getByTestId("fight-status")).toHaveText("You win the fight");
    await expect(page.locator('[data-testid="fight-panel"][data-winner="true"]')).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^(Roll|Use item|Retreat)$/ })).toHaveCount(0);
    await expect(page.getByTestId("round-marker")).toHaveCount(4);
    await page.goto("/dev/gallery/fight-spectator");
    await expect(page.getByRole("button", { name: /^(Roll|Use item|Retreat)$/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("fight popups: items, retreat, results and notices", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/fight-item-sheet");
    await expect(page.getByRole("dialog", { name: "Use item" })).toBeVisible();
    await expect(page.getByTestId("item-sheet-row")).toHaveCount(3);
    await page.getByRole("button", { name: "Use War Horn" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("use:warHorn");
    await page.goto("/dev/gallery/fight-retreat-confirm");
    await expect(page.getByRole("dialog", { name: "Retreat" })).toContainText(/Retreat counts as a loss\. You will pay \d+ coin\./);
    await page.goto("/dev/gallery/fight-result-victory");
    await expect(page.getByRole("dialog", { name: "Victory!" })).toContainText("Winner: You");
    await page.goto("/dev/gallery/fight-result-defeat");
    await expect(page.getByRole("dialog", { name: "Defeat" })).toContainText("You paid");
    await page.goto("/dev/gallery/fight-result-destroyed");
    await expect(page.getByRole("dialog", { name: "Victory!" })).toContainText("Plot 5 was destroyed");
    await page.goto("/dev/gallery/fight-result-retreat");
    await expect(page.getByRole("dialog", { name: "Defeat" })).toContainText("You retreated");
    await page.goto("/dev/gallery/dialog-fight-notice");
    await expect(page.getByRole("dialog")).toContainText("Alice is attacking Plot 5 (Bob)");
    await page.getByRole("button", { name: "Watch" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("Watch");
    await page.goto("/dev/gallery/dialog-fight-notice-owner");
    await expect(page.getByRole("dialog")).toContainText("Alice is attacking your Plot 5!");
    expect(errors).toEqual([]);
  });

  test("fight entries have no horizontal overflow at 320px", async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 320, height: 640 });
    for (const id of FIGHT_ENTRY_IDS) {
      await page.goto(`/dev/gallery/${id}`);
      await expect(page.locator("[data-gallery-entry]")).toBeVisible();
      expect(await hasHorizontalOverflow(page), `overflow on ${id} at 320px`).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test("every Info entry is listed in the gallery", async ({ page }) => {
    const hrefs = await getEntryHrefs(page);
    for (const id of INFO_ENTRY_IDS) {
      expect(hrefs, id).toContain(`/dev/gallery/${id}`);
    }
  });

  test("stats show every stat, the equipment bonus and cycle through the kings", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/stats-other");
    await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();
    for (const label of ["Level", "Coin", "Health", "Max Health", "Attack", "Defense", "Lucky", "Laps", "Plots"]) {
      await expect(page.getByText(new RegExp(`^${label}: `))).toBeVisible();
    }
    await expect(page.getByText(/^Attack: \d+ \(\+2\)$/)).toBeVisible();
    await page.getByRole("button", { name: "Next king" }).click();
    await expect(page.getByRole("heading", { name: "Cara" })).toBeVisible();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("stats:2");
    await page.getByRole("button", { name: "Previous king" }).click();
    await page.getByRole("button", { name: "Previous king" }).click();
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    await page.goto("/dev/gallery/stats-eliminated");
    await expect(page.getByRole("heading", { name: "Cara" })).toBeVisible();
    await expect(page.locator(".ui-avatar--crossed")).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test("plots list mine, all with an Owner column, a grid and an empty state", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/plots-mine-table");
    await expect(page.getByRole("columnheader")).toHaveText(["Plots", "Level", "Income", "Price"]);
    await expect(page.locator("tbody tr:not(.ui-data-table__action-row)")).toHaveCount(3);
    await page.getByRole("tab", { name: "All" }).click();
    await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();
    await expect(page.locator("tbody tr:not(.ui-data-table__action-row)")).toHaveCount(39);
    await page.goto("/dev/gallery/plots-all-table");
    await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();
    await expect(page.locator("tbody tr:not(.ui-data-table__action-row)")).toHaveCount(39);
    await page.getByRole("button", { name: "details" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("plot:2");
    await page.getByRole("button", { name: "View All" }).click();
    await expect(page.getByTestId("plots-grid").getByRole("button")).toHaveCount(39);
    await page.goto("/dev/gallery/plots-grid");
    await expect(page.getByTestId("plots-grid").getByRole("button")).toHaveCount(3);
    await expect(page.getByTestId("plots-grid")).toContainText("Level: 2");
    await page.goto("/dev/gallery/plots-empty");
    await expect(page.getByText("You own no plots yet")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("plot detail gates Upgrade on the engine and asks before spending", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/plot-detail-upgradable");
    await expect(page.getByRole("button", { name: /^Upgrade \d+$/ })).toBeEnabled();
    await expect(page.getByTestId("upgrade-hint")).toHaveCount(0);
    await page.goto("/dev/gallery/plot-detail-locked");
    await expect(page.getByRole("button", { name: /^Upgrade \d+$/ })).toBeDisabled();
    await expect(page.getByTestId("upgrade-hint")).toHaveText("Upgrade at the Start station or while standing on this plot");
    await expect(page.getByText(/^Health: \d+\/\d+$/)).toBeVisible();
    await page.goto("/dev/gallery/plot-upgrade-confirm");
    await expect(page.getByRole("dialog", { name: "Upgrade" })).toContainText("Spend");
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("action:upgradePlot");
    expect(errors).toEqual([]);
  });

  test("residents: overview counts, warrior table, farmer grid and detail", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/residents-overview");
    await expect(page.getByRole("button", { name: /Warrior/ })).toContainText("x3");
    await expect(page.getByRole("button", { name: /Farmer/ })).toContainText("x2");
    await page.goto("/dev/gallery/residents-warrior-table");
    await expect(page.getByRole("columnheader")).toHaveText(["Name", "Level", "Plots", "Plots LV"]);
    await page.getByRole("button", { name: "View All" }).click();
    await expect(page.getByTestId("residents-grid").getByRole("button")).toHaveCount(3);
    await page.goto("/dev/gallery/residents-farmer-grid");
    await expect(page.getByTestId("residents-grid").getByRole("button").first()).toContainText("Name: 02");
    await page.goto("/dev/gallery/resident-detail");
    for (const label of ["Name", "Level", "Attack", "Defense", "Health", "Plot"]) {
      await expect(page.getByText(new RegExp(`^${label}: `))).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /^Upgrade/ })).toBeDisabled();
    expect(errors).toEqual([]);
  });

  test("items: grid with counts, detail, description popup and plot choice", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/items-grid");
    await expect(page.getByTestId("items-grid").getByRole("button")).toHaveCount(6);
    await expect(page.getByTestId("items-grid")).toContainText("Equipped");
    await page.goto("/dev/gallery/items-empty");
    await expect(page.getByText("You have no items yet")).toBeVisible();
    await page.goto("/dev/gallery/item-detail");
    await expect(page.getByTestId("item-summary")).toContainText("+3");
    await page.getByRole("button", { name: "View Details" }).click();
    await expect(page.getByRole("dialog", { name: "Description" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto("/dev/gallery/item-description");
    await expect(page.getByRole("dialog", { name: "Description" })).toContainText("before you roll");
    await page.goto("/dev/gallery/item-choose-plot");
    await expect(page.getByRole("dialog", { name: "Choose a plot" })).toBeVisible();
    await page.getByRole("button", { name: "Use on Plot 12" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("use:sickle:12");
    expect(errors).toEqual([]);
  });

  test("events pin the active global event and tag who it concerns", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/events-list");
    const cards = page.getByTestId("event-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText("Active · 2 rounds left");
    await expect(cards.nth(1)).toContainText("Bob");
    await expect(cards.nth(2)).toContainText("You");
    await expect(cards.nth(2)).toContainText("Instant");
    await page.goto("/dev/gallery/events-empty");
    await expect(page.getByText("No events yet")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("map positions list every king in turn order and grey out the eliminated one", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/map-positions");
    await expect(page.getByRole("tab", { name: "Positions" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("columnheader")).toHaveText(["Turn", "Player", "Position", "Laps"]);
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("Alice");
    await expect(rows.nth(1)).toContainText("Bob");
    await expect(rows.nth(2)).toContainText("Cara");
    await expect(rows.nth(3)).toContainText("Dan");
    await expect(rows.nth(0)).toHaveClass(/positions-row--current/);
    await expect(rows.nth(2)).toHaveClass(/positions-row--out/);
    expect(errors).toEqual([]);
  });

  test("info entries have no horizontal overflow at 320px", async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 320, height: 640 });
    for (const id of INFO_ENTRY_IDS) {
      await page.goto(`/dev/gallery/${id}`);
      await expect(page.locator("[data-gallery-entry]")).toBeVisible();
      expect(await hasHorizontalOverflow(page), `overflow on ${id} at 320px`).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test("saves reference screenshots", async ({ page }) => {
    for (const id of [
      "shell-active",
      "shell-with-dialog",
      "data-table",
      "welcome-join",
      "lobby-guest-ready",
      "lobby-host-can-start",
      "game-home",
      "map-midgame",
      "dialog-visitor",
      "cards-pick",
      "station-plots",
      "fight-king-mid",
      "fight-garrison",
      "fight-final-round",
      "fight-result-victory",
      "dialog-fight-notice",
      "stats-other",
      "plots-mine-table",
      "plot-detail-locked",
      "residents-overview",
      "item-detail",
      "events-list",
      "map-positions",
      ...END_ENTRY_IDS
    ]) {
      await page.goto(`/dev/gallery/${id}`);
      await expect(page.locator("[data-gallery-entry]")).toBeVisible();
      await page.screenshot({ path: `test-results/ui/screens/${id}.png` });
    }
  });
  test("crown speech bubble is not clipped at 320px", async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 320, height: 640 });
    for (const id of ["shell-active", "shell-can-end"]) {
      await page.goto(`/dev/gallery/${id}`);
      const bubble = page.locator(".shell-crown__bubble");
      await expect(bubble).toBeVisible();
      const box = await bubble.boundingBox();
      expect(box, id).not.toBeNull();
      expect(box!.x, id).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, id).toBeLessThanOrEqual(320);
      expect(await bubble.evaluate((element) => element.scrollWidth <= element.clientWidth), id).toBe(true);
    }
    expect(errors).toEqual([]);
  });
});
