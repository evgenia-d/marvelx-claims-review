import { test } from "@playwright/test";

// Screenshots for design review (Slice G), not baselines: live data would make pixel diffs flaky.
// Written to e2e/screenshots/ (gitignored).
const SIZES = [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
];
const SCREENS: { name: string; path: string; ready?: RegExp }[] = [
  { name: "queue", path: "/", ready: /CLM-2026-004830/ },
  { name: "review-4809", path: "/claims/CLM-2026-004809", ready: /Repair cost/i },
  { name: "review-4817", path: "/claims/CLM-2026-004817" },
];

test.beforeEach(async ({ request }) => {
  await request.post("/api/replay/restart");
});

for (const { width, height } of SIZES) {
  for (const screen of SCREENS) {
    test(`${screen.name} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(screen.path);
      await page.getByRole("heading").first().waitFor();
      if (screen.name === "queue") await page.getByRole("link", { name: screen.ready }).waitFor();
      else if (screen.name === "review-4809") await page.getByRole("button", { name: screen.ready }).first().waitFor();
      // The live run: wait for its first field row.
      else await page.getByRole("navigation", { name: "Fields" }).getByRole("button").first().waitFor({ timeout: 5_000 });
      await page.screenshot({ path: `e2e/screenshots/${screen.name}-${width}.png` });
    });
  }
}

// An open field on a phone: top bar, cited text and the action bar.
test("review-4809 field at 375", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/claims/CLM-2026-004809");
  await page.getByRole("navigation", { name: "Fields" }).locator("li").getByRole("button").first().click();
  await page.getByRole("button", { name: "Accept", exact: true }).waitFor();
  await page.screenshot({ path: "e2e/screenshots/review-4809-field-375.png" });
});
