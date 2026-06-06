import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { getAdminPassword, getPlatformPassword } from "./config";

const ADMIN_TOKEN_KEY = "private_client_admin_token";
const PLATFORM_TOKEN_KEY = "private_client_platform_admin_token";

async function submitPasswordForm(page: Page, password: string): Promise<boolean> {
  const input = page.getByPlaceholder("Admin password");
  const visible = await input.isVisible().catch(() => false);
  if (!visible) return false;

  await input.fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  return true;
}

async function setTokenAndReload(
  page: Page,
  storageKey: string,
  token: string,
  path: string
): Promise<void> {
  await page.goto(path);
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: storageKey, value: token }
  );
  await page.reload();
}

export async function loginPlatform(page: Page): Promise<void> {
  const password = getPlatformPassword();
  if (!password) {
    throw new Error(
      "E2E_PLATFORM_ADMIN_PASSWORD, PLATFORM_ADMIN_PASSWORD, or (local only) ADMIN_PASSWORD is required."
    );
  }

  await page.goto("/platform/demo");

  const usedForm = await submitPasswordForm(page, password);
  if (!usedForm) {
    await setTokenAndReload(page, PLATFORM_TOKEN_KEY, password, "/platform/demo");
  } else {
    await expect(page.getByPlaceholder("Admin password")).toBeHidden({
      timeout: 20_000,
    });
  }

  await page.getByTestId("platform-demo-page").waitFor({ timeout: 20_000 });
}

export async function loginTenantAdmin(
  page: Page,
  tenantSlug = "mercer-newport-demo",
  adminPath?: string,
  successTestId = "admin-lead-page"
): Promise<void> {
  const password = getAdminPassword();
  if (!password) {
    throw new Error("E2E_ADMIN_PASSWORD or ADMIN_PASSWORD is required.");
  }

  const targetPath = adminPath ?? `/a/${tenantSlug}/admin`;

  await page.goto(targetPath);

  const usedForm = await submitPasswordForm(page, password);
  if (!usedForm) {
    await setTokenAndReload(page, ADMIN_TOKEN_KEY, password, targetPath);
  } else {
    await expect(page.getByPlaceholder("Admin password")).toBeHidden({
      timeout: 20_000,
    });
  }

  await page
    .getByTestId(successTestId)
    .or(page.getByRole("heading", { name: /leads dashboard|lead detail/i }))
    .first()
    .waitFor({ timeout: 20_000 });
}
