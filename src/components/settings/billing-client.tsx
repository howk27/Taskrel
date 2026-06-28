"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PaymentReadinessState } from "@/lib/payment-readiness";

export function BillingClient({
  connectSuccess,
  subscribed,
  readiness,
}: {
  connectSuccess: boolean;
  subscribed: boolean;
  readiness: PaymentReadinessState;
}) {
  const [loadingSubscribe, setLoadingSubscribe] = useState(false);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubscribe() {
    setMessage("");
    setLoadingSubscribe(true);
    const res = await fetch("/api/stripe/subscribe", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else {
      setMessage(data.error ?? "Subscription billing is not configured yet. Check your Stripe settings and try again.");
      setLoadingSubscribe(false);
    }
  }

  async function handleConnect() {
    setMessage("");
    setLoadingConnect(true);
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else {
      setMessage(data.error ?? "Client payments are not configured yet. Check your Stripe Connect settings and try again.");
      setLoadingConnect(false);
    }
  }

  async function handleRedeemCode(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoadingCode(true);

    const res = await fetch("/api/billing/redeem-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: accessCode }),
    });
    const data = await res.json();

    if (res.ok) {
      setAccessCode("");
      setMessage("Premium access unlocked.");
    } else {
      setMessage(data.error ?? "Could not unlock premium access.");
    }

    setLoadingCode(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-lg font-semibold text-[var(--tr-text)]">Billing & payments</h1>

      {subscribed && (
        <div className="rounded-lg bg-[var(--tr-success-bg)] p-4 text-sm text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
          Subscription activated. Welcome to Taskrel.
        </div>
      )}

      {connectSuccess && (
        <div className="rounded-lg bg-[var(--tr-success-bg)] p-4 text-sm text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
          Stripe Connect setup complete. You can now accept client payments.
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-[var(--tr-warning-bg)] p-4 text-sm text-[var(--tr-amber)] shadow-[inset_0_0_0_1px_var(--tr-badge-warning-ring)]">
          {message}
        </div>
      )}

      <section className="rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--tr-primary)]">Payment readiness</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--tr-text)]">
              {readiness.readyForPaidLaunch ? "Ready for paid launch" : "Finish the money path"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">
              {readiness.completedCount} of {readiness.totalCount} checks ready.
            </p>
          </div>
          <div className="min-w-28">
            <p className="text-right text-2xl font-semibold text-[var(--tr-text)]">{readiness.percentComplete}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-[var(--tr-bg-soft)]">
              <div className="h-full rounded-sm bg-[var(--tr-primary)]" style={{ width: `${readiness.percentComplete}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {readiness.items.map(item => (
            <div key={item.key} className={`rounded-lg p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)] ${item.complete ? "bg-[var(--tr-success-bg)]" : "bg-[var(--tr-bg-soft)]"}`}>
              <p className="text-base font-semibold text-[var(--tr-text)]">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          <div>
            <h2 className="font-semibold text-[var(--tr-text)]">Taskrel - $19/month</h2>
            <p className="mt-1 text-sm text-[var(--tr-text-muted)]">
              Unlimited quotes, invoices, jobs, and records. Cancel anytime.
            </p>
          </div>
          <Button className="w-full" onClick={handleSubscribe} loading={loadingSubscribe}>
            Subscribe Now
          </Button>
        </div>

        <div className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          <div>
            <h2 className="font-semibold text-[var(--tr-text)]">Accept client payments</h2>
            <p className="mt-1 text-sm text-[var(--tr-text-muted)]">
              Connect your Stripe account to collect payments directly from invoices. Money goes straight to you.
            </p>
          </div>
          <Button variant="secondary" className="w-full" onClick={handleConnect} loading={loadingConnect}>
            Set Up Stripe Connect
          </Button>
        </div>
      </div>

      <form onSubmit={handleRedeemCode} className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div>
          <h2 className="font-semibold text-[var(--tr-text)]">Premium access code</h2>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">
            Use a Taskrel access code for complimentary or validation access.
          </p>
        </div>
        <Input
          label="Access code"
          value={accessCode}
          onChange={event => setAccessCode(event.target.value)}
          placeholder="Enter code"
          autoComplete="off"
        />
        <Button className="w-full" type="submit" variant="secondary" loading={loadingCode} disabled={!accessCode.trim()}>
          Unlock Premium
        </Button>
      </form>
    </div>
  );
}
