import { z } from "zod";
import { sanitizeConciergeProse } from "@/lib/ai/report-labels";

export const leadConciergeSchema = z.object({
  leadPriorityReason: z.string(),
  callOpener: z.string(),
  smsFollowUp: z.string(),
  emailFollowUp: z.string(),
  objectionsToExpect: z.array(z.string()),
  recommendedFollowUpTimeline: z.string(),
  nextBestAction: z.string(),
});

export type LeadConcierge = z.infer<typeof leadConciergeSchema>;

export function parseLeadConcierge(value: unknown): LeadConcierge | null {
  const parsed = leadConciergeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function getLeadConciergeFromQuizData(
  quizData: Record<string, unknown>
): LeadConcierge | null {
  if (!("leadConcierge" in quizData)) return null;
  return parseLeadConcierge(quizData.leadConcierge);
}

export function sanitizeLeadConcierge(
  concierge: LeadConcierge,
  firstName: string
): LeadConcierge {
  return {
    leadPriorityReason: sanitizeConciergeProse(
      concierge.leadPriorityReason,
      firstName
    ),
    callOpener: sanitizeConciergeProse(concierge.callOpener, firstName),
    smsFollowUp: sanitizeConciergeProse(concierge.smsFollowUp, firstName),
    emailFollowUp: sanitizeConciergeProse(concierge.emailFollowUp, firstName),
    objectionsToExpect: concierge.objectionsToExpect.map((item) =>
      sanitizeConciergeProse(item, firstName)
    ),
    recommendedFollowUpTimeline: sanitizeConciergeProse(
      concierge.recommendedFollowUpTimeline,
      firstName
    ),
    nextBestAction: sanitizeConciergeProse(concierge.nextBestAction, firstName),
  };
}
