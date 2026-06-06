const ENABLED = process.env.DEBUG_GENERATION_TIMING === "true";

export function logGenerationTiming(
  label: string,
  meta?: Record<string, string | number | boolean | null | undefined>
): void {
  if (!ENABLED) return;
  const safe: Record<string, string | number | boolean> = { label };
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      if (value == null) continue;
      if (typeof value === "string" && value.length > 120) continue;
      safe[key] = value;
    }
  }
  console.info("[generation-timing]", safe);
}

export async function timeGenerationStage<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!ENABLED) return fn();
  const start = Date.now();
  try {
    return await fn();
  } finally {
    logGenerationTiming(label, { durationMs: Date.now() - start });
  }
}
