import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const watchErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  return errors;
};

const getEntryHrefs = async (page: Page): Promise<string[]> => {
  await page.goto("/dev/gallery");
  const links = page.getByTestId("gallery-link");
  await expect(links.first()).toBeVisible();
  return links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
};

const hasHorizontalOverflow = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const element = document.scrollingElement ?? document.documentElement;
    return element.scrollWidth > element.clientWidth;
  });

const holdCrown = async (page: Page, name: RegExp, ms: number): Promise<void> => {
  const box = await page.getByRole("button", { name }).boundingBox();
  if (!box) {
    throw new Error("Crown button has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
};

test.describe("gallery", () => {
  test("index lists every entry without errors", async ({ page }) => {
    const errors = watchErrors(page);
    const hrefs = await getEntryHrefs(page);
    expect(hrefs.length).toBeGreaterThanOrEqual(20);
    expect(errors).toEqual([]);
  });

  test("every entry renders without errors or horizontal overflow", async ({ page }) => {
    const errors = watchErrors(page);
    const hrefs = await getEntryHrefs(page);
    for (const href of hrefs) {
      await page.goto(href);
      await expect(page.locator("[data-gallery-entry]"), href).toBeVisible();
      expect(await hasHorizontalOverflow(page), `overflow on ${href}`).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test("long-press entry separates tap from hold", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/long-press");
    const output = page.getByTestId("gallery-last-action");
    await page.getByRole("button", { name: "Long press demo" }).click();
    await expect(output).toHaveText("press");
    await holdCrown(page, /Long press demo/, 800);
    await expect(output).toHaveText("longPress");
    expect(errors).toEqual([]);
  });

  test("shaking crown logs a long press when held", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/shell-shaking");
    await holdCrown(page, /Crown: hold to take your turn/, 800);
    await expect(page.getByTestId("gallery-last-action")).toHaveText("longPress");
    expect(errors).toEqual([]);
  });

  test("confirm dialog logs the chosen action", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/gallery/dialog-confirm");
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(page.getByTestId("gallery-last-action")).toHaveText("Yes");
    expect(errors).toEqual([]);
  });

  test("index has no horizontal overflow at 320px", async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/dev/gallery");
    await expect(page.getByTestId("gallery-link").first()).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    for (const id of ["shell-active", "shell-with-dialog", "data-table", "crown-states"]) {
      await page.goto(`/dev/gallery/${id}`);
      await expect(page.locator("[data-gallery-entry]")).toBeVisible();
      expect(await hasHorizontalOverflow(page), `overflow on ${id} at 320px`).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test("saves reference screenshots", async ({ page }) => {
    for (const id of ["shell-active", "shell-with-dialog", "data-table"]) {
      await page.goto(`/dev/gallery/${id}`);
      await expect(page.locator("[data-gallery-entry]")).toBeVisible();
      await page.screenshot({ path: `test-results/ui/screens/${id}.png` });
    }
  });
});
