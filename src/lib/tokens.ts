import { randomBytes } from "crypto";

export function generatePublicResultToken(): string {
  return randomBytes(32).toString("base64url");
}
