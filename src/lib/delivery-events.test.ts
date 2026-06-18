import { describe, expect, it } from "vitest";
import { buildDeliveryEventRows, latestSuccessfulDeliveryLabel } from "./delivery-events";
import type { DeliveryEvent } from "@/types";

describe("delivery events", () => {
  it("builds auditable rows for every provider attempt", () => {
    const rows = buildDeliveryEventRows({
      contractorId: "contractor-1",
      actorUserId: "user-1",
      entityType: "quote",
      entityId: "quote-1",
      action: "send",
      attempts: [
        {
          channel: "email",
          provider: "sendgrid",
          recipient: "ava@example.com",
          status: "success",
          code: "sent",
          message: "Email sent.",
        },
        {
          channel: "sms",
          provider: "twilio",
          recipient: null,
          status: "error",
          code: "sms_missing_client",
          message: "This quote does not have a client phone number.",
        },
      ],
    });

    expect(rows).toEqual([
      {
        contractor_id: "contractor-1",
        actor_user_id: "user-1",
        entity_type: "quote",
        entity_id: "quote-1",
        action: "send",
        channel: "email",
        provider: "sendgrid",
        recipient: "ava@example.com",
        status: "success",
        code: "sent",
        message: "Email sent.",
        metadata: {},
      },
      {
        contractor_id: "contractor-1",
        actor_user_id: "user-1",
        entity_type: "quote",
        entity_id: "quote-1",
        action: "send",
        channel: "sms",
        provider: "twilio",
        recipient: null,
        status: "error",
        code: "sms_missing_client",
        message: "This quote does not have a client phone number.",
        metadata: {},
      },
    ]);
  });

  it("describes the latest successful delivery without claiming failed channels worked", () => {
    const events: DeliveryEvent[] = [
      {
        id: "event-1",
        contractor_id: "contractor-1",
        actor_user_id: "user-1",
        entity_type: "invoice",
        entity_id: "invoice-1",
        action: "send",
        channel: "sms",
        provider: "twilio",
        recipient: "+15551234567",
        status: "error",
        code: "sms_config",
        message: "Missing SMS configuration.",
        metadata: {},
        created_at: "2026-06-17T13:00:00.000Z",
      },
      {
        id: "event-2",
        contractor_id: "contractor-1",
        actor_user_id: "user-1",
        entity_type: "invoice",
        entity_id: "invoice-1",
        action: "send",
        channel: "email",
        provider: "sendgrid",
        recipient: "ava@example.com",
        status: "success",
        code: "sent",
        message: "Email sent.",
        metadata: {},
        created_at: "2026-06-17T14:00:00.000Z",
      },
    ];

    expect(latestSuccessfulDeliveryLabel(events)).toBe("Sent by email to ava@example.com");
  });
});
