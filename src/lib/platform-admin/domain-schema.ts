import { z } from "zod";
import {
  DOMAIN_STATUSES,
  DOMAIN_TYPES,
  isValidDomain,
  normalizeDomain,
} from "@/lib/platform-admin/domain-utils";

const domainField = z
  .string()
  .trim()
  .min(1, "Domain is required")
  .max(253)
  .transform((value) => normalizeDomain(value))
  .refine((value) => isValidDomain(value), {
    message: "Enter a valid hostname with no protocol, path, or trailing slash",
  });

export const domainCreateSchema = z.object({
  domain: domainField,
  domain_type: z.enum(DOMAIN_TYPES).default("custom_domain"),
});

export const domainUpdateSchema = z
  .object({
    status: z.enum(DOMAIN_STATUSES).optional(),
    domain_type: z.enum(DOMAIN_TYPES).optional(),
  })
  .refine((data) => data.status !== undefined || data.domain_type !== undefined, {
    message: "No fields to update",
  });

export const TENANT_DOMAIN_SELECT_FIELDS = `
  id,
  tenant_id,
  domain,
  domain_type,
  status,
  verification_token,
  verified_at,
  created_at,
  updated_at
`;
