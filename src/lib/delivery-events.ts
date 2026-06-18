import type { DeliveryEvent } from "@/types";

export type DeliveryEventAttempt = {
  channel: DeliveryEvent["channel"];
  provider: DeliveryEvent["provider"];
  recipient: string | null;
  status: DeliveryEvent["status"];
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type DeliveryEventInsert = Omit<DeliveryEvent, "id" | "created_at">;

export function buildDeliveryEventRows({
  contractorId,
  actorUserId,
  entityType,
  entityId,
  action,
  attempts,
}: {
  contractorId: string;
  actorUserId: string | null;
  entityType: DeliveryEvent["entity_type"];
  entityId: string;
  action: DeliveryEvent["action"];
  attempts: DeliveryEventAttempt[];
}): DeliveryEventInsert[] {
  return attempts.map(attempt => ({
    contractor_id: contractorId,
    actor_user_id: actorUserId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    channel: attempt.channel,
    provider: attempt.provider,
    recipient: attempt.recipient,
    status: attempt.status,
    code: attempt.code,
    message: attempt.message,
    metadata: attempt.metadata ?? {},
  }));
}

export function latestSuccessfulDeliveryLabel(events: DeliveryEvent[]) {
  const latest = [...events]
    .filter(event => event.action === "send" && event.status === "success")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  if (!latest) return null;
  return `Sent by ${labelChannel(latest.channel)}${latest.recipient ? ` to ${latest.recipient}` : ""}`;
}

export function deliveryEventSummary(events: DeliveryEvent[]) {
  const success = events.filter(event => event.status === "success");
  const failed = events.filter(event => event.status === "error");
  return {
    success,
    failed,
    latestSuccessLabel: latestSuccessfulDeliveryLabel(events),
  };
}

function labelChannel(channel: DeliveryEvent["channel"]) {
  if (channel === "sms") return "SMS";
  if (channel === "stripe") return "online payments";
  return "email";
}
