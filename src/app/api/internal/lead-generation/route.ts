import { NextResponse } from "next/server";
import {
  runLeadGenerationPipeline,
  type RunLeadGenerationPipelineInput,
} from "@/lib/ai/runLeadGenerationPipeline";
import type { TenantConfig } from "@/lib/tenants/tenant-config";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function verifyInternalGeneration(request: Request): boolean {
  const secret =
    process.env.INTERNAL_GENERATION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!verifyInternalGeneration(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as RunLeadGenerationPipelineInput & {
      tenant?: TenantConfig;
    };

    if (!body.leadId || !body.tenant) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await runLeadGenerationPipeline(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[internal/lead-generation]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
