import { z } from "zod";

export const testLeadMetadataSchema = z.object({
  isTestLead: z.literal(true),
  testSeededAt: z.string().min(1),
  testSource: z.string().min(1),
  suppressNotifications: z.boolean().optional(),
});

export type TestLeadMetadata = z.infer<typeof testLeadMetadataSchema>;

export function shouldSuppressTestNotifications(
  metadata?: TestLeadMetadata
): boolean {
  return Boolean(metadata?.isTestLead && metadata.suppressNotifications);
}

export function withTestLeadQuizDataMarkers<T extends Record<string, unknown>>(
  quizData: T,
  metadata?: TestLeadMetadata
): T {
  if (!metadata?.isTestLead) return quizData;

  return {
    ...quizData,
    isTestLead: true,
    testSeededAt: metadata.testSeededAt,
    testSource: metadata.testSource,
  };
}
