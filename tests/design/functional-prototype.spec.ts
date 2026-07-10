import { expect, test, type Page } from "@playwright/test";

const captureBrowserErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
};

const expectNoBrowserErrors = (errors: string[]) => {
  expect(errors, "prototype must not emit console or page errors").toEqual([]);
};

test("prototype hub exposes every current design frame", async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/index.html");

  await expect(page).toHaveTitle("Moronarchy Design Prototype Hub");
  await expect(page.locator('a[href="01-welcome-create-join.html"]')).toHaveCount(2);
  await expect(page.locator('a[href="02-room-lobby.html"]')).toHaveCount(1);
  await expect(page.locator('a[href="03-ingame-main-board.html"]')).toHaveCount(1);
  expectNoBrowserErrors(errors);
});

test("welcome frame switches between create and join through real input interactions", async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/01-welcome-create-join.html");

  const nameInput = page.getByLabel("Name");
  const roomInput = page.getByLabel("Join room");
  const primaryAction = page.locator('[data-action="submit-room-flow"]');

  await expect(primaryAction).toBeDisabled();
  await expect(primaryAction).toHaveText("Create");

  await nameInput.fill("Alice");
  await expect(page.locator('[data-bind="player-name-preview"]')).toHaveText("Alice");
  await expect(primaryAction).toBeEnabled();
  await expect(primaryAction).toHaveText("Create");

  await roomInput.fill("r777");
  await expect(primaryAction).toHaveText("Join");
  await primaryAction.click();

  await expect(page).toHaveURL(/02-room-lobby\.html\?flow=join&player=Alice&room=R777$/);
  expectNoBrowserErrors(errors);
});

test("lobby frame supports chat, ready, and start interactions", async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/02-room-lobby.html?flow=create&player=Alice&room=R777");

  await expect(page.locator('[data-bind="room-code"]')).toHaveText("R777");
  await page.locator('[data-action="chat-or-cancel"]').click();
  await expect(page.locator('[data-modal="chat-modal"]')).toBeVisible();
  await page.locator('[data-bind="chat-input"]').fill("Ready to play");
  await page.locator('[data-action="send-chat-form"] button[type="submit"]').click();
  await expect(page.locator('[data-bind="chat-lines"]')).toContainText("Player 1: Ready to play");

  const readyAction = page.locator('[data-action="toggle-ready"]');
  await readyAction.click();
  await expect(readyAction).toHaveText("Start");
  await expect(readyAction).toBeEnabled();
  await readyAction.click();
  await expect(page.locator('[data-modal="start-modal"]')).toBeVisible();
  expectNoBrowserErrors(errors);
});

test.describe("main-board interaction contract", () => {
  const openMainBoard = async (page: Page) => {
    await page.goto("/03-ingame-main-board.html?player=1");
    await expect(page.locator(".tile")).toHaveCount(40);
  };

  test("renders the concept UI without removed device controls", async ({ page }) => {
    const errors = captureBrowserErrors(page);
    await openMainBoard(page);

    await expect(page.locator(".connection-strip")).toHaveCount(0);
    await expect(page.locator("[data-player-seat]")).toHaveCount(0);
    await expect(page.locator('[data-modal="debug-modal"]')).toBeVisible();
    expectNoBrowserErrors(errors);
  });

  test("cannot-buy scenario opens a disabled purchase decision", async ({ page }) => {
    const errors = captureBrowserErrors(page);
    await openMainBoard(page);

    await page.locator('[data-debug-scenario="cannot-buy"]').click();
    await expect(page.locator('[data-debug-scenario="cannot-buy"]')).toHaveAttribute("aria-pressed", "true");
    await page.locator('[data-debug-action="auto-play"]').click();

    await expect(page.locator('[data-modal="land-purchase-modal"]')).toBeVisible();
    await expect(page.locator('[data-action="buy-land"]')).toBeDisabled();
    await expect(page.locator('[data-action="skip-tile-action"]')).toBeEnabled();
    expectNoBrowserErrors(errors);
  });

  test("player-count controls reset autoplay with the selected 2–4 player roster", async ({ page }) => {
    const errors = captureBrowserErrors(page);
    await openMainBoard(page);

    for (const playerCount of [2, 3, 4]) {
      const playerCountButton = page.locator(`[data-debug-player-count="${playerCount}"]`);
      await playerCountButton.click();
      await expect(playerCountButton).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator('[data-bind="auto-play-player-count"]')).toHaveText(String(playerCount));
      await expect(page.locator(".king-token")).toHaveCount(playerCount);
      await expect.poll(() => page.evaluate("frameState.players.length")).toBe(playerCount);
      await expect.poll(() => page.evaluate(
        "frameState.tiles.every((tile) => tile.ownerId === null || tile.ownerId <= frameState.players.length)"
      )).toBe(true);
    }

    const initialTurn = await page.locator('[data-bind="turn-label"]').textContent();
    await page.locator('[data-debug-action="auto-play"]').click();
    await expect(page.locator('[data-bind="auto-play-status"]')).toHaveText("Running");
    await expect.poll(() => page.locator('[data-bind="turn-label"]').textContent(), { timeout: 10_000 }).not.toBe(initialTurn);

    await page.evaluate("openDebugModal()");
    await page.locator('[data-debug-action="auto-pause"]').click();
    await expect(page.locator('[data-bind="auto-play-status"]')).toHaveText("Paused");
    expectNoBrowserErrors(errors);
  });

  test("rival-land scenario keeps the turn caret black", async ({ page }) => {
    const errors = captureBrowserErrors(page);
    await openMainBoard(page);

    await page.locator('[data-debug-scenario="rival-land"]').click();
    await page.evaluate(() => {
      const prototypeWindow = window as typeof window & {
        applySelectedDebugScenario: () => void;
      };
      prototypeWindow.applySelectedDebugScenario();
    });

    const turnCaret = page.locator(".turn-token-caret");
    await expect(turnCaret).toBeVisible();
    await expect(turnCaret).toHaveCSS("border-top-color", "rgb(5, 5, 5)");
    await expect(turnCaret.locator("xpath=ancestor::*[contains(@class, 'tile')][1]")).toHaveClass(/is-owned-rival/);
    expectNoBrowserErrors(errors);
  });

  test("manual turn action rolls the dice and exposes visible feedback", async ({ page }) => {
    const errors = captureBrowserErrors(page);
    await openMainBoard(page);

    await page.locator('[data-modal-close="debug-modal"]').click();
    const startTurnAction = page.locator('[data-action="start-active-turn"]');
    if (await startTurnAction.isVisible()) await startTurnAction.click();

    const rollAction = page.locator('[data-action="simulate-main-board-turn"]');
    await expect(rollAction).toBeEnabled();
    await rollAction.click();
    await expect(page.locator(".speech-bubble")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-bind="roll-result"]')).not.toHaveText("");
    expectNoBrowserErrors(errors);
  });
});
