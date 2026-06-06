import { expect, type Page } from "@playwright/test";

export const FORBIDDEN_PUBLIC_TERMS = [
  "readinessScore",
  "lead score",
  "leadScore",
  "lead_score",
  "internalLeadSummary",
  "suggestedFollowUpMessage",
  "leadConcierge",
  "leadPriorityReason",
  "adminOnlyNote",
  "adminSummary",
  "CRM notes",
  "meeting notes",
  "meeting_notes",
  "storage_path",
  "signedUrl",
  "downloadUrl",
  "ai_document_summary",
  "file_name",
  "file_mime_type",
  "generation_error",
  "generation_progress",
  "advisor-only",
  "quiz_data",
  "leadConcierge",
  "complianceGuardrails",
  "ai_compliance_guardrails",
  "private-client-data-room",
] as const;

export function assertNoPublicLeaksInText(text: string): void {
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_PUBLIC_TERMS) {
    expect(lower, `Forbidden public term leaked: ${term}`).not.toContain(
      term.toLowerCase()
    );
  }

  expect(text).not.toMatch(/"leadType"\s*:/);
  expect(text).not.toMatch(/"quiz_data"\s*:/);
}

export async function assertNoPublicLeaks(page: Page): Promise<void> {
  const bodyText = await page.locator("body").innerText();
  const html = await page.content();
  assertNoPublicLeaksInText(bodyText);
  assertNoPublicLeaksInText(html);
}
