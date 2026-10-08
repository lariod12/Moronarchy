import { expect, test } from "@playwright/test";
import type { Browser, APIRequestContext, Page } from "@playwright/test";
import {
  END_TURN_CROWN,
  SHAKING_CROWN,
  answerDialog,
  answerPage,
  hasHorizontalOverflow,
  holdButton,
  isSettled,
  joinRoomAs,
  openPlayer,
  serverURL
} from "./helpers";
import type { Player } from "./helpers";

// The end of the game against the real server. The room is created with the test-only "finale" scenario (the server
// only accepts it because playwright.config.ts starts it with MORONARCHY_ENABLE_TEST_SCENARIOS=1): the host (Alice)
// owns every plot and everyone else holds 5 coin, so Bob goes bankrupt on the first fee he has to pay.

const createFinaleRoom = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post(`${serverURL}/games/moronarchy/create`, {
    data: { numPlayers: 6, unlisted: true, setupData: { scenario: "finale" } }
  });
  expect(response.ok(), `create room: ${response.status()} ${await response.text()}`).toBe(true);
  const { matchID } = (await response.json()) as { matchID: string };
  return matchID;
};

const seatCards = (page: Page) => page.getByTestId("seat-card");

const startMatch = async (browser: Browser, request: APIRequestContext, errors: string[]): Promise<{ alice: Player; bob: Player; code: string }> => {
  const code = await createFinaleRoom(request);
  const alice = await openPlayer(browser, "Alice", errors);
  const bob = await openPlayer(browser, "Bob", errors, { width: 320, height: 640 });
  // Alice joins first (seat 0, host), Bob second.
  await joinRoomAs(alice.page, "Alice", code);
  await expect(seatCards(alice.page)).toHaveCount(1);
  await joinRoomAs(bob.page, "Bob", code);
  await expect(seatCards(alice.page)).toHaveCount(2);

  await alice.page.getByRole("button", { name: "Chat" }).click();
  await alice.page.getByPlaceholder("Say something…").fill("good luck");
  await alice.page.getByRole("button", { name: "Send" }).click();
  await expect(bob.page.getByRole("log", { name: "Chat" })).toContainText("good luck");

  await bob.page.getByRole("button", { name: "Ready" }).click();
  await alice.page.getByRole("button", { name: "Start" }).click();
  for (const player of [alice, bob]) {
    await expect(player.page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
  }
  return { alice, bob, code };
};

// Whoever's crown shakes plays next; null once Bob's Lose face shows (the game is over).
const nextActor = async (alice: Player, bob: Player): Promise<Player | null> => {
  let actor: Player | null = null;
  await expect
    .poll(
      async () => {
        if ((await bob.page.getByTestId("lose-face").count()) > 0) {
          return "over";
        }
        for (const player of [alice, bob]) {
          if ((await player.page.getByRole("button", { name: SHAKING_CROWN }).count()) === 1) {
            actor = player;
            return player.name;
          }
        }
        return "";
      },
      { timeout: 20_000 }
    )
    .not.toBe("");
  return actor;
};

// Plays turns (claim, roll, answer every popup the plain way, end the turn) until Bob's bankruptcy ends the match.
// Normally that is Bob's first fee; a lucky treasure chest on the way only postpones it by a turn.
const playUntilOver = async (alice: Player, bob: Player): Promise<void> => {
  for (let turn = 1; turn <= 12; turn += 1) {
    const active = await nextActor(alice, bob);
    if (!active) {
      return;
    }
    const other = active === alice ? bob : alice;
    await holdButton(active.page, SHAKING_CROWN);
    await expect(active.page).toHaveURL(/\/map$/);
    await active.page.getByRole("button", { name: "Tap to Roll" }).click();

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if ((await bob.page.getByTestId("lose-face").count()) > 0) {
        return;
      }
      if (await isSettled(active.page)) {
        break;
      }
      const handled = (await answerDialog(active.page)) || (await answerDialog(other.page)) || (await answerPage(active.page));
      if (!handled) {
        await active.page.waitForTimeout(120);
      }
    }
    if ((await bob.page.getByTestId("lose-face").count()) > 0) {
      return;
    }
    await holdButton(active.page, END_TURN_CROWN);
  }
  throw new Error("Bob never went bankrupt");
};

const closeAll = async (players: Player[]): Promise<void> => {
  for (const player of players) {
    await player.context.close();
  }
};

const rankingNames = (page: Page) => page.locator(".result-ranking__name");
const rankingStatus = (page: Page) => page.locator(".result-ranking__status");

test.describe("end of the game", () => {
  test("Lose and Win faces, the ranking, host-only Play Again back to the same lobby", async ({ browser, request }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    const { alice, bob, code } = await startMatch(browser, request, errors);

    try {
      await playUntilOver(alice, bob);

      // R1/R2: Bob was knocked out by the finishing move: Lose face first, then Ranking. Alice: Win face, then Ranking.
      const lose = bob.page.getByTestId("lose-face");
      await expect(lose).toBeVisible();
      await expect(lose.getByRole("heading", { name: "You are out!" })).toBeVisible();
      await expect(lose.getByText(/^Bankrupt in round \d+$/)).toBeVisible();
      await expect(lose.getByRole("button", { name: "Leave room" })).toBeVisible();
      expect(await hasHorizontalOverflow(bob.page)).toBe(false);

      const win = alice.page.getByTestId("win-face");
      await expect(win).toBeVisible();
      await expect(win.getByRole("heading", { name: "You win!" })).toBeVisible();
      await expect(win.getByText("Last king standing")).toBeVisible();

      // R3: the ranking, in the engine's order, with the (you) marker.
      await win.getByRole("button", { name: "See ranking" }).click();
      await lose.getByRole("button", { name: "See ranking" }).click();
      await expect(rankingNames(alice.page)).toHaveText(["Alice (you)", "Bob"]);
      await expect(rankingNames(bob.page)).toHaveText(["Alice", "Bob (you)"]);
      await expect(rankingStatus(alice.page).first()).toHaveText("Winner");
      await expect(rankingStatus(alice.page).nth(1)).toHaveText(/^Out in round \d+$/);
      await expect(rankingStatus(bob.page).nth(1)).toHaveText(await rankingStatus(alice.page).nth(1).innerText());
      expect(await hasHorizontalOverflow(bob.page)).toBe(false);
      expect(await hasHorizontalOverflow(alice.page)).toBe(false);
      await alice.page.screenshot({ path: "test-results/ui/screens/e2e-endgame-ranking.png" });
      await bob.page.screenshot({ path: "test-results/ui/screens/e2e-endgame-ranking-bob-320.png" });

      // Only the host can start again.
      await expect(bob.page.getByRole("button", { name: "Play Again" })).toBeDisabled();
      await expect(bob.page.getByText("Waiting for the host to start again")).toBeVisible();
      await expect(alice.page.getByRole("button", { name: "Play Again" })).toBeEnabled();
      await expect(alice.page.getByText("Waiting for the host to start again")).toHaveCount(0);

      // R7: a reload on the Ranking page stays on the Ranking page, no face is replayed.
      await bob.page.reload();
      await expect(bob.page.getByTestId("ranking")).toBeVisible();
      await expect(bob.page.getByTestId("lose-face")).toHaveCount(0);
      await alice.page.reload();
      await expect(alice.page.getByTestId("ranking")).toBeVisible();
      await expect(alice.page.getByTestId("win-face")).toHaveCount(0);

      // R4: Play Again brings everyone to the Lobby of the same room, seats kept, nobody ready, chat kept.
      await alice.page.getByRole("button", { name: "Play Again" }).click();
      for (const player of [alice, bob]) {
        await expect(player.page.getByRole("button", { name: /^(Ready|Start)$/ })).toBeVisible();
        await expect(player.page.locator(".shell-top-bar__room")).toHaveText(code);
        await expect(seatCards(player.page)).toHaveCount(2);
        await expect(player.page.getByTestId("seat-card").filter({ hasText: "Alice" })).toBeVisible();
        await expect(player.page.getByTestId("seat-card").filter({ hasText: "Bob" })).toBeVisible();
        await expect(player.page.locator(".seat-card__ready")).toHaveCount(0);
        await expect(player.page.getByRole("log", { name: "Chat" })).toContainText("good luck");
      }
      await expect(alice.page.getByRole("button", { name: "Start" })).toBeDisabled();

      // A new game: countdown, then the game shell again with no face replayed.
      await bob.page.getByRole("button", { name: "Ready" }).click();
      await alice.page.getByRole("button", { name: "Start" }).click();
      for (const player of [alice, bob]) {
        await expect(player.page.getByText("Game Starting")).toBeVisible();
      }
      for (const player of [alice, bob]) {
        await expect(player.page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
        await expect(player.page.getByTestId("win-face")).toHaveCount(0);
        await expect(player.page.getByTestId("lose-face")).toHaveCount(0);
        await expect(player.page.getByTestId("ranking")).toHaveCount(0);
      }
    } finally {
      await closeAll([alice, bob]);
    }

    expect(errors).toEqual([]);
  });

  test("Quit releases the seat: the lobby after Play Again shows only the host", async ({ browser, request }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    const { alice, bob } = await startMatch(browser, request, errors);

    try {
      await playUntilOver(alice, bob);
      await alice.page.getByTestId("win-face").getByRole("button", { name: "See ranking" }).click();
      await bob.page.getByTestId("lose-face").getByRole("button", { name: "See ranking" }).click();
      await expect(bob.page.getByTestId("ranking")).toBeVisible();

      // R5: Quit goes to Welcome and forgets the session.
      await bob.page.getByRole("button", { name: "Quit" }).click();
      await expect(bob.page).toHaveURL(/\/$/);
      await expect(bob.page.getByLabel("Name", { exact: true })).toBeVisible();
      expect(await bob.page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("moronarchy:session:")))).toEqual([]);
      expect(await hasHorizontalOverflow(bob.page)).toBe(false);

      // The ranking of the finished game is not touched, but the seat is gone once the host plays again.
      await expect(rankingNames(alice.page)).toHaveText(["Alice (you)", "Bob"]);
      await alice.page.getByRole("button", { name: "Play Again" }).click();
      await expect(alice.page.getByRole("button", { name: "Start" })).toBeVisible();
      await expect(seatCards(alice.page)).toHaveCount(1);
      await expect(alice.page.getByTestId("seat-empty")).toHaveCount(5);
      await expect(alice.page.getByTestId("seat-card").filter({ hasText: "Bob" })).toHaveCount(0);
      await expect(alice.page.getByRole("button", { name: "Start" })).toBeDisabled();
    } finally {
      await closeAll([alice, bob]);
    }

    expect(errors).toEqual([]);
  });
});
