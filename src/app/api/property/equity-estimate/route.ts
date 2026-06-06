import { NextResponse } from "next/server";
import { z } from "zod";
import {
  enrichEquityProperty,
  toPublicEquityEstimateResponse,
} from "@/lib/property/enrichEquityProperty";
import { getClientIp, isRateLimited } from "@/lib/spam/rate-limit";

const equityEstimateRequestSchema = z.object({
  address: z.string().min(3),
  city: z.string().min(1).optional(),
  state: z.string().min(2).optional(),
  zip: z.string().min(5).optional(),
  squareFeet: z.number().positive().optional(),
  yearPurchased: z.number().int().min(1950).optional(),
  originalPurchasePrice: z.number().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip, "leads")) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = equityEstimateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const apiKeysConfigured = Boolean(
      process.env.RENTCAST_API_KEY?.trim() ||
        process.env.GOOGLE_MAPS_API_KEY?.trim()
    );

    if (!process.env.RENTCAST_API_KEY?.trim()) {
      return NextResponse.json(
        toPublicEquityEstimateResponse(
          {
            normalizedAddress: parsed.data.address,
            addressConfidence: "high",
            comparableCount: 0,
            compsSummary: [],
            rentCastFacts: null,
            googleAddressContext: null,
            dataSources: [],
            missingDataQuestions: [
              "Estimate the home's current market range with the homeowner before modeling net proceeds.",
            ],
            estimationConfidence: "unavailable",
          },
          { apiKeysConfigured: false }
        )
      );
    }

    const intelligence = await enrichEquityProperty(parsed.data);

    return NextResponse.json(
      toPublicEquityEstimateResponse(intelligence, { apiKeysConfigured })
    );
  } catch (error) {
    console.error("[equity-estimate] error:", error);
    return NextResponse.json({
      available: false,
      estimationConfidence: "unavailable",
      dataSources: [],
      message:
        "We could not find a reliable automated estimate. You can enter your best guess, or leave this blank for advisor review.",
    });
  }
}
