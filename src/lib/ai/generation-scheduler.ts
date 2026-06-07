import type { RunLeadGenerationPipelineInput } from "@/lib/ai/runLeadGenerationPipeline";

function workerSecret(): string | undefined {
  return (
    process.env.INTERNAL_GENERATION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    undefined
  );
}

function vercelBypassSecret(): string | undefined {
  return (
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ||
    process.env.E2E_VERCEL_BYPASS_SECRET?.trim() ||
    undefined
  );
}

function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (process.env.VERCEL === "1") {
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  }
  if (explicit) return explicit.replace(/\/$/, "");
  return "http://localhost:3000";
}

function shouldUseHttpWorker(): boolean {
  if (process.env.USE_GENERATION_HTTP_WORKER === "true") return true;
  return process.env.VERCEL === "1";
}

async function runPipelineInline(
  input: RunLeadGenerationPipelineInput,
  reason: string
): Promise<void> {
  console.warn(`[generation-scheduler] running inline: ${reason}`);
  const { runLeadGenerationPipeline } = await import(
    "@/lib/ai/runLeadGenerationPipeline"
  );
  await runLeadGenerationPipeline(input);
}

export async function triggerLeadGenerationWorker(
  input: RunLeadGenerationPipelineInput
): Promise<void> {
  if (!shouldUseHttpWorker()) {
    await runPipelineInline(input, "local dev");
    return;
  }

  const secret = workerSecret();
  if (!secret) {
    await runPipelineInline(input, "INTERNAL_GENERATION_SECRET missing");
    return;
  }

  const bypass = vercelBypassSecret();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  };
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
  }

  try {
    const response = await fetch(`${siteOrigin()}/api/internal/lead-generation`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Generation worker failed (${response.status}): ${body.slice(0, 200)}`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "worker fetch failed";
    await runPipelineInline(input, message);
  }
}

export function scheduleLeadGenerationWorker(
  input: RunLeadGenerationPipelineInput
): void {
  void triggerLeadGenerationWorker(input).catch((error) => {
    console.error("[generation-scheduler] background error:", error);
  });
}
