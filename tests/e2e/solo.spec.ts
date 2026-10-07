import { devices, expect, test } from "@playwright/test";
import { hasHorizontalOverflow, watchErrors } from "./helpers";
import { playMyTurn, startSoloGame, waitForMyTurn } from "./solo-helpers";

// The solo mode (play vs bots) in the dev app. It needs no game server: the match runs in the browser.
test.describe("solo mode", () => {
  test("plays a game against bots: countdown, my turn, bots move, reload keeps the game", async ({ browser }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    const context = await browser.newContext({ ...devices["Pixel 5"], viewport: { width: 320, height: 640 } });
    const page = await context.newPage();
    watchErrors(page, "solo", errors);

    try {
      // S1: Welcome offers the mode, and it opens the setup screen with the defaults.
      await page.goto("/");
      await page.getByRole("button", { name: "Play vs bots" }).click();
      await expect(page).toHaveURL(/\/solo$/);
      await expect(page.getByRole("group", { name: "Bots", exact: true }).getByRole("button", { name: "3", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("group", { name: "Bot style" }).getByRole("button", { name: "Mixed" })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("group", { name: "Bot speed" }).getByRole("button", { name: "Normal" })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("button", { name: "Start" })).toBeDisabled();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: "test-results/ui/screens/e2e-solo-setup.png" });

      // S2: Start shows the countdown, then the game shell with SOLO as the room code.
      await startSoloGame(page, "Aria");
      await expect(page).toHaveURL(/\/room\/SOLO/);
      await expect(page.locator(".ui-blocking-overlay")).toContainText("Game Starting");
      await expect(page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(".shell-top-bar__room")).toHaveText("SOLO");
      await expect(page.getByTestId("bot-control")).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);

      // S3, S4: bots take turns on their own until the human's crown shakes; the human plays a turn with the usual screens.
      await waitForMyTurn(page, 30_000);
      await page.screenshot({ path: "test-results/ui/screens/e2e-solo-game.png" });
      await playMyTurn(page);
      // The bots are playing now: the activity line follows them and the crown is plain.
      await expect(page.getByRole("button", { name: /hold to take your turn/ })).toHaveCount(0);
      await page.waitForTimeout(400);
      await page.screenshot({ path: "test-results/ui/screens/e2e-solo-bot-turn.png" });

      // The bots play their turns and it comes back to the human in a later round.
      await waitForMyTurn(page);
      await expect(page.getByText(/^Round [2-9]/)).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);

      // S5: the Bots control pauses the bots.
      await page.getByRole("button", { name: "Bots", exact: true }).click();
      await page.getByRole("button", { name: "Pause" }).click();
      await expect(page.getByRole("button", { name: "Bots paused" })).toBeVisible();
      await page.getByRole("button", { name: "Resume" }).click();
      await expect(page.getByRole("button", { name: "Bots", exact: true })).toBeVisible();

      // S7: a reload keeps the game (same round, my crown still shaking).
      const roundBefore = (await page.getByText(/^Round \d+/).innerText()).trim();
      await page.reload();
      await expect(page.getByText(roundBefore)).toBeVisible();
      await expect(page.locator(".shell-top-bar__room")).toHaveText("SOLO");
      await expect(page.getByRole("button", { name: /hold to take your turn/ })).toBeVisible();

      // S7: New game asks first, then returns to the setup with the settings kept.
      await page.getByRole("button", { name: "Bots", exact: true }).click();
      await page.getByRole("button", { name: "New game" }).click();
      await page.getByRole("button", { name: "No", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "New game" }).click();
      await page.getByRole("button", { name: "Yes", exact: true }).click();
      await expect(page).toHaveURL(/\/solo$/);
      await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Aria");
      await expect(page.getByRole("group", { name: "Bot speed" }).getByRole("button", { name: "Fast" })).toHaveAttribute("aria-pressed", "true");

      // With the game forgotten, the game URL goes back to the setup.
      await page.goto("/room/SOLO/map");
      await expect(page).toHaveURL(/\/solo$/);
    } finally {
      await context.close();
    }
    expect(errors).toEqual([]);
  });
});
