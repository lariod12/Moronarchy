import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  SHAKING_CROWN,
  createRoomAs,
  hasHorizontalOverflow,
  holdButton,
  joinRoomAs,
  openPlayer,
  serverURL,
  whoShakes
} from "./helpers";
import type { Player } from "./helpers";

// Multiplayer robustness against the real server. playwright.config.ts starts it with MORONARCHY_ABSENT_TIMEOUT_MS=4000,
// so "disconnected while the game waits on you for 30 s" becomes a few seconds here.

const SCREENSHOT_DIR = "test-results/ui/screens";

// Chrome itself logs a console error for every request or WebSocket that fails while the context is offline; those two
// tests switch the network off on purpose, so only these browser lines are ignored there.
const OFFLINE_NOISE = /ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|WebSocket connection to .* failed|Failed to load resource: net::ERR_/;
const withoutOfflineNoise = (errors: string[]): string[] => errors.filter((error) => !OFFLINE_NOISE.test(error));

const closeAll = async (players: Player[]): Promise<void> => {
  for (const player of players) {
    await player.context.close();
  }
};

// Alice creates a room, the others join, everybody but the host readies up, the host starts: all see Round 1.
const startGame = async (browser: Browser, names: string[], errors: string[]): Promise<{ players: Player[]; code: string }> => {
  const players: Player[] = [];
  for (const name of names) {
    players.push(await openPlayer(browser, name, errors));
  }
  const [host, ...guests] = players as [Player, ...Player[]];
  const code = await createRoomAs(host.page, host.name);
  for (const guest of guests) {
    await joinRoomAs(guest.page, guest.name, code);
  }
  await expect(host.page.getByTestId("seat-card")).toHaveCount(players.length);
  for (const guest of guests) {
    await guest.page.getByRole("button", { name: "Ready" }).click();
  }
  await expect(host.page.getByRole("button", { name: "Start" })).toBeEnabled();
  await host.page.getByRole("button", { name: "Start" }).click();
  for (const player of players) {
    await expect(player.page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
  }
  return { players, code };
};

const absentBanner = (player: Player) => player.page.getByTestId("absent-banner");

test.describe("multiplayer robustness", () => {
  test("a disconnected turn player is removed after the timeout and the other player wins", async ({ browser }) => {
    const errors: string[] = [];
    const { players } = await startGame(browser, ["Alice", "Bob"], errors);
    try {
      const gone = await whoShakes(players);
      const stays = players.find((player) => player !== gone) as Player;

      await gone.page.close();

      await expect(absentBanner(stays)).toContainText(new RegExp(`${gone.name} disconnected — removed in ~\\d+s`));
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await stays.page.screenshot({ path: `${SCREENSHOT_DIR}/live-absent-banner.png` });

      // Two players: the remaining one wins as soon as the other is removed.
      await expect(stays.page.getByTestId("win-face")).toBeVisible({ timeout: 15_000 });
      await stays.page.getByRole("button", { name: "See ranking" }).click();
      await expect(stays.page.getByTestId("ranking")).toBeVisible();
      await expect(stays.page.locator(".result-ranking__name")).toHaveText([`${stays.name} (you)`, gone.name]);
      await expect(stays.page.locator(".result-ranking__status")).toHaveText(["Winner", "Left in round 1"]);
      await stays.page.screenshot({ path: `${SCREENSHOT_DIR}/live-ranking-left.png` });
      expect(await hasHorizontalOverflow(stays.page)).toBe(false);
    } finally {
      await closeAll(players);
    }
    expect(errors).toEqual([]);
  });

  test("with three players the others carry on, and the removed one is told when they come back", async ({ browser }) => {
    const errors: string[] = [];
    const { players } = await startGame(browser, ["Alice", "Bob", "Cara"], errors);
    try {
      const gone = await whoShakes(players);
      const others = players.filter((player) => player !== gone);

      await gone.context.setOffline(true);
      await expect(gone.page.getByTestId("connection-banner")).toHaveText("Reconnecting…", { timeout: 20_000 });

      for (const other of others) {
        await expect(absentBanner(other)).toContainText(`${gone.name} disconnected — removed in ~`, { timeout: 25_000 });
      }
      // The server removes them: everybody else gets the notice, the log line and carries on with the next turn.
      for (const other of others) {
        const notice = other.page.getByRole("dialog", { name: "Player removed" });
        await expect(notice).toContainText(`${gone.name} was removed (disconnected).`, { timeout: 25_000 });
        await notice.getByRole("button", { name: "Done" }).click();
        await expect(other.page.getByTestId("activity-line")).toContainText(`${gone.name} left the game (disconnected)`);
        await expect(absentBanner(other)).toHaveCount(0);
      }
      const next = await whoShakes(others);
      expect(next).not.toBe(gone);

      // Back online (the same tab): the removed king hears why, then watches.
      await gone.context.setOffline(false);
      const face = gone.page.getByTestId("lose-face");
      await expect(face.getByRole("heading", { name: "You were removed" })).toBeVisible({ timeout: 30_000 });
      await expect(face.getByText("Disconnected for too long")).toBeVisible();
      await expect(gone.page.getByTestId("connection-banner")).toHaveCount(0);
      await face.getByRole("button", { name: "Keep watching" }).click();
      await expect(gone.page.getByText("Game Over")).toBeVisible();

      // The game goes on without them: the next king takes the turn and rolls.
      await holdButton(next.page, SHAKING_CROWN);
      await expect(next.page).toHaveURL(/\/map$/);
      await next.page.getByRole("button", { name: "Tap to Roll" }).click();
      await expect(next.page.getByTestId("dice-total")).toBeVisible({ timeout: 15_000 });
    } finally {
      await closeAll(players);
    }
    expect(withoutOfflineNoise(errors)).toEqual([]);
  });

  test("a player who reconnects within the timeout is not removed", async ({ browser }) => {
    const errors: string[] = [];
    const { players } = await startGame(browser, ["Alice", "Bob"], errors);
    try {
      const flaky = await whoShakes(players);
      const steady = players.find((player) => player !== flaky) as Player;

      await flaky.context.setOffline(true);
      await expect(flaky.page.getByTestId("connection-banner")).toHaveText("Reconnecting…", { timeout: 20_000 });
      // The server noticed: the other player sees the countdown start ...
      await expect(absentBanner(steady)).toContainText(`${flaky.name} disconnected — removed in ~`, { timeout: 20_000 });
      // ... and the king is back long before it runs out.
      await flaky.context.setOffline(false);
      await expect(flaky.page.getByTestId("connection-banner")).toHaveCount(0, { timeout: 20_000 });
      await expect(absentBanner(steady)).toContainText(`${flaky.name} reconnected`, { timeout: 10_000 });

      // Well past the 4 s timeout: nobody was removed, and the offline marker and banner are gone for the other player.
      await steady.page.waitForTimeout(8000);
      await expect(absentBanner(steady)).toHaveCount(0);
      await expect(steady.page.getByTestId("ranking")).toHaveCount(0);
      await expect(steady.page.getByTestId("win-face")).toHaveCount(0);
      await expect(flaky.page.getByTestId("lose-face")).toHaveCount(0);

      // The game continues: the same king can still play their turn.
      await expect(flaky.page.getByRole("button", { name: SHAKING_CROWN })).toHaveCount(1);
      await holdButton(flaky.page, SHAKING_CROWN);
      await expect(flaky.page).toHaveURL(/\/map$/);
      await flaky.page.getByRole("button", { name: "Tap to Roll" }).click();
      await expect(flaky.page.getByTestId("dice-total")).toBeVisible({ timeout: 15_000 });
    } finally {
      await closeAll(players);
    }
    expect(withoutOfflineNoise(errors)).toEqual([]);
  });

  test("a room keeps seating new players after more than six have been kicked", async ({ browser, request }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    const host = await openPlayer(browser, "Alice", errors);
    const guest = await openPlayer(browser, "Guest", errors);
    try {
      const code = await createRoomAs(host.page, "Alice");
      const oldSessions: { playerID: string; credentials: string }[] = [];

      // Seven different people join one after the other and are kicked again: without freeing the player slot the
      // room would answer "Room is full" after five.
      for (let index = 1; index <= 7; index += 1) {
        const name = `Guest${index}`;
        await joinRoomAs(guest.page, name, code);
        await expect(host.page.getByTestId("seat-card").filter({ hasText: name })).toBeVisible();
        await expect(guest.page.getByText("Room is full")).toHaveCount(0);

        const session = await guest.page.evaluate((room) => localStorage.getItem(`moronarchy:session:${room}`), code);
        const { playerID, credentials } = JSON.parse(session ?? "{}") as { playerID: string; credentials: string };
        oldSessions.push({ playerID, credentials });

        await host.page.getByTestId("seat-card").filter({ hasText: name }).click();
        await expect(host.page.getByRole("dialog", { name: `Kick ${name}?` })).toBeVisible();
        await host.page.getByRole("button", { name: "Yes" }).click();
        await expect(host.page.getByTestId("seat-card")).toHaveCount(1);
        // The kicked page goes back to Welcome.
        await expect(guest.page).toHaveURL(/\/$/);
      }

      // Every kicked player's old credentials are dead: boardgame.io refuses them even though the slot is free again.
      for (const { playerID, credentials } of oldSessions) {
        const response = await request.post(`${serverURL}/games/moronarchy/${code}/leave`, { data: { playerID, credentials } });
        expect(response.status()).toBe(403);
      }

      // And a new person can still take a seat.
      await joinRoomAs(guest.page, "Newcomer", code);
      await expect(host.page.getByTestId("seat-card").filter({ hasText: "Newcomer" })).toBeVisible();
      await expect(guest.page.getByText("Room is full")).toHaveCount(0);
    } finally {
      await closeAll([host, guest]);
    }
    expect(errors).toEqual([]);
  });

  test("the chat input and Send stay on screen when the on-screen keyboard shrinks the page", async ({ browser }) => {
    const errors: string[] = [];
    const alice = await openPlayer(browser, "Alice", errors, { width: 375, height: 667 });
    try {
      await createRoomAs(alice.page, "Alice");
      await alice.page.getByRole("button", { name: "Chat" }).click();
      const input = alice.page.getByPlaceholder("Say something…");
      await input.focus();
      await input.fill("keyboard test");

      // The meta viewport asks the browser to resize the page (not just overlay it) when the keyboard opens.
      await expect(alice.page.locator('meta[name="viewport"]')).toHaveAttribute("content", /interactive-widget=resizes-content/);

      // Simulate the keyboard: the visible height drops from 667 to 380.
      await alice.page.setViewportSize({ width: 375, height: 380 });
      for (const locator of [input, alice.page.getByRole("button", { name: "Send" })]) {
        await expect(locator).toBeVisible();
        const box = await locator.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(380);
        expect(box!.x + box!.width).toBeLessThanOrEqual(375);
      }
      expect(await hasHorizontalOverflow(alice.page)).toBe(false);
      await alice.page.getByRole("button", { name: "Send" }).click();
      await expect(alice.page.getByRole("log", { name: "Chat" })).toContainText("keyboard test");
    } finally {
      await closeAll([alice]);
    }
    expect(errors).toEqual([]);
  });
});
