import { mkdirSync } from "fs";
import { join } from "path";
import { test } from "@playwright/test";
import { loginPlatform, loginTenantAdmin } from "./helpers/auth";
import { getLatestDemoLinks } from "./helpers/demo";
import { toRelativeAppPath } from "./helpers/config";

const OUTPUT_DIR = join(process.cwd(), "test-results", "visual-smoke");

test.describe("Visual smoke captures", () => {
  test("capture key screens for manual review", async ({ page, request }) => {
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const capture = async (name: string) => {
      await page.screenshot({
        path: join(OUTPUT_DIR, name),
        fullPage: true,
      });
    };

    await page.goto("/");
    await capture("01-landing.png");

    await page.goto("/a/mercer-newport-demo");
    await capture("02-tenant-landing.png");

    const links = await getLatestDemoLinks(request);

    await page.goto(toRelativeAppPath(links.publicResultUrl));
    await page.getByTestId("public-result-page").waitFor({ timeout: 30_000 });
    await capture("03-public-result.png");

    const decisionMap = page.getByTestId("decision-map-section");
    if (await decisionMap.isVisible().catch(() => false)) {
      await decisionMap.scrollIntoViewIfNeeded();
      await capture("04-decision-map.png");
    }

    await loginTenantAdmin(
      page,
      "mercer-newport-demo",
      toRelativeAppPath(links.adminLeadUrl)
    );
    await page.getByTestId("admin-lead-page").waitFor({ timeout: 30_000 });
    await capture("05-admin-lead.png");

    await page.getByTestId("admin-tab-data-room").click();
    await page.getByTestId("admin-tab-content").waitFor();
    await capture("06-data-room.png");

    await page.goto(toRelativeAppPath(links.presentationUrl));
    await loginTenantAdmin(
      page,
      "mercer-newport-demo",
      toRelativeAppPath(links.presentationUrl)
    );
    await page.getByTestId("presentation-page").waitFor({ timeout: 30_000 });
    await capture("07-presentation.png");

    await loginPlatform(page);
    await capture("08-platform-demo.png");
  });
});
