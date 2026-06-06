import { z } from "zod";

export const fastPublicBriefSchema = z.object({
  reportTitle: z.string(),
  executiveSummary: z.string(),
  clientObjective: z.string(),
  knownFacts: z.array(z.string()),
  itemsToClarify: z.array(z.string()),
  advisorReviewTopics: z.array(z.string()),
  recommendedNextStep: z.string(),
});

export type FastPublicBrief = z.infer<typeof fastPublicBriefSchema>;

export function parseFastPublicBrief(value: unknown): FastPublicBrief | null {
  const parsed = fastPublicBriefSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
