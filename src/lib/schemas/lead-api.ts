import { z } from "zod";
import { attributionSchema } from "@/lib/schemas/attribution";
import { testLeadMetadataSchema } from "@/lib/schemas/test-lead-metadata";
import {
  buyerQuizSchema,
  equityQuizBaseSchema,
  sellerQuizSchema,
  wealthForecastQuizSchema,
  withEquityHomeCity,
} from "@/lib/schemas/quiz";

const submissionMeta = {
  honeypot: z.string().optional(),
  tenantSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  attribution: attributionSchema.optional(),
  testMetadata: testLeadMetadataSchema.optional(),
  sessionId: z.string().min(8).max(64).optional(),
};

export const buyerLeadRequestSchema = buyerQuizSchema.extend(submissionMeta);
export const sellerLeadRequestSchema = sellerQuizSchema.extend(submissionMeta);
export const equityLeadRequestSchema = equityQuizBaseSchema
  .extend(submissionMeta)
  .transform(withEquityHomeCity);
export const wealthForecastLeadRequestSchema =
  wealthForecastQuizSchema.extend(submissionMeta);

export const leadApiRequestSchema = z.discriminatedUnion("leadType", [
  buyerLeadRequestSchema,
  sellerLeadRequestSchema,
  equityLeadRequestSchema,
  wealthForecastLeadRequestSchema,
]);

export type LeadApiRequest = z.infer<typeof leadApiRequestSchema>;

export function isHoneypotTriggered(honeypot?: string): boolean {
  return Boolean(honeypot?.trim());
}
