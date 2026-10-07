import { devices, expect } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";

// Same ports and env switches as lobby.spec.ts: e2e can run next to another project that owns 5173 / 8000.
export const webPort = process.env.E2E_WEB_PORT ?? "5173";
export const baseURL = `http://127.0.0.1:${webPort}`;

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
