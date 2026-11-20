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

// Phone (375): the list is the screen; a field opens full screen and back returns to the list.
test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  const fieldParam = (url: string) => new URL(url).searchParams.get("field");

  test("the list is the screen; a row opens the field, next moves on and back returns to that row", async ({ page }) => {
    await page.goto("/claims/CLM-2026-004809");
    const rows = page.getByRole("navigation", { name: "Fields" }).locator("li").getByRole("button");
    await expect(rows.first()).toBeVisible();
    expect(fieldParam(page.url())).toBeNull();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);

    await rows.first().click();
    await expect(page.getByRole("button", { name: "Back to fields" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Fields" })).toBeHidden();
    const first = fieldParam(page.url());
    expect(first).not.toBeNull();
    await expect(page.getByText(/ · 1 of \d+$/)).toBeVisible();

    await page.getByRole("button", { name: "Next field" }).click();
    await expect(page.getByText(/ · 2 of \d+$/)).toBeVisible();
    expect(fieldParam(page.url())).not.toBe(first);

    // Next replaces the entry, so one back is the list, with the row just viewed focused.
    await page.getByRole("button", { name: "Back to fields" }).click();
    await expect(page.getByRole("navigation", { name: "Fields" })).toBeVisible();
    expect(fieldParam(page.url())).toBeNull();
    await expect(rows.nth(1)).toBeFocused();
  });

  test("deciding a field opens the next undecided one", async ({ page }) => {
    await page.goto("/claims/CLM-2026-004809");
    await page.getByRole("navigation", { name: "Fields" }).locator("li").getByRole("button").first().click();
    const first = fieldParam(page.url());
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await expect.poll(() => fieldParam(page.url())).not.toBe(first);
    await expect(page.getByRole("heading", { level: 2 })).toBeFocused();
  });

  test("back returns focus to the filter when no field is shown any more", async ({ page }) => {
    await page.goto("/claims/CLM-2026-004809");
    const filter = page.getByRole("group", { name: "Show fields" });
    await filter.getByRole("button", { name: /^To review/ }).click();
    await page.getByRole("navigation", { name: "Fields" }).locator("li").getByRole("button").first().click();
    // Decide every field: each save opens the next undecided one, the last stays open.
    for (let i = 0; i < 6; i++) {
      const before = fieldParam(page.url());
      await page.getByRole("button", { name: "Accept", exact: true }).click();
      await expect.poll(() => fieldParam(page.url())).not.toBe(before);
    }
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await expect(page.getByRole("button", { name: "Accept", exact: true })).toHaveAttribute("aria-disabled", "true");

    await page.getByRole("button", { name: "Back to fields" }).click();
    await expect(page.getByText("Every field has a decision.")).toBeVisible();
    await expect(filter.getByRole("button", { pressed: true })).toBeFocused();
  });
});
