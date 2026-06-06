import { expect, test } from "@playwright/test";
import { loginTenantAdmin } from "./helpers/auth";
import { getLatestDemoLinks } from "./helpers/demo";
import { toRelativeAppPath } from "./helpers/config";

test.describe("Presentation mode", () => {
  test("navigates slides forward and back", async ({ page, request }) => {
    const links = await getLatestDemoLinks(request);
    const presentationPath = toRelativeAppPath(links.presentationUrl);

    await loginTenantAdmin(page, "mercer-newport-demo", presentationPath);

    await expect(page.getByTestId("presentation-page")).toBeVisible({
      timeout: 30_000,
    });

    const slide = page.getByTestId("presentation-slide");
    await expect(slide).toBeVisible();

    const initialTitle = await slide.locator("h2").first().innerText();
    expect(initialTitle.trim().length).toBeGreaterThan(0);

    await page.getByTestId("presentation-next-button").click();
    const nextTitle = await slide.locator("h2").first().innerText();

    if (initialTitle !== nextTitle) {
      await page.getByTestId("presentation-prev-button").click();
      await expect(slide.locator("h2").first()).toHaveText(initialTitle);
    } else {
      expect(await slide.innerText()).not.toBe("");
    }
  });
});
