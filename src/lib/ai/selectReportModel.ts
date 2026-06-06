/**
 * Production behavior always tries the premium model first.
 * The mini model is backup only. Deterministic fallback is used
 * only if both OpenAI model calls fail.
 *
 * Deprecated env vars (ignored for routing, used only as mini backup fallbacks):
 * OPENAI_DEFAULT_MODEL, OPENAI_FALLBACK_MODEL, USE_PREMIUM_MODEL_FOR_HOT_LEADS
 */

export const DETERMINISTIC_FALLBACK_MODEL = "deterministic-fallback";

export function getPremiumReportModel(): string {
  return process.env.OPENAI_PREMIUM_MODEL ?? "gpt-5.5";
}

export function getMiniBackupReportModel(): string {
  return (
    process.env.OPENAI_MINI_BACKUP_MODEL ??
    process.env.OPENAI_DEFAULT_MODEL ??
    process.env.OPENAI_FALLBACK_MODEL ??
    "gpt-5.4-mini"
  );
}

export function getReportModelOrder(): [string, string] {
  return [getPremiumReportModel(), getMiniBackupReportModel()];
}
