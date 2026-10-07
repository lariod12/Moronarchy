import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const watchErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  return errors;
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
  "result-placeholder",
  "shell-spectator"
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
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    const hrefs = await getEntryHrefs(page);
    for (const href of hrefs) {
      await page.goto(href);
      await expect(page.locator("[data-gallery-entry]"), href).toBeVisible();
      expect(await hasHorizontalOverflow(page), `overflow on ${href}`).toBe(false);
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
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/dev/gallery");
    await expect(page.getByTestId("gallery-link").first()).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
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
      await page.goto(`/dev/gallery/${id}`);
      await expect(page.locator("[data-gallery-entry]")).toBeVisible();
      expect(await hasHorizontalOverflow(page), `overflow on ${id} at 320px`).toBe(false);
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
    await expect(page.getByRole("button", { name: "Attack" })).toBeDisabled();
    await expect(page.getByText("Fights arrive in the next update")).toBeVisible();
    await page.goto("/dev/gallery/dialog-visitor-peace");
    await expect(page.getByText("Peace Treaty: no attacks")).toBeVisible();
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

  test("result placeholder lists the ranking with host actions", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/result-placeholder");
    await expect(page.getByRole("heading", { name: "Game over" })).toBeVisible();
    await expect(page.getByText("Winner: Alice")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveText(["1. Alice", "2. Bob", "3. Cara"]);
    await expect(page.getByRole("button", { name: "Back to lobby" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("spectator shell shows Game Over and no crown", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/shell-spectator");
    await expect(page.getByText("Game Over")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Crown/ })).toHaveCount(0);
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
      "result-placeholder"
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
