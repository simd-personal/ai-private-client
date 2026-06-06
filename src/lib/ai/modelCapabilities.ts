/**
 * OpenAI model capability checks for report generation.
 * GPT-5 family models reject non-default temperature values.
 */

function normalizeModelId(model: string): string {
  return model.trim().toLowerCase();
}

export function isGpt5FamilyModel(model: string): boolean {
  const id = normalizeModelId(model);
  return id.startsWith("gpt-5") || id.includes("gpt-5.5") || id.includes("gpt-5.4");
}

/**
 * Returns false for GPT-5 / GPT-5.5 / GPT-5.4 models (temperature must be omitted).
 * Returns true for older chat models that accept custom temperature.
 */
export function supportsTemperature(model: string): boolean {
  return !isGpt5FamilyModel(model);
}
