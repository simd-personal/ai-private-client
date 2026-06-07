/**
 * Local async lead generation smoke test.
 *
 * Usage:
 *   npm run dev   # in another terminal
 *   npx tsx scripts/test-async-generation.ts
 */

import dotenv from "dotenv";
import type { PublicGenerationStatus } from "../src/lib/schemas/lead-generation";

dotenv.config({ path: ".env.local" });
dotenv.config();

const baseUrl = (process.env.TEST_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

const buyerPayload = {
  leadType: "buyer",
  desiredLocations: ["Irvine"],
  budgetRange: "1500000 to 2500000",
  propertyType: "townhome",
  lifestylePriorities: ["walkability", "new construction", "commute"],
  timeline: "3 to 6 months",
  financingStatus: "talking to lender",
  freeText: "Local async generation test",
  contact: {
    firstName: "Async",
    lastName: "Test",
    email: `async-test-${Date.now()}@example.com`,
    phone: "9495550100",
    preferredContactMethod: "email",
    consentGiven: true,
  },
  honeypot: "",
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStatus(token: string): Promise<PublicGenerationStatus> {
  const res = await fetch(`${baseUrl}/api/leads/result/${token}/status`);
  if (!res.ok) {
    throw new Error(`Status ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<PublicGenerationStatus>;
}

async function main() {
  console.log(`\n── Async generation test (${baseUrl}) ──\n`);

  const submit = await fetch(`${baseUrl}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buyerPayload),
  });

  const body = (await submit.json()) as {
    token?: string;
    resultUrl?: string;
    generationStatus?: string;
    error?: string;
  };

  if (!submit.ok || !body.token) {
    console.error("Submit failed:", submit.status, body);
    process.exit(1);
  }

  console.log("Submitted:", {
    token: `${body.token.slice(0, 8)}…`,
    generationStatus: body.generationStatus,
    resultUrl: body.resultUrl,
  });

  const started = Date.now();
  let last: PublicGenerationStatus | null = null;

  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(attempt === 0 ? 2000 : 5000);
    last = await fetchStatus(body.token);
    const elapsed = Math.round((Date.now() - started) / 1000);

    console.log(
      `[${elapsed}s] status=${last.generationStatus} base=${last.baseReportStatus} strategy=${last.strategyRoomStatus} decision=${last.decisionLayerStatus} public=${last.percentForPublicView}% label="${last.currentPublicStageLabel}"`
    );

    if (last.generationStatus === "complete" || last.isReady) {
      console.log("\nPASS: generation completed");
      return;
    }

    if (last.generationStatus === "failed") {
      console.error("\nFAIL: generation failed");
      process.exit(1);
    }

    if (
      last.baseReportStatus === "ready" &&
      last.strategyRoomStatus === "ready"
    ) {
      console.log("\nPASS: core sections ready");
      return;
    }
  }

  console.error("\nFAIL: timed out waiting for generation");
  console.error("Last status:", JSON.stringify(last, null, 2));
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
