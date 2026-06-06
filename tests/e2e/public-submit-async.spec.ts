import { expect, test } from "@playwright/test";
import { shouldCreateLeads } from "./helpers/config";

test.describe("Public async submit", () => {
  test.skip(!shouldCreateLeads(), "Set E2E_CREATE_LEADS=true to run intake submit tests.");

  test("submits equity intake and shows progressive result", async ({ page }) => {
    await page.goto("/a/mercer-newport-demo/equity");

    await page.getByLabel(/first name/i).fill("E2E");
    await page.getByLabel(/last name/i).fill("Test");
    await page.getByLabel(/email/i).fill(`e2e-${Date.now()}@example.com`);

    const street = page.getByLabel(/street/i).first();
    if (await street.isVisible().catch(() => false)) {
      await street.fill("123 Test Lane");
    }

    const submit = page.getByRole("button", { name: /submit|get my|private brief/i }).first();
    await submit.click();

    await page.waitForURL(/\/result\?token=/, { timeout: 15_000 });
    await expect(page.getByTestId("public-result-page")).toBeVisible({
      timeout: 15_000,
    });

    const progress = page.getByTestId("result-generation-progress");
    const hasProgress = await progress.isVisible().catch(() => false);
    if (hasProgress) {
      await expect(progress).toBeVisible();
    }

    await expect(page.locator("body")).not.toContainText(/internal error|application error/i);

    await expect
      .poll(
        async () => {
          const text = await page.locator("body").innerText();
          return (
            text.includes("Private Strategy Room") ||
            text.includes("Strategy Room") ||
            text.includes("Your Private Plan")
          );
        },
        { timeout: 120_000 }
      )
      .toBeTruthy();
  });
});
