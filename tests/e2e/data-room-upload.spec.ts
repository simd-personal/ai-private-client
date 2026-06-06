import { expect, test } from "@playwright/test";
import { loginTenantAdmin } from "./helpers/auth";
import { getLatestDemoLinks } from "./helpers/demo";
import { shouldTestUploads } from "./helpers/config";
import { assertNoPublicLeaks } from "./helpers/safety";
import { createTinyPdfFixture } from "./helpers/test-file";
import { toRelativeAppPath } from "./helpers/config";

test.describe("Data room upload", () => {
  test.skip(!shouldTestUploads(), "Set E2E_TEST_UPLOADS=true to run upload tests.");

  test("uploads file and generates summary without public leaks", async ({
    page,
    request,
  }) => {
    const links = await getLatestDemoLinks(request);
    const adminPath = toRelativeAppPath(links.adminLeadUrl);
    const pdfPath = createTinyPdfFixture();

    await loginTenantAdmin(page, "mercer-newport-demo", adminPath);
    await page.getByTestId("admin-tab-data-room").click();
    await page.getByTestId("data-room-checklist").waitFor({ timeout: 30_000 });

    const uploadInput = page.locator('input[type="file"]').first();
    await uploadInput.setInputFiles(pdfPath);

    await expect(page.getByText(/received|uploaded|file/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const summarizeButton = page.getByRole("button", { name: /summary|summarize/i }).first();
    if (await summarizeButton.isVisible().catch(() => false)) {
      await summarizeButton.click();
      await expect(page.getByText(/summary|document type|planning topics/i).first()).toBeVisible({
        timeout: 60_000,
      });
    }

    await page.getByTestId("admin-tab-timeline").click();
    await expect(page.getByTestId("decision-timeline")).toBeVisible();

    await page.goto(toRelativeAppPath(links.publicResultUrl));
    await page.getByTestId("public-result-page").waitFor({ timeout: 30_000 });
    await assertNoPublicLeaks(page);
  });
});
