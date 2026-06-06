import { z } from "zod";
import { attributionSchema } from "@/lib/schemas/attribution";

export const SITE_EVENT_NAMES = [
  "page_view",
  "tool_card_clicked",
  "seo_tool_cta_clicked",
  "quiz_started",
  "quiz_step_viewed",
  "quiz_submitted",
  "lead_created",
  "result_viewed",
  "booking_clicked",
  "strategy_room_viewed",
  "scenario_comparison_viewed",
  "advisor_map_viewed",
  "presentation_opened",
  "advisor_brief_generated",
  "followup_copied",
  "meeting_prep_viewed",
] as const;

export type SiteEventName = (typeof SITE_EVENT_NAMES)[number];

const SENSITIVE_METADATA_KEY =
  /email|phone|name|password|address|free_?text|first_?name|last_?name|contact/i;

const metadataValueSchema = z.union([
  z.string().max(200),
  z.number(),
  z.boolean(),
]);

export const siteEventMetadataSchema = z
  .record(z.string(), metadataValueSchema)
  .transform((metadata) => sanitizeSiteEventMetadata(metadata));

export const siteEventRequestSchema = z.object({
  sessionId: z.string().min(8).max(64),
  eventName: z.enum(SITE_EVENT_NAMES),
  tenantSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  pagePath: z.string().max(500).optional(),
  referrer: z.string().max(2000).optional(),
  attribution: attributionSchema.optional(),
  metadata: siteEventMetadataSchema.optional(),
});

export type SiteEventRequest = z.infer<typeof siteEventRequestSchema>;

export function sanitizeSiteEventMetadata(
  metadata: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEY.test(key)) continue;
    if (typeof value === "string" && value.length > 200) continue;
    sanitized[key] = value;
  }

  return sanitized;
}

export function summarizeSiteEventMetadata(
  metadata: Record<string, unknown> | null | undefined
): string {
  if (!metadata || Object.keys(metadata).length === 0) return "—";

  const parts = Object.entries(metadata)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return parts.join(" · ");
}
