import { expect, test } from "@playwright/test";
import { getLatestDemoLinks } from "./helpers/demo";
import { assertNoPublicLeaks } from "./helpers/safety";
import { toRelativeAppPath } from "./helpers/config";

test.describe("Public safety", () => {
  test("Mercer public result has no forbidden leaks", async ({ page, request }) => {
    const links = await getLatestDemoLinks(request);

    await page.goto(toRelativeAppPath(links.publicResultUrl));
    await expect(page.getByTestId("public-result-page")).toBeVisible({
      timeout: 30_000,
    });

    await assertNoPublicLeaks(page);
    await expect(page.getByTestId("public-disclaimer")).toBeVisible();

    const decisionMap = page.getByTestId("decision-map-section");
    if (await decisionMap.isVisible().catch(() => false)) {
      await expect(decisionMap.locator("svg circle")).toHaveCount(0);
    }

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\{\s*"leadType"\s*:/);
    expect(bodyText).not.toMatch(/\{\s*"report"\s*:\s*\{/);
  });
});
