import { expect, test } from "@playwright/test";
import { loginTenantAdmin } from "./helpers/auth";
import { getLatestDemoLinks } from "./helpers/demo";
import { toRelativeAppPath } from "./helpers/config";

const CORE_TABS = [
  "admin-tab-strategy-room",
  "admin-tab-decision-graph",
  "admin-tab-data-room",
  "admin-tab-guardrails",
  "admin-tab-timeline",
  "admin-tab-meeting-copilot",
  "admin-tab-presentation",
] as const;

test.describe("Admin lead tabs", () => {
  test("core AI tabs render content", async ({ page, request }) => {
    const links = await getLatestDemoLinks(request);
    const adminPath = toRelativeAppPath(links.adminLeadUrl);

    await loginTenantAdmin(page, "mercer-newport-demo", adminPath);
    await expect(page.getByTestId("admin-lead-page")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("admin-ai-tabs")).toBeVisible();

    const actionBoardTab = page.getByTestId("admin-tab-action-board");
    if (await actionBoardTab.isVisible().catch(() => false)) {
      await actionBoardTab.click();
      await expect(page.getByTestId("admin-tab-content")).not.toBeEmpty();
    }

    for (const tabId of CORE_TABS) {
      const tab = page.getByTestId(tabId);
      await expect(tab).toBeVisible();
      await tab.click();
      const content = page.getByTestId("admin-tab-content");
      await expect(content).toBeVisible();
      await expect(content).not.toBeEmpty();
    }
  });
});
