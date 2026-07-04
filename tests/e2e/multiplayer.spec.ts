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

  await page.getByRole("button", { name: /enter game/i }).click();
  await secondPage.getByRole("button", { name: /enter game/i }).click();

  await expect(page.getByText("40 tiles kingdom loop")).toBeVisible();
  await expect(secondPage.getByText("40 tiles kingdom loop")).toBeVisible();

  await page.getByRole("button", { name: /roll/i }).click();
  await expect(page.locator(".dice-face")).not.toHaveText("?");

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
});
