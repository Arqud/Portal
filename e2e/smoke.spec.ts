import { expect, test } from "@playwright/test";

test("home page renders the ARQUD wordmark and brand probe", async ({
  page,
}) => {
  await page.goto("/");

  // Wordmark in the nav
  await expect(page.locator("nav").getByText("ARQUD")).toBeVisible();

  // Brand-probe heading
  await expect(
    page.getByRole("heading", { name: /ARQUD Portal/i }),
  ).toBeVisible();

  // Body background is some explicit colour (not transparent)
  const bg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(bg).toMatch(/^rgb/);
});
