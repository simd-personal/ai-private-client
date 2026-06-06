import { NextResponse } from "next/server";
import { z } from "zod";
import { buildIntakeContext, intakeContextFromPrivateClientDemo } from "@/lib/ai/intake-context";
import { generateStrategyRoom } from "@/lib/ai/generateStrategyRoom";
import {
  buyerQuizSchema,
  equityQuizSchema,
  sellerQuizSchema,
  wealthForecastQuizSchema,
} from "@/lib/schemas/quiz";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

const privateClientDemoSchema = z.object({
  leadType: z.literal("private_client_demo"),
  intake: z.record(z.string(), z.unknown()).optional(),
});

const generateBriefSchema = z.union([
  buyerQuizSchema,
  sellerQuizSchema,
  equityQuizSchema,
  wealthForecastQuizSchema,
  privateClientDemoSchema,
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateBriefSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const resolvedTenant = await resolveTenantFromRequest(request);
    const tenant = resolvedTenant.tenant;

    let ctx;
    if (
      parsed.data.leadType === "private_client_demo" ||
      ("intake" in parsed.data && !("contact" in parsed.data))
    ) {
      const demoData =
        "intake" in parsed.data && parsed.data.intake
          ? parsed.data.intake
          : parsed.data;
      ctx = intakeContextFromPrivateClientDemo(
        demoData as Record<string, unknown>
      );
    } else {
      ctx = buildIntakeContext(parsed.data.leadType, parsed.data);
    }

    const result = await generateStrategyRoom(ctx, tenant);

    return NextResponse.json({
      output: result.output,
      source: result.source,
      model: result.model,
      fallbackModelAttempted: result.fallbackModelAttempted,
    });
  } catch (error) {
    console.error("[brief/generate] error:", error);
    return NextResponse.json(
      { error: "Failed to generate brief" },
      { status: 500 }
    );
  }
}
