import { expect, test } from "@playwright/test";
import { loginPlatform, loginTenantAdmin } from "./helpers/auth";
import {
  assertProductionReachable,
  getLatestDemoLinks,
  getMercerDemoStatus,
} from "./helpers/demo";
import { toRelativeAppPath } from "./helpers/config";

test.describe("Production smoke", () => {
  test("landing, tenant, platform demo, public result, admin, presentation", async ({
    page,
    request,
  }) => {
    const landing = await request.get("/");
    assertProductionReachable(landing.status());
    expect(landing.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.locator("body")).toContainText(/private client|property desk/i);

    await page.goto("/a/mercer-newport-demo");
    await expect(page.locator("body")).toBeVisible();

    await loginPlatform(page);
    await expect(page.getByTestId("platform-demo-page")).toBeVisible();

    const demoStatus = await getMercerDemoStatus(request);
    if (!demoStatus?.leadId) {
      throw new Error(
        "No Mercer demo lead found. Run npm run demo:mercer against production env or set E2E_RESET_DEMO=true."
      );
    }

    const links = await getLatestDemoLinks(request);

    await page.goto(toRelativeAppPath(links.publicResultUrl));
    await expect(page.getByTestId("public-result-page")).toBeVisible();
    await expect(page.locator("body")).toContainText(
      /Private Strategy Room|Strategy Room/i
    );
    await expect(page.locator("body")).toContainText(/Scenario Comparison/i);
    await expect(page.locator("body")).toContainText(/Decision Map/i);
    await expect(page.locator("body")).toContainText(/Items to Clarify/i);
    await expect(page.getByTestId("public-disclaimer")).toBeVisible();

    const decisionMap = page.getByTestId("decision-map-section");
    if (await decisionMap.isVisible().catch(() => false)) {
      await expect(decisionMap.locator("svg circle")).toHaveCount(0);
      await expect(decisionMap).not.toContainText(/Sim Dhillon/i);
    }

    await loginTenantAdmin(
      page,
      "mercer-newport-demo",
      toRelativeAppPath(links.adminLeadUrl)
    );
    await expect(page.getByTestId("admin-lead-page")).toBeVisible();

    await page.goto(toRelativeAppPath(links.presentationUrl));
    await loginTenantAdmin(
      page,
      "mercer-newport-demo",
      toRelativeAppPath(links.presentationUrl),
      "presentation-page"
    );
    await expect(page.getByTestId("presentation-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("presentation-slide")).toBeVisible();
  });
});
