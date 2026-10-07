import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { END_TURN_CROWN, SHAKING_CROWN, answerDialog, answerPage, holdButton, resolveUntilSettled } from "./helpers";

// Fills the solo setup with 2 Fast bots and presses Start.
export const startSoloGame = async (page: Page, name: string): Promise<void> => {
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("group", { name: "Bots", exact: true }).getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("group", { name: "Bot speed" }).getByRole("button", { name: "Fast" }).click();
  await page.getByRole("button", { name: "Start" }).click();
};

// Waits until the human's crown shakes, answering the popups the bots cause meanwhile (a bot stepping on the human's plot).
export const waitForMyTurn = async (page: Page, timeoutMs = 60_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await page.getByRole("button", { name: SHAKING_CROWN }).count()) === 1) {
      return;
    }
    for (const face of ["lose-face", "win-face", "ranking"]) {
      if ((await page.getByTestId(face).count()) > 0) {
        throw new Error("The solo game ended early, so the turn loop cannot continue");
      }
    }
    if (!(await answerDialog(page)) && !(await answerPage(page))) {
      await page.waitForTimeout(100);
    }
  }
  throw new Error(`The crown never shook for the human. URL ${page.url()}`);
};

// Plays the human's whole turn: claim, roll, resolve the popups and pages, end the turn.
export const playMyTurn = async (page: Page): Promise<void> => {
  await waitForMyTurn(page);
  await holdButton(page, SHAKING_CROWN);
  await expect(page.getByRole("button", { name: "Tap to Roll" })).toBeEnabled();
  await page.getByRole("button", { name: "Tap to Roll" }).click();
  await resolveUntilSettled(page, page);
  await holdButton(page, END_TURN_CROWN);
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText("end turn!")).toHaveCount(0);
};
