import { devices, expect } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";

// Same ports and env switches as lobby.spec.ts: e2e can run next to another project that owns 5173 / 8000.
export const webPort = process.env.E2E_WEB_PORT ?? "5173";
export const baseURL = `http://127.0.0.1:${webPort}`;
export const serverPort = process.env.E2E_SERVER_PORT ?? "8000";
export const serverURL = `http://127.0.0.1:${serverPort}`;

export const ROOM_CODE_PATTERN = /^R[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

export const watchErrors = (page: Page, label: string, errors: string[]): void => {
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
};

export const openPlayer = async (
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

// The app path of a page URL: the hash route in the single-file build (it runs from file://), the path otherwise.
export const routePath = (url: string): string => {
  const parsed = new URL(url);
  return parsed.hash.startsWith("#/") ? parsed.hash.slice(1) : parsed.pathname;
};

export const hasHorizontalOverflow = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const element = document.scrollingElement ?? document.documentElement;
    return element.scrollWidth > element.clientWidth;
  });

export const readRoomCode = async (page: Page): Promise<string> => {
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

export const createRoomAs = async (page: Page, name: string): Promise<string> => {
  await fillWelcome(page, name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/room\/R[A-Z2-9]{4,6}$/);
  return readRoomCode(page);
};

export const joinRoomAs = async (page: Page, name: string, roomCode: string): Promise<void> => {
  await fillWelcome(page, name, roomCode);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page).toHaveURL(/\/room\/R[A-Z2-9]{4,6}$/);
  await expect(page.locator(".shell-top-bar__room")).toBeVisible();
};

// Presses and holds the mouse over a button, like a long press on a phone.
export const holdButton = async (page: Page, name: RegExp, ms = 800): Promise<void> => {
  const box = await page.getByRole("button", { name }).boundingBox();
  if (!box) {
    throw new Error(`Button ${String(name)} has no bounding box`);
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
};

// ---- Turn loop shared by game.spec.ts and info.spec.ts ----

export const COIN_RESERVE = 150;

// What the turn loop met along the way; printed at the end of the test.
export const live = { cards: 0, stations: 0, answered: new Map<string, number>() };

export const SHAKING_CROWN = /hold to take your turn/;
export const END_TURN_CROWN = /hold to end your turn/;

export const readCoin = async (page: Page): Promise<number> => {
  const text = await page.getByText(/^coin: \d+$/).innerText({ timeout: 3000 });
  return Number(text.replace("coin: ", ""));
};

// Answers whatever popup is open, the way a careful player would. Returns false when nothing could be answered
// (no popup or a waiting popup).
const tryAnswerDialog = async (page: Page): Promise<boolean> => {
  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) === 0) {
    return false;
  }
  const title = (await dialog.getByRole("heading").innerText({ timeout: 3000 })).trim();
  const key = title.replace(/[0-9]+/g, "N");
  const click = async (name: string | RegExp): Promise<boolean> => {
    const button = dialog.getByRole("button", { name });
    if ((await button.count()) === 0 || !(await button.first().isEnabled())) {
      return false;
    }
    await button.first().click({ timeout: 3000 });
    live.answered.set(key, (live.answered.get(key) ?? 0) + 1);
    return true;
  };

  if (/^Plot \d+$/.test(title)) {
    // Buy while a reserve stays in the purse so that fees cannot bankrupt the test.
    const price = Number(/for (\d+) coin/.exec(await dialog.innerText({ timeout: 3000 }))?.[1]);
    if ((await readCoin(page)) - price >= COIN_RESERVE && (await click("Buy"))) {
      return true;
    }
    return click("Skip");
  }
  if (title === "Message") {
    return (await click(/^Pay \d+$/)) || (await click("Collect"));
  }
  if (/^You rolled/.test(title)) {
    return click("Move");
  }
  if (title === "You have picked") {
    return click("Yes");
  }
  return click("Done");
};

// A popup can close between looking at it and answering it (the other player answered, or the server moved on).
export const answerDialog = async (page: Page): Promise<boolean> => {
  try {
    return await tryAnswerDialog(page);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return false;
    }
    throw error;
  }
};

// On the card page and the Start Station the active player has to act on the page itself.
export const answerPage = async (page: Page): Promise<boolean> => {
  if ((await page.getByRole("dialog").count()) > 0) {
    return false;
  }
  const path = routePath(page.url());
  if (path.endsWith("/cards")) {
    // E7: three cards; tap one, then the "Are you sure?" and "Congratulation!" popups follow.
    await expect(page.getByTestId("upgrade-card")).toHaveCount(3);
    await expect(page.getByText("Upgrade Card", { exact: true })).toBeVisible();
    await page.getByTestId("upgrade-card").first().click();
    live.cards += 1;
    return true;
  }
  if (path.endsWith("/station")) {
    // E8: lap summary, the three tabs and the bottom bar.
    await expect(page.getByTestId("station-summary")).toContainText(/^Lap complete: \+100 coin · Level \d · Income \+\d+$/);
    for (const tab of ["Plots", "Residents", "Shop"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await page.getByRole("tab", { name: "Shop" }).click();
    await expect(page.getByRole("button", { name: /^Buy \d+$/ }).first()).toBeVisible();
    await page.getByRole("button", { name: /^(Continue moving|Done)$/ }).click();
    live.stations += 1;
    return true;
  }
  return false;
};

export const isSettled = async (active: Page): Promise<boolean> =>
  (await active.getByText("end turn!").isVisible()) &&
  routePath(active.url()).endsWith("/map") &&
  (await active.locator('.map[data-animating="false"]').count()) === 1 &&
  (await active.getByRole("dialog").count()) === 0;

// Plays the turn out until the Crown can end it and nothing else is open on the active page.
export const resolveUntilSettled = async (active: Page, other: Page): Promise<void> => {
  const deadline = Date.now() + 60_000;
  let calmSince = 0;
  while (Date.now() < deadline) {
    for (const page of [active, other]) {
      if ((await page.getByTestId("lose-face").count()) + (await page.getByTestId("win-face").count()) + (await page.getByTestId("ranking").count()) > 0) {
        throw new Error("The match ended early (a king went bankrupt), so the turn loop cannot continue");
      }
    }
    if (await isSettled(active)) {
      calmSince = calmSince || Date.now();
      if (Date.now() - calmSince > 500) {
        return;
      }
    } else {
      calmSince = 0;
    }
    const handled = (await answerDialog(active)) || (await answerDialog(other)) || (await answerPage(active));
    if (!handled) {
      await active.waitForTimeout(120);
    }
  }
  throw new Error(`The turn never settled. Active URL ${active.url()}`);
};

export const whoShakes = async (players: Player[]): Promise<Player> => {
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
      { timeout: 20_000 }
    )
    .not.toBe("");
  if (!found) {
    throw new Error("Nobody has a shaking crown");
  }
  return found;
};
