import "server-only";
import type { SenderInfo } from "./template";

/** Signature details for drafts. Unset fields stay as [placeholders] the user must fill in before sending. */
export function senderInfo(): SenderInfo {
  const v = (k: string) => process.env[k]?.trim() || null;
  return {
    name: v("SENDER_NAME"),
    company: v("SENDER_COMPANY") ?? "Monsta Media & Design",
    email: v("SENDER_EMAIL"),
    phone: v("SENDER_PHONE"),
    address: v("SENDER_ADDRESS"),
    region: v("SENDER_REGION") ?? "Northeast Ohio",
  };
}
