import { expect, test } from "@playwright/test";

test("creates a room, joins from a second player, and enters the game", async ({ browser, page }) => {
  await expect
    .poll(async () => {
      try {
        const response = await page.request.get("http://127.0.0.1:8000/games");
        return response.status();
      } catch {
        return 0;
      }
    })
    .toBe(200);

  await page.goto("/");
  await page.getByLabel("King name").fill("Alice");
  await page.getByRole("button", { name: /create room/i }).click();

  await expect(page.getByText("Waiting room")).toBeVisible();
  await expect(page.getByText("Waiting for other player")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Waiting\.\.\.$/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Ready$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /copy room code/i })).toBeVisible();
  await page.getByRole("button", { name: /copy room code/i }).click();
  await expect(page.getByRole("button", { name: /copy room code/i })).toHaveText("Copied");
  await page.getByRole("button", { name: /^Chat$/ }).click();
  await expect(page.getByLabel("Chat message")).toHaveValue("");
  await expect(page.getByLabel("Chat message")).toHaveAttribute("placeholder", "Do something ..");
  await page.getByRole("button", { name: /^Close$/ }).click();
  const roomCode = (await page.locator(".room-code-box strong").innerText()).trim();
  expect(roomCode.length).toBeGreaterThan(0);

  const secondContext = await browser.newContext({
    viewport: { width: 393, height: 851 },
    isMobile: true,
    hasTouch: true
  });
  const secondPage = await secondContext.newPage();

  await secondPage.goto("/");
  await secondPage.getByLabel("King name").fill("Bob");
  await secondPage.getByLabel("Room code").fill(roomCode);
  await secondPage.getByRole("button", { name: /join room/i }).click();
  await expect(secondPage.getByText("Waiting room")).toBeVisible();

  await page.waitForTimeout(3000);
  await secondPage.waitForTimeout(3000);
  await expect(page.locator(".lobby-player-card")).toHaveCount(2);
  await expect(page.getByText("Waiting for other player")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Waiting\.\.\.$/ })).toBeDisabled();
  await expect(secondPage.getByRole("button", { name: /^Ready$/ })).toBeEnabled();

  await page.getByRole("button", { name: /^Chat$/ }).click();
  await page.getByLabel("Chat message").fill("hello table");
  await page.getByRole("button", { name: /^Send$/ }).click();
  await expect(page.getByText("Player 1: hello table")).toBeVisible();
  await expect(secondPage.getByText("Player 1: hello table")).toBeVisible();
  await expect(page.locator('[data-player-slot="1"] .speech-text')).toHaveText("hello table");
  await expect(secondPage.locator('[data-player-slot="1"] .speech-text')).toHaveText("hello table");

  await secondPage.getByRole("button", { name: /^Chat$/ }).click();
  await secondPage.getByLabel("Chat message").fill("ready friend");
  await secondPage.getByRole("button", { name: /^Send$/ }).click();
  await expect(page.getByText("Player 2: ready friend")).toBeVisible();
  await expect(secondPage.getByText("Player 2: ready friend")).toBeVisible();
  await expect(page.locator('[data-player-slot="2"] .speech-text')).toHaveText("ready friend");
  await expect(secondPage.locator('[data-player-slot="2"] .speech-text')).toHaveText("ready friend");
  await expect(page.locator('[data-player-slot="1"] .speech-text')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('[data-player-slot="2"] .speech-text')).toHaveCount(0, { timeout: 5000 });
  await expect(secondPage.locator('[data-player-slot="1"] .speech-text')).toHaveCount(0, { timeout: 5000 });
  await expect(secondPage.locator('[data-player-slot="2"] .speech-text')).toHaveCount(0, { timeout: 5000 });

  await secondPage.getByRole("button", { name: /^Ready$/ }).click();
  await expect(secondPage.getByRole("button", { name: /^Waiting$/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Start$/ })).toBeEnabled();

  const thirdContext = await browser.newContext({
    viewport: { width: 393, height: 851 },
    isMobile: true,
    hasTouch: true
  });
  const thirdPage = await thirdContext.newPage();
  await thirdPage.goto("/");
  await thirdPage.getByLabel("King name").fill("Cora");
  await thirdPage.getByLabel("Room code").fill(roomCode);
  await thirdPage.getByRole("button", { name: /join room/i }).click();
  await expect(thirdPage.getByText("Waiting room")).toBeVisible();

  await page.waitForTimeout(3000);
  await expect(page.locator(".lobby-player-card")).toHaveCount(3);
  await expect(page.getByText("Waiting for other player")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Waiting\.\.\.$/ })).toBeDisabled();

  const fourthContext = await browser.newContext({
    viewport: { width: 393, height: 851 },
    isMobile: true,
    hasTouch: true
  });
  const fourthPage = await fourthContext.newPage();
  await fourthPage.goto("/");
  await fourthPage.getByLabel("King name").fill("Dane");
  await fourthPage.getByLabel("Room code").fill(roomCode);
  await fourthPage.getByRole("button", { name: /join room/i }).click();
  await expect(fourthPage.getByText("Waiting room")).toBeVisible();

  await page.waitForTimeout(3000);
  await expect(page.locator(".lobby-player-card")).toHaveCount(4);
  await expect(page.getByText("Waiting for other player")).toHaveCount(0);

  await thirdPage.getByRole("button", { name: /^Ready$/ }).click();
  await expect(page.getByRole("button", { name: /^Waiting\.\.\.$/ })).toBeDisabled();
  await fourthPage.getByRole("button", { name: /^Ready$/ }).click();
  await page.getByRole("button", { name: /^Start$/ }).click();
  await expect(page.getByText("Game Starting")).toBeVisible();
  await expect(secondPage.getByText("Game Starting")).toBeVisible();
  await expect(thirdPage.getByText("Game Starting")).toBeVisible();
  await expect(fourthPage.getByText("Game Starting")).toBeVisible();

  await expect(page.locator(".board-grid")).toBeVisible();
  await expect(secondPage.locator(".board-grid")).toBeVisible();

  await page.getByRole("button", { name: /tap to scroll/i }).click();
  await expect(page.locator(".speech-bubble .speech-text")).toBeVisible();

  let rateLimited = false;
  for (let requestCount = 0; requestCount < 130; requestCount += 1) {
    const response = await page.request.get("http://127.0.0.1:8000/games");
    if (response.status() === 429) {
      rateLimited = true;
      break;
    }
  }
  expect(rateLimited).toBe(true);

  await secondContext.close();
  await thirdContext.close();
  await fourthContext.close();
});
