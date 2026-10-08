import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createRoomAs, hasHorizontalOverflow, holdButton, joinRoomAs, openPlayer, readRoomCode } from "./helpers";
import type { Player } from "./helpers";

// Two players play ordinary turns (buying every plot they can afford) until a visitor is offered an enabled Attack,
// attack, and play the whole fight on both phones. Then one more turn has to end normally.
const MAX_TURNS = 80;
const COIN_RESERVE = 30;
const SHAKING_CROWN = /hold to take your turn/;
const END_TURN_CROWN = /hold to end your turn/;

interface FightLog {
  turnsUntilOpportunity: number | null;
  attackedAt: string;
  titles: string[];
  rounds: number;
  reloadChecked: boolean;
  screenshot: boolean;
  // Seen on a fighter page: the deciding round's score lines were on screen while no result popup was open yet,
  // and the popup was held back while the last round was still rolling.
  finalRoundBeforeDialog: boolean;
  resultHeldWhileRolling: boolean;
  finalRoundBehindDialog: boolean;
}

const readCoin = async (page: Page): Promise<number> => {
  const text = await page.getByText(/^coin: \d+$/).innerText({ timeout: 3000 });
  return Number(text.replace("coin: ", ""));
};

// Watches the Fight page from inside the browser (a MutationObserver sees every commit, a poll would miss the
// short moment between "last round shown" and "result popup"). Installed once per page load.
const watchFinalRound = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const w = window as unknown as { __fightFlags?: { beforeDialog: boolean; held: boolean } };
    if (w.__fightFlags) {
      return;
    }
    const flags = { beforeDialog: false, held: false };
    w.__fightFlags = flags;
    const inspect = (): void => {
      const root = document.querySelector('[data-testid="fight-view"]');
      if (!root || root.getAttribute("data-finished") !== "true") {
        return;
      }
      const dialogs = document.querySelectorAll('[role="dialog"]').length;
      const scores = Array.from(document.querySelectorAll('[data-testid="fight-score"]')).map((node) => (node.textContent ?? "").trim());
      if (dialogs === 0 && root.getAttribute("data-rolling") === "true") {
        flags.held = true;
      }
      if (dialogs === 0 && scores.length === 2 && scores.every((score) => /^\d \+ \d+ = \d+$/.test(score))) {
        flags.beforeDialog = true;
      }
    };
    new MutationObserver(inspect).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    inspect();
  });

const readFinalRoundFlags = (page: Page): Promise<{ beforeDialog: boolean; held: boolean } | null> =>
  page.evaluate(() => (window as unknown as { __fightFlags?: { beforeDialog: boolean; held: boolean } }).__fightFlags ?? null);

const isOnFightPage = (page: Page): boolean => new URL(page.url()).pathname.endsWith("/fight");

// Answers whatever popup is open. Returns false when nothing could be answered.
const tryAnswerDialog = async (page: Page, who: string, log: FightLog, turn: number): Promise<boolean> => {
  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) === 0) {
    return false;
  }
  const title = (await dialog.getByRole("heading").innerText({ timeout: 3000 })).trim();
  const body = await dialog.innerText({ timeout: 3000 });
  const click = async (name: string | RegExp): Promise<boolean> => {
    const button = dialog.getByRole("button", { name });
    if ((await button.count()) === 0 || !(await button.first().isEnabled())) {
      return false;
    }
    await button.first().click({ timeout: 3000 });
    return true;
  };

  if (/^Plot \d+$/.test(title)) {
    const price = Number(/for (\d+) coin/.exec(body)?.[1]);
    if ((await readCoin(page)) - price >= COIN_RESERVE && (await click("Buy"))) {
      return true;
    }
    return click("Skip");
  }
  if (title === "Message") {
    // The visitor of an empty-handed plot: the first enabled Attack is taken, everything else pays or collects.
    if (log.turnsUntilOpportunity === null && body.includes("or attack?") && body.includes("You get in")) {
      const attack = dialog.getByRole("button", { name: "Attack" });
      if ((await attack.count()) === 1 && (await attack.isEnabled())) {
        log.turnsUntilOpportunity = turn;
        log.attackedAt = `${who} on turn ${turn}: ${body.replace(/\s+/g, " ")}`;
        await attack.click({ timeout: 3000 });
        // The fighter is pulled to the Fight page at once.
        await expect(page).toHaveURL(/\/fight$/);
        return true;
      }
    }
    return (await click(/^Pay \d+$/)) || (await click("Collect"));
  }
  if (title === "Fight!") {
    // A fight the player is not part of: watch it later.
    return click("Later");
  }
  if (title === "Victory!" || title === "Defeat" || title === "Fight over") {
    log.titles.push(`${who}:${title}`);
    // The deciding round stays on the page behind the popup.
    if (isOnFightPage(page)) {
      const scores = await page.getByTestId("fight-score").allInnerTexts();
      expect(scores, `${who}: last round behind the result popup`).toHaveLength(2);
      for (const score of scores) {
        expect(score.trim()).toMatch(/^\d \+ \d+ = \d+$/);
      }
      await expect(page.getByTestId("fight-view")).toHaveAttribute("data-finished", "true");
      log.finalRoundBehindDialog = true;
    }
    return click("Done");
  }
  if (/^You rolled/.test(title)) {
    return click("Move");
  }
  if (title === "You have picked") {
    return click("Yes");
  }
  return click("Done");
};

const answerDialog = async (page: Page, who: string, log: FightLog, turn: number): Promise<boolean> => {
  try {
    return await tryAnswerDialog(page, who, log, turn);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return false;
    }
    throw error;
  }
};

const answerPage = async (page: Page): Promise<boolean> => {
  if ((await page.getByRole("dialog").count()) > 0) {
    return false;
  }
  const path = new URL(page.url()).pathname;
  if (path.endsWith("/cards")) {
    await page.getByTestId("upgrade-card").first().click();
    return true;
  }
  if (path.endsWith("/station")) {
    await page.getByRole("button", { name: /^(Continue moving|Done)$/ }).click();
    return true;
  }
  return false;
};

const readFightSnapshot = (page: Page) =>
  page.evaluate(() => ({
    meters: Array.from(document.querySelectorAll('[data-testid="fight-panel"] [role="meter"]')).map((node) => node.getAttribute("aria-valuenow")),
    markers: Array.from(document.querySelectorAll('[data-testid="round-marker"]')).map((node) => node.getAttribute("data-result")),
    scores: Array.from(document.querySelectorAll('[data-testid="fight-score"]')).map((node) => (node.textContent ?? "").trim()),
    note: (document.querySelector('[data-testid="fight-round-note"]')?.textContent ?? "").trim(),
    role: document.querySelector('[data-testid="fight-view"]')?.getAttribute("data-role") ?? ""
  }));

// Presses Roll on every fight page that offers it. Returns true when something was pressed.
const rollWhereOffered = async (players: Player[], log: FightLog): Promise<boolean> => {
  let pressed = false;
  for (const player of players) {
    const page = player.page;
    if (isOnFightPage(page)) {
      await watchFinalRound(page);
    }
    if (!isOnFightPage(page) || (await page.getByRole("dialog").count()) > 0) {
      continue;
    }
    // A patient player waits for the dice to settle before rolling again.
    if ((await page.getByTestId("fight-dice").getAttribute("data-rolling")) === "true") {
      continue;
    }
    const roll = page.getByRole("button", { name: "Roll", exact: true });
    if ((await roll.count()) !== 1 || !(await roll.isEnabled())) {
      continue;
    }
    // The fight page of the first fighter: sanity checks and a reload in the middle of the fight (F9).
    const before = await readFightSnapshot(page);
    expect(await hasHorizontalOverflow(page), `${player.name} fight page overflows`).toBe(false);
    await expect(page.getByText("Fight", { exact: true })).toBeVisible();
    await expect(page.getByTestId("fight-panel")).toHaveCount(2);
    await expect(page.getByRole("meter")).toHaveCount(2);
    if (!log.screenshot && before.scores.some((score) => score !== "")) {
      log.screenshot = true;
      await page.screenshot({ path: "test-results/ui/screens/e2e-fight.png" });
    }
    if (!log.reloadChecked && before.scores.some((score) => score !== "")) {
      log.reloadChecked = true;
      await page.reload();
      await expect(page.getByTestId("fight-view")).toBeVisible();
      expect(isOnFightPage(page)).toBe(true);
      await watchFinalRound(page);
      // Straight after the reload: same state, dice at rest, no popup replayed.
      await expect(page.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "false");
      expect(await readFightSnapshot(page)).toEqual(before);
      await page.waitForTimeout(900);
      await expect(page.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "false");
      expect(await page.getByRole("dialog").count()).toBe(0);
    }
    await roll.click({ timeout: 3000 });
    log.rounds += 1;
    pressed = true;
  }
  return pressed;
};

const isSettled = async (active: Page): Promise<boolean> =>
  (await active.getByText("end turn!").isVisible()) &&
  new URL(active.url()).pathname.endsWith("/map") &&
  (await active.locator('.map[data-animating="false"]').count()) === 1 &&
  (await active.getByRole("dialog").count()) === 0;

const resolveUntilSettled = async (active: Player, other: Player, log: FightLog, turn: number): Promise<void> => {
  const deadline = Date.now() + 120_000;
  let calmSince = 0;
  while (Date.now() < deadline) {
    if ((await active.page.getByTestId("lose-face").count()) + (await active.page.getByTestId("win-face").count()) + (await active.page.getByTestId("ranking").count()) > 0) {
      throw new Error("The match ended early (a king went bankrupt), so the turn loop cannot continue");
    }
    for (const player of [active, other]) {
      const flags = await readFinalRoundFlags(player.page).catch(() => null);
      log.finalRoundBeforeDialog ||= flags?.beforeDialog ?? false;
      log.resultHeldWhileRolling ||= flags?.held ?? false;
    }
    if (await isSettled(active.page)) {
      calmSince = calmSince || Date.now();
      if (Date.now() - calmSince > 600) {
        return;
      }
    } else {
      calmSince = 0;
    }
    const handled =
      (await rollWhereOffered([active, other], log)) ||
      (await answerDialog(active.page, active.name, log, turn)) ||
      (await answerDialog(other.page, other.name, log, turn)) ||
      (await answerPage(active.page));
    if (!handled) {
      await active.page.waitForTimeout(150);
    }
  }
  throw new Error(`The turn never settled. Active URL ${active.page.url()}`);
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
      { timeout: 30_000 }
    )
    .not.toBe("");
  if (!found) {
    throw new Error("Nobody has a shaking crown");
  }
  return found;
};

test.describe("fighting", () => {
  test("a visitor attacks, both phones play the fight, the result closes and the game goes on", async ({ browser }) => {
    test.setTimeout(1_500_000);
    const log: FightLog = { turnsUntilOpportunity: null, attackedAt: "", titles: [], rounds: 0, reloadChecked: false, screenshot: false, finalRoundBeforeDialog: false, resultHeldWhileRolling: false, finalRoundBehindDialog: false };
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

      let fightTurn = 0;
      let extraTurnsPlayed = 0;
      for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
        const active = await whoShakes(players);
        const other = players.find((player) => player !== active) as Player;
        if (!new URL(other.page.url()).pathname.endsWith("/map")) {
          await other.page.getByRole("button", { name: "Map", exact: true }).click();
        }
        await expect(other.page).toHaveURL(/\/map$/);

        await holdButton(active.page, SHAKING_CROWN);
        await expect(active.page).toHaveURL(/\/map$/);
        await expect(active.page.getByRole("button", { name: "Tap to Roll" })).toBeEnabled();
        await active.page.getByRole("button", { name: "Tap to Roll" }).click();
        await expect(active.page.getByTestId("dice-total")).toBeVisible();

        const hadOpportunity = log.turnsUntilOpportunity !== null;
        await resolveUntilSettled(active, other, log, turn);

        if (!hadOpportunity && log.turnsUntilOpportunity !== null) {
          fightTurn = turn;
          // The fight is over: both fighters were shown a result and both are back on the Map.
          // A fight can end after one round when a weak plot loses all its health.
          expect(log.rounds, "at least one roll was pressed").toBeGreaterThanOrEqual(1);
          console.log(`Fight done: attack opportunity after ${turn} turns (${log.attackedAt}). Rolls pressed ${log.rounds}. Result popups: ${log.titles.join(", ")}. Reload checked ${String(log.reloadChecked)}`);
          const fighterTitles = log.titles.filter((entry) => /:(Victory!|Defeat)$/.test(entry));
          expect(log.finalRoundBehindDialog, "the deciding round stayed on the Fight page behind the result popup").toBe(true);
          expect(log.finalRoundBeforeDialog, "the deciding round's score lines were shown before the result popup").toBe(true);
          expect(log.resultHeldWhileRolling, "the result popup waited for the last round to stop rolling").toBe(true);
          expect(fighterTitles.length, `result popups ${log.titles.join(", ")}`).toBeGreaterThanOrEqual(1);
          if (fighterTitles.length === 2) {
            expect(new Set(fighterTitles.map((entry) => entry.split(":")[1])).size, `duel results ${fighterTitles.join(", ")}`).toBe(2);
          }
          for (const player of players) {
            expect(new URL(player.page.url()).pathname.endsWith("/map"), `${player.name} is back on the Map`).toBe(true);
          }
        } else if (fightTurn > 0) {
          // The game goes on: this turn after the fight settled like any other.
          extraTurnsPlayed += 1;
        }

        // End the turn normally (holding the Crown ends it).
        await holdButton(active.page, END_TURN_CROWN);
        await expect(other.page.getByRole("button", { name: SHAKING_CROWN })).toBeVisible();
        await expect(active.page.getByText("end turn!")).toHaveCount(0);

        if (fightTurn > 0 && extraTurnsPlayed >= 1) {
          break;
        }
      }

      if (log.turnsUntilOpportunity === null) {
        throw new Error(`No visitor was offered an enabled Attack within ${MAX_TURNS} turns`);
      }
      expect(extraTurnsPlayed, "one more turn ended normally after the fight").toBeGreaterThanOrEqual(1);
      console.log(
        `Attack opportunity after ${log.turnsUntilOpportunity} turns (${log.attackedAt}). Rolls pressed ${log.rounds}. Result popups: ${log.titles.join(", ")}. Reload checked ${String(log.reloadChecked)}`
      );
    } finally {
      for (const player of players) {
        await player.context.close();
      }
    }

    expect(errors).toEqual([]);
  });
});
