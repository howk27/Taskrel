/**
 * Durable per-channel send cooldown for /api/quotes/send.
 *
 * Sending costs money (Twilio per SMS) and damages sender reputation if
 * abused, and the in-flight UI disable does not survive a refresh or a second
 * tab. This decides — purely, from the latest *successful* delivery timestamp
 * per channel (read from the persisted delivery_events table) — which requested
 * channels are still on cooldown. Because it reads a persisted timestamp it
 * holds across serverless instances and cold starts.
 */

export const SEND_COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes

export type BlockedChannel = { channel: string; retryAfterSeconds: number };

export type SuccessfulSendEvent = {
  channel: string;
  recipient: string | null;
  created_at: string;
};

/**
 * Builds the per-channel "last successful send" map used by the cooldown,
 * counting ONLY events whose recipient matches the address we're about to send
 * to on that channel. This makes the cooldown recipient-scoped: re-sending to
 * the same email/phone is throttled, but sending the quote to a *different*
 * recipient is never blocked. Events must be ordered newest-first; the first
 * match per channel wins.
 */
export function lastSuccessByRecipient(
  events: SuccessfulSendEvent[],
  recipientByChannel: Record<string, string | null | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const event of events) {
    const target = recipientByChannel[event.channel];
    if (!target) continue;
    if (event.recipient !== target) continue;
    if (!(event.channel in result)) result[event.channel] = event.created_at;
  }
  return result;
}

export function evaluateSendCooldown({
  channels,
  lastSuccessByChannel,
  now = Date.now(),
  cooldownMs = SEND_COOLDOWN_MS,
}: {
  channels: string[];
  lastSuccessByChannel: Record<string, string | null | undefined>;
  now?: number;
  cooldownMs?: number;
}): BlockedChannel[] {
  const blocked: BlockedChannel[] = [];
  for (const channel of channels) {
    const lastSuccessAt = lastSuccessByChannel[channel];
    if (!lastSuccessAt) continue;
    const elapsed = now - Date.parse(lastSuccessAt);
    if (elapsed >= 0 && elapsed < cooldownMs) {
      blocked.push({
        channel,
        retryAfterSeconds: Math.ceil((cooldownMs - elapsed) / 1000),
      });
    }
  }
  return blocked;
}
