"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";

/**
 * Danger zone: permanently delete the account and all stored data.
 * Requires the user to type their exact account email, then calls
 * POST /api/account/delete (which purges Storage PDFs/logos, cancels any
 * Stripe subscription, and deletes the auth user — cascading all DB records).
 */
export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmEmail.trim().toLowerCase() === email.trim().toLowerCase() && email.length > 0;

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete your account. Try again.");
        setSubmitting(false);
        return;
      }
      // Full reload so no stale authenticated client state survives.
      window.location.href = "/login";
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--tr-text-muted)]">
        <span className="text-[var(--tr-red)]">Danger zone</span>
      </h2>
      <Surface className="overflow-hidden border-[color-mix(in_srgb,var(--tr-red)_30%,transparent)]">
        <div className="space-y-3 p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--tr-text)]">Delete account</p>
            <p className="mt-1 text-sm text-[var(--tr-text-muted)]">
              Permanently deletes your profile, every client, quote, invoice, job, and the
              stored PDF copies of everything you have sent. This is immediate and cannot be
              undone.
            </p>
          </div>

          {!open ? (
            <Button variant="destructive" onClick={() => setOpen(true)}>
              Delete account
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg bg-[var(--tr-error-bg)] p-3">
              <label className="block text-sm text-[var(--tr-text)]">
                Type <span className="font-semibold">{email}</span> to confirm.
                <Input
                  type="email"
                  autoComplete="off"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={email}
                  className="mt-2"
                  disabled={submitting}
                />
              </label>
              {error && <p className="text-sm font-medium text-[var(--tr-red)]">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  loading={submitting}
                  disabled={!matches || submitting}
                >
                  Permanently delete
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOpen(false);
                    setConfirmEmail("");
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Surface>
    </section>
  );
}
