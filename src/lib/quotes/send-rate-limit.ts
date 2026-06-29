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
