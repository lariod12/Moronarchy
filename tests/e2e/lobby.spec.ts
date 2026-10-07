import { devices, expect, test } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";

const webPort = process.env.E2E_WEB_PORT ?? "5173";
const serverPort = process.env.E2E_SERVER_PORT ?? "8000";
const baseURL = `http://127.0.0.1:${webPort}`;
const serverURL = `http://127.0.0.1:${serverPort}`;

const ROOM_CODE_PATTERN = /^R[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
// Chrome logs every failed HTTP response as a console error. The error-path checks below deliberately
// trigger 404 (unknown room) and 409 (full / started room) lobby responses, so only those are ignored.
const EXPECTED_HTTP_NOISE = /Failed to load resource: the server responded with a status of (404|409)/;

interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

const watchErrors = (page: Page, label: string, errors: string[]): void => {
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !EXPECTED_HTTP_NOISE.test(message.text())) {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
};

const openPlayer = async (
  browser: Browser,
  name: string,
  errors: string[],
  viewport?: { width: number; height: number }
): Promise<Player> => {
  const context = await browser.newContext({
    ...devices["Pixel 5"],
    ...(viewport ? { viewport } : {}),
    baseURL,
    permissions: ["clipboard-read", "clipboard-write"]
  });
  const page = await context.newPage();
  watchErrors(page, name, errors);
  return { name, context, page };
};

const hasHorizontalOverflow = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const element = document.scrollingElement ?? document.documentElement;
    return element.scrollWidth > element.clientWidth;
  });

const readRoomCode = async (page: Page): Promise<string> => {
  const code = (await page.locator(".shell-top-bar__room").innerText()).trim();
  expect(code).toMatch(ROOM_CODE_PATTERN);
  return code;
};

const fillWelcome = async (page: Page, name: string, roomCode = ""): Promise<void> => {
  await page.goto("/");
  await page.getByLabel("Name", { exact: true }).fill(name);
  if (roomCode) {
    await page.getByLabel("Join room").fill(roomCode);
  }
};

const createRoomAs = async (page: Page, name: string): Promise<string> => {
  await fillWelcome(page, name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/room\/R[A-Z2-9]{4,6}$/);
  return readRoomCode(page);
};

const joinRoomAs = async (page: Page, name: string, roomCode: string): Promise<void> => {
  await fillWelcome(page, name, roomCode);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page).toHaveURL(/\/room\/R[A-Z2-9]{4,6}$/);
  await expect(page.locator(".shell-top-bar__room")).toBeVisible();
};

const seatByName = (page: Page, name: string) => page.getByTestId("seat-card").filter({ hasText: name });

test.describe("lobby and game start", () => {
  test("three players create, join, chat, ready up, start and land on the Home hub", async ({ browser }) => {
    const errors: string[] = [];
    const alice = await openPlayer(browser, "Alice", errors);
    const bob = await openPlayer(browser, "Bob", errors);
    const cara = await openPlayer(browser, "Cara", errors);
    const players = [alice, bob, cara];

    try {
      // E1: Create/Join label, disabled without a name, blocking overlay while the room is created.
      await alice.page.goto("/");
      await expect(alice.page.getByRole("button", { name: "Create" })).toBeDisabled();
      await alice.page.getByLabel("Name", { exact: true }).fill("Alice");
      await expect(alice.page.getByTestId("welcome-preview")).toHaveText("Alice");
      await expect(alice.page.getByRole("button", { name: "Create" })).toBeEnabled();
      await alice.page.getByLabel("Join room").fill("r");
      await expect(alice.page.getByRole("button", { name: "Join", exact: true })).toBeEnabled();
      await alice.page.getByLabel("Join room").fill("");
      await expect(alice.page.getByRole("button", { name: "Create" })).toBeVisible();
      await alice.page.route("**/games/moronarchy/create", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.continue();
      });
      await alice.page.getByRole("button", { name: "Create" }).click();
      await expect(alice.page.getByRole("status")).toHaveText("Waiting for creating room");

      // E2: lands on the lobby with a short room code that copies on tap.
      await expect(alice.page).toHaveURL(/\/room\/R[A-Z2-9]{4,6}$/);
      const code = await readRoomCode(alice.page);
      expect(alice.page.url()).toContain(`/room/${code}`);
      await alice.page.getByRole("button", { name: /Room code/ }).click();
      await expect(alice.page.getByText("copied!")).toBeVisible();
      expect(await alice.page.evaluate(() => navigator.clipboard.readText())).toBe(code);
      await expect(alice.page.getByText("copied!")).toBeHidden();

      // E3: join with the code typed in lowercase.
      await joinRoomAs(bob.page, "Bob", code.toLowerCase());
      await joinRoomAs(cara.page, "Cara", code.toLowerCase());

      // E4: 3 seated cards, 3 empty slots, host tag on Alice's seat.
      for (const player of players) {
        await expect(player.page.getByTestId("seat-card")).toHaveCount(3);
        await expect(player.page.getByTestId("seat-empty")).toHaveCount(3);
        await expect(seatByName(player.page, "Alice").getByText("host")).toBeVisible();
        await expect(player.page.getByText("host", { exact: true })).toHaveCount(1);
      }

      // E5: chat from Bob shows in every log and as a bubble on Bob's seat.
      await bob.page.getByRole("button", { name: "Chat" }).click();
      await expect(bob.page.getByPlaceholder("Say something…")).toBeFocused();
      await bob.page.getByPlaceholder("Say something…").fill("hello");
      await bob.page.keyboard.press("Enter");
      await expect(bob.page.getByPlaceholder("Say something…")).toHaveValue("");
      await expect(alice.page.getByRole("log")).toContainText("Bob: hello");
      await expect(cara.page.getByRole("log")).toContainText("Bob: hello");
      await expect(bob.page.getByRole("log")).toContainText("Bob (you): hello");
      await expect(seatByName(alice.page, "Bob").locator(".seat-card__bubble")).toHaveText("hello");
      await expect(seatByName(cara.page, "Bob").locator(".seat-card__bubble")).toHaveText("hello");
      await expect(seatByName(alice.page, "Bob").locator(".seat-card__bubble")).toBeHidden({ timeout: 6000 });
      await bob.page.keyboard.press("Escape");
      await expect(bob.page.getByPlaceholder("Say something…")).toBeHidden();

      // E7 / E6: Start is locked until every non-host is ready; Ready toggles and shows on all clients.
      const start = alice.page.getByRole("button", { name: "Start" });
      await expect(start).toBeDisabled();
      await expect(alice.page.getByRole("button", { name: "Ready" })).toHaveCount(0);
      const bobReady = bob.page.getByRole("button", { name: "Ready" });
      await expect(bobReady).toHaveAttribute("aria-pressed", "false");
      await bobReady.click();
      await expect(bobReady).toHaveAttribute("aria-pressed", "true");
      await expect(seatByName(alice.page, "Bob").getByText("ready", { exact: true })).toBeVisible();
      await expect(seatByName(cara.page, "Bob").getByText("ready", { exact: true })).toBeVisible();
      await expect(start).toBeDisabled();
      await bobReady.click();
      await expect(seatByName(alice.page, "Bob").getByText("ready", { exact: true })).toBeHidden();
      await bobReady.click();
      await cara.page.getByRole("button", { name: "Ready" }).click();
      await expect(start).toBeEnabled();

      await alice.page.screenshot({ path: "test-results/ui/screens/e2e-lobby-3-players.png" });

      // E5 follow-up: kick dialog is host only.
      await expect(cara.page.getByRole("button", { name: /^Bob/ })).toHaveCount(0);

      // E8: start shows the countdown on every client, then the Home hub.
      await start.click();
      for (const player of players) {
        await expect(player.page.getByText("Game Starting")).toBeVisible();
      }
      for (const player of players) {
        await expect(player.page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
        await expect(player.page.getByText("Game Starting")).toBeHidden();
        await expect(player.page.locator(".shell-top-bar__room")).toHaveText(code);
        await expect(player.page.getByText("Home", { exact: true })).toBeVisible();
        await expect(player.page.locator(".ui-tile")).toHaveCount(6);
        await expect(player.page.getByText("health: 100")).toBeVisible();
        await expect(player.page.getByText(/^coin: \d+$/)).toBeVisible();
        await expect(player.page.getByText("level: 1")).toBeVisible();
        expect(await hasHorizontalOverflow(player.page)).toBe(false);
      }
      let shaking = 0;
      for (const player of players) {
        shaking += await player.page.getByRole("button", { name: /hold to take your turn/ }).count();
      }
      expect(shaking).toBe(1);
      await alice.page.screenshot({ path: "test-results/ui/screens/e2e-game-home.png" });

      // E3: a late joiner sees "Game already started"; an unknown code sees "Room not found".
      const dan = await openPlayer(browser, "Dan", errors);
      try {
        await fillWelcome(dan.page, "Dan", code);
        await dan.page.getByRole("button", { name: "Join", exact: true }).click();
        await expect(dan.page.getByRole("alert")).toHaveText("Game already started");
        await expect(dan.page).toHaveURL(/\/$|\/\?/);
        await dan.page.getByLabel("Join room").fill("RZZZZ");
        await expect(dan.page.getByRole("alert")).toHaveCount(0);
        await dan.page.getByRole("button", { name: "Join", exact: true }).click();
        await expect(dan.page.getByRole("alert")).toHaveText("Room not found");
      } finally {
        await dan.context.close();
      }

      // E9: reloading keeps the seat and goes straight to the game (no countdown).
      await bob.page.reload();
      await expect(bob.page.getByText("Round 1")).toBeVisible();
      await expect(bob.page.getByText("Game Starting")).toHaveCount(0);
      await expect(bob.page.locator(".shell-top-bar__room")).toHaveText(code);
    } finally {
      for (const player of players) {
        await player.context.close();
      }
    }

    expect(errors).toEqual([]);
  });

  test("a full room reports Room is full", async ({ browser, request }) => {
    const errors: string[] = [];
    const created = await request.post(`${serverURL}/games/moronarchy/create`, { data: { numPlayers: 6, unlisted: true } });
    expect(created.ok()).toBe(true);
    const { matchID } = (await created.json()) as { matchID: string };
    expect(matchID).toMatch(ROOM_CODE_PATTERN);
    for (let seat = 0; seat < 6; seat += 1) {
      const joined = await request.post(`${serverURL}/games/moronarchy/${matchID}/join`, { data: { playerName: `Bot ${seat}` } });
      expect(joined.ok()).toBe(true);
    }

    const late = await openPlayer(browser, "Late", errors);
    try {
      await fillWelcome(late.page, "Late", matchID);
      await late.page.getByRole("button", { name: "Join", exact: true }).click();
      await expect(late.page.getByRole("alert")).toHaveText("Room is full");
    } finally {
      await late.context.close();
    }
    expect(errors).toEqual([]);
  });

  test("opening a room link without a session redirects to the join form with the code prefilled", async ({ browser }) => {
    const errors: string[] = [];
    const visitor = await openPlayer(browser, "Visitor", errors);
    try {
      await visitor.page.goto("/room/rabcd");
      await expect(visitor.page).toHaveURL(`${baseURL}/?room=RABCD`);
      await expect(visitor.page.getByLabel("Join room")).toHaveValue("RABCD");
      await expect(visitor.page.getByRole("button", { name: "Join", exact: true })).toBeDisabled();
      await visitor.page.getByLabel("Name", { exact: true }).fill("Visitor");
      await expect(visitor.page.getByRole("button", { name: "Join", exact: true })).toBeEnabled();
    } finally {
      await visitor.context.close();
    }
    expect(errors).toEqual([]);
  });

  test("the host can kick a player and the kicked player returns to the welcome screen", async ({ browser }) => {
    const errors: string[] = [];
    const alice = await openPlayer(browser, "Alice", errors);
    const bob = await openPlayer(browser, "Bob", errors);
    try {
      const code = await createRoomAs(alice.page, "Alice");
      await joinRoomAs(bob.page, "Bob", code);
      await expect(alice.page.getByTestId("seat-card")).toHaveCount(2);

      await alice.page.getByRole("button", { name: /^Bob/ }).click();
      await expect(alice.page.getByRole("dialog", { name: "Kick Bob?" })).toBeVisible();
      await alice.page.getByRole("button", { name: "No" }).click();
      await expect(alice.page.getByRole("dialog")).toHaveCount(0);
      await expect(alice.page.getByTestId("seat-card")).toHaveCount(2);

      await alice.page.getByRole("button", { name: /^Bob/ }).click();
      await alice.page.getByRole("button", { name: "Yes" }).click();
      await expect(alice.page.getByTestId("seat-card")).toHaveCount(1);
      await expect(bob.page).toHaveURL(`${baseURL}/`);
      await expect(bob.page.getByRole("button", { name: "Create" })).toBeVisible();
    } finally {
      await alice.context.close();
      await bob.context.close();
    }
    expect(errors).toEqual([]);
  });

  test("welcome, lobby and game screens have no horizontal overflow at 320px", async ({ browser }) => {
    const errors: string[] = [];
    const viewport = { width: 320, height: 640 };
    const alice = await openPlayer(browser, "Alice", errors, viewport);
    const bob = await openPlayer(browser, "Bob", errors, viewport);
    try {
      await alice.page.goto("/");
      await expect(alice.page.getByLabel("Name", { exact: true })).toBeVisible();
      expect(await hasHorizontalOverflow(alice.page)).toBe(false);

      const code = await createRoomAs(alice.page, "Alice");
      await joinRoomAs(bob.page, "Bob", code);
      await expect(alice.page.getByTestId("seat-card")).toHaveCount(2);
      await bob.page.getByRole("button", { name: "Chat" }).click();
      await bob.page.getByPlaceholder("Say something…").fill("a fairly long message to check wrapping inside the bubble");
      await bob.page.keyboard.press("Enter");
      await expect(seatByName(alice.page, "Bob").locator(".seat-card__bubble")).toBeVisible();
      expect(await hasHorizontalOverflow(alice.page)).toBe(false);
      expect(await hasHorizontalOverflow(bob.page)).toBe(false);

      await bob.page.keyboard.press("Escape");
      await bob.page.getByRole("button", { name: "Ready" }).click();
      await alice.page.getByRole("button", { name: "Start" }).click();
      await expect(alice.page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
      await expect(bob.page.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
      expect(await hasHorizontalOverflow(alice.page)).toBe(false);
      expect(await hasHorizontalOverflow(bob.page)).toBe(false);
    } finally {
      await alice.context.close();
      await bob.context.close();
    }
    expect(errors).toEqual([]);
  });
});
