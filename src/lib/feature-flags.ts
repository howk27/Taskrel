/**
 * v1 feature flags.
 *
 * SMS delivery (Twilio) is fully implemented end-to-end but is NOT launched in
 * v1: it requires a provisioned Twilio number plus TCPA consent/opt-out
 * handling before a single message can be sent legally
 * (see docs/legal/tcpa-readiness.md). Until that work ships, SMS is hidden from
 * the UI and short-circuited in the send routes — but the Twilio code stays in
 * place behind this flag so flipping it back on is a one-line change.
 */
export const SMS_ENABLED = false;
