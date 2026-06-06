import type { LeadTemperature } from "@/lib/scoring";

export interface SmsLeadPayload {
  leadId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  leadTemperature: LeadTemperature;
  leadScore: number;
}

/**
 * SMS notification placeholder.
 *
 * TODO: Integrate Twilio when ready:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_FROM_NUMBER
 * - LEAD_NOTIFICATION_PHONE (advisory team mobile)
 *
 * Example:
 * await twilioClient.messages.create({
 *   body: `Hot lead: ${payload.firstName} ${payload.lastName} (score ${payload.leadScore})`,
 *   from: process.env.TWILIO_FROM_NUMBER,
 *   to: process.env.LEAD_NOTIFICATION_PHONE,
 * });
 */
export async function maybeSendLeadSmsNotification(
  payload: SmsLeadPayload
): Promise<void> {
  if (payload.leadTemperature !== "hot") return;

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[sms:placeholder] Hot lead — SMS would be sent to agent:",
      `${payload.firstName} ${payload.lastName}`,
      `(score ${payload.leadScore})`
    );
  }
}
