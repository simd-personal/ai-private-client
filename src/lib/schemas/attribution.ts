import { z } from "zod";

const optionalAttributionString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);

export const attributionSchema = z.object({
  utm_source: optionalAttributionString,
  utm_medium: optionalAttributionString,
  utm_campaign: optionalAttributionString,
  utm_term: optionalAttributionString,
  utm_content: optionalAttributionString,
  gclid: optionalAttributionString,
  fbclid: optionalAttributionString,
  referrer: optionalAttributionString,
  landing_page: optionalAttributionString,
});

export type AttributionData = z.infer<typeof attributionSchema>;
