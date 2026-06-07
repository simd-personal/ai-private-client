import type { RunLeadGenerationPipelineInput } from "@/lib/ai/runLeadGenerationPipeline";

function workerSecret(): string | undefined {
  return (
    process.env.INTERNAL_GENERATION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    undefined
  );
}

function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

function shouldUseHttpWorker(): boolean {
  if (process.env.USE_GENERATION_HTTP_WORKER === "true") return true;
  return process.env.VERCEL === "1";
}

export async function triggerLeadGenerationWorker(
  input: RunLeadGenerationPipelineInput
): Promise<void> {
  if (!shouldUseHttpWorker()) {
    const { runLeadGenerationPipeline } = await import(
      "@/lib/ai/runLeadGenerationPipeline"
    );
    await runLeadGenerationPipeline(input);
    return;
  }

  const secret = workerSecret();
  if (!secret) {
    console.error(
      "[generation-scheduler] INTERNAL_GENERATION_SECRET is required on Vercel"
    );
    return;
  }

  const response = await fetch(`${siteOrigin()}/api/internal/lead-generation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Generation worker failed (${response.status}): ${body.slice(0, 200)}`
    );
  }
}

export function scheduleLeadGenerationWorker(
  input: RunLeadGenerationPipelineInput
): void {
  void triggerLeadGenerationWorker(input).catch((error) => {
    console.error("[generation-scheduler] background error:", error);
  });
}
