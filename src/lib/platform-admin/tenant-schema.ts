import { z } from "zod";

const toNullIfBlank = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const kebabSlug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const optionalTextField = (max: number) =>
  z.preprocess(toNullIfBlank, z.string().trim().max(max).nullable().optional());

const optionalEmailField = z.preprocess(
  toNullIfBlank,
  z.string().trim().email().max(320).nullable().optional()
);

const optionalUrlField = z.preprocess(
  toNullIfBlank,
  z.string().trim().url().max(500).nullable().optional()
);

const requiredStateArray = z
  .array(z.string().trim().min(1).max(32))
  .min(1, "At least one supported state is required");

const requiredAreaArray = z
  .array(z.string().trim().min(1).max(120))
  .min(1, "At least one service area is required");

export const tenantCreateSchema = z.object({
  slug: kebabSlug,
  brand_name: z.string().trim().min(1).max(200),
  agent_name: z.string().trim().min(1).max(200),
  agent_title: optionalTextField(200),
  brokerage_name: z.string().trim().min(1).max(200),
  agent_license_number: z.string().trim().min(1).max(200),
  brokerage_license_number: z.string().trim().min(1).max(200),
  notification_email: z.string().trim().email().max(320),
  contact_email: optionalEmailField,
  phone: optionalTextField(64),
  booking_url: optionalUrlField,
  logo_url: optionalUrlField,
  primary_color: optionalTextField(32),
  accent_color: optionalTextField(32),
  supported_states: requiredStateArray,
  service_areas: requiredAreaArray,
  default_state: z.string().trim().min(1).max(32),
  disclaimer_text: optionalTextField(2000),
  seo_base_title: optionalTextField(200),
  seo_base_description: optionalTextField(500),
});

export const tenantUpdateSchema = z.object({
  brand_name: z.string().trim().min(1).max(200).optional(),
  agent_name: z.string().trim().min(1).max(200).optional(),
  agent_title: optionalTextField(200),
  brokerage_name: z.string().trim().min(1).max(200).optional(),
  agent_license_number: z.string().trim().min(1).max(200).optional(),
  brokerage_license_number: z.string().trim().min(1).max(200).optional(),
  notification_email: z.string().trim().email().max(320).optional(),
  contact_email: optionalEmailField,
  phone: optionalTextField(64),
  booking_url: optionalUrlField,
  logo_url: optionalUrlField,
  primary_color: optionalTextField(32),
  accent_color: optionalTextField(32),
  supported_states: requiredStateArray.optional(),
  service_areas: requiredAreaArray.optional(),
  default_state: z.string().trim().min(1).max(32).optional(),
  disclaimer_text: optionalTextField(2000),
  seo_base_title: optionalTextField(200),
  seo_base_description: optionalTextField(500),
});

export const TENANT_PLATFORM_SELECT_FIELDS = `
  id,
  slug,
  brand_name,
  agent_name,
  agent_title,
  brokerage_name,
  agent_license_number,
  brokerage_license_number,
  notification_email,
  contact_email,
  phone,
  booking_url,
  logo_url,
  primary_color,
  accent_color,
  supported_states,
  service_areas,
  default_state,
  disclaimer_text,
  seo_base_title,
  seo_base_description,
  created_at,
  updated_at
`;
