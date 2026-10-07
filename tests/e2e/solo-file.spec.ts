import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { devices, expect, test } from "@playwright/test";
import { hasHorizontalOverflow, watchErrors } from "./helpers";
import { playMyTurn, startSoloGame, waitForMyTurn } from "./solo-helpers";

// The single-file build opened from disk. Run `pnpm build:solo` first: the file is the build output, and this spec
// skips (with the reason) when it has not been built.
const SOLO_FILE = resolve("apps/web/dist-solo/moronarchy-solo.html");

test.describe("solo single file", () => {
  test.skip(!existsSync(SOLO_FILE), `Build ${SOLO_FILE} first with "pnpm build:solo".`);

  test("opens from file://, plays against bots and makes no network requests", async ({ browser }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    const context = await browser.newContext({ ...devices["Pixel 5"], baseURL: undefined });
    const page = await context.newPage();
    watchErrors(page, "file", errors);
    const fileUrl = pathToFileURL(SOLO_FILE).href;
    const outside: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith("data:") && !url.startsWith("blob:") && url !== fileUrl && !url.startsWith(`${fileUrl}#`)) {
        outside.push(url);
      }
    });

    try {
      // S8: it opens straight into the solo setup.
      await page.goto(fileUrl);
      await expect(page.getByRole("heading", { name: "Play vs bots" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
      await page.screenshot({ path: "test-results/ui/screens/solo-file-setup.png" });

      await startSoloGame(page, "Aria");
      await expect(page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(".shell-top-bar__room")).toHaveText("SOLO");
      expect(await hasHorizontalOverflow(page)).toBe(false);

      await waitForMyTurn(page, 30_000);
      await page.screenshot({ path: "test-results/ui/screens/solo-file.png" });
      await playMyTurn(page);
      await waitForMyTurn(page);
      await expect(page.getByText(/^Round [2-9]/)).toBeVisible();

      // The game survives a reload from disk too.
      await page.reload();
      await expect(page.getByText(/^Round [2-9]/)).toBeVisible();
    } finally {
      await context.close();
    }
    console.log(`single file ${SOLO_FILE}: ${statSync(SOLO_FILE).size} bytes`);
    expect(outside, `requests outside the file: ${outside.join(", ")}`).toEqual([]);
    expect(errors).toEqual([]);
  });
});
