import { expect, test } from "@playwright/test";

// 4809 is already complete when the replay starts; 4817 starts at 0 s and runs for about 100 s,
// so these tests only watch its first seconds. Every test starts from a fresh replay.
test.beforeEach(async ({ request }) => {
  const res = await request.post("/api/replay/restart");
  expect(res.status()).toBe(204);
});

test("queue lists four claims and 4809 needs review", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Claims queue" })).toBeVisible();
  await expect(page.getByText("4 claims")).toBeVisible();
  const links = page.getByRole("link", { name: /^CLM-2026-/ });
  await expect(links).toHaveCount(4);
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: /CLM-2026-004809/ }) });
  await expect(row.getByText("Needs review")).toBeVisible();
});

test("an invalid status filter shows the message and a way back", async ({ page }) => {
  await page.goto("/?status=done");
  await expect(page.getByRole("heading", { name: "That filter doesn't exist" })).toBeVisible();
  await page.getByRole("button", { name: "Show all claims" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: /^CLM-2026-/ })).toHaveCount(4);
});

test("back from a claim keeps the status filter", async ({ page }) => {
  await page.goto("/?status=needs_review");
  await page.getByRole("link", { name: /CLM-2026-004809/ }).click();
  await expect(page).toHaveURL(/\/claims\/CLM-2026-004809/);
  await page.getByRole("button", { name: "Back to queue" }).click();
  await expect(page).toHaveURL("/?status=needs_review");
});

test("accepting a field on 4809 survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /CLM-2026-004809/ }).click();
  await expect(page).toHaveURL(/\/claims\/CLM-2026-004809/);
  const field = page.getByRole("button", { name: /Repair cost/i }).first();
  await field.click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  // The screen moves on to the next undecided field after a save, so open the field again.
  await field.click();
  await expect(page.getByText(/You · accepted/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Repair cost/i }).first().click();
  await expect(page.getByText(/You · accepted/)).toBeVisible();
});

test("fields of 4817 arrive while the run is live", async ({ page }) => {
  await page.goto("/claims/CLM-2026-004817");
  await expect(page.getByRole("heading", { name: "CLM-2026-004817" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Fields" }).getByRole("button").first()).toBeVisible({ timeout: 5_000 });
});

test("unknown claim shows Claim not found", async ({ page }) => {
  await page.goto("/claims/CLM-2026-000000");
  await expect(page.getByRole("heading", { name: "Claim not found" })).toBeVisible();
  // The header bar has a back icon of the same name; the message's button is in <main>.
  await page.getByRole("main").getByRole("button", { name: "Back to queue" }).click();
  await expect(page).toHaveURL("/");
});

test("an empty filter result shows No claims match and a way back", async ({ page }) => {
  // Nothing is reviewed right after a restart.
  await page.goto("/?status=reviewed");
  await expect(page.getByRole("heading", { name: "No claims match" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filter" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: /^CLM-2026-/ })).toHaveCount(4);
});

test("the queue says when the server can't be reached", async ({ page }) => {
  await page.route("**/api/queue**", (route) => route.fulfill({ status: 502, body: "" }));
  await page.goto("/");
  // Two query retries come first.
  await expect(page.getByRole("heading", { name: "Can't reach the server" })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText("Live")).toHaveCount(0);
  await page.unroute("**/api/queue**");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("link", { name: /^CLM-2026-/ })).toHaveCount(4);
});
