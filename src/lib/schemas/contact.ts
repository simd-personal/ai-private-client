import { z } from "zod";
import { CONTACT_METHODS } from "@/lib/constants";

export const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  preferredContactMethod: z.enum(CONTACT_METHODS),
  consentGiven: z
    .boolean()
    .refine((val) => val === true, { message: "You must agree to be contacted" }),
});

export type ContactData = z.infer<typeof contactSchema>;
