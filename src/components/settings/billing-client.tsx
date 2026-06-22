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
      <h1 className="text-lg font-semibold text-white">Billing & Payments</h1>

      {subscribed && (
        <div className="rounded-xl border border-green-700 bg-green-900/30 p-4 text-sm text-green-400">
          Subscription activated. Welcome to Taskrel.
        </div>
      )}

      {connectSuccess && (
        <div className="rounded-xl border border-green-700 bg-green-900/30 p-4 text-sm text-green-400">
          Stripe Connect setup complete. You can now accept client payments.
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          {message}
        </div>
      )}

      <section className="rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--tr-amber)]">Payment readiness</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">
              {readiness.readyForPaidLaunch ? "Ready for paid launch" : "Finish the money path"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {readiness.completedCount} of {readiness.totalCount} checks ready. Taskrel needs subscription checkout, account status, Connect, and webhooks before public billing feels trustworthy.
            </p>
          </div>
          <div className="min-w-28">
            <p className="text-right text-2xl font-black text-white">{readiness.percentComplete}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950">
              <div className="h-full rounded-full bg-[var(--tr-orange)]" style={{ width: `${readiness.percentComplete}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {readiness.items.map(item => (
            <div key={item.key} className={`rounded-lg border p-3 ${item.complete ? "border-[var(--tr-green)]/25 bg-[var(--tr-green)]/10" : "border-white/10 bg-white/[0.03]"}`}>
              <p className="text-sm font-bold text-white">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.impact}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
          <div>
            <h2 className="font-semibold text-white">Taskrel - $19/month</h2>
            <p className="mt-1 text-sm text-slate-400">
              Unlimited quotes, invoices, jobs, and records. Cancel anytime.
            </p>
          </div>
          <Button className="w-full" onClick={handleSubscribe} loading={loadingSubscribe}>
            Subscribe Now
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
          <div>
            <h2 className="font-semibold text-white">Accept Client Payments</h2>
            <p className="mt-1 text-sm text-slate-400">
              Connect your Stripe account to collect payments directly from invoices. Money goes straight to you.
            </p>
          </div>
          <Button variant="secondary" className="w-full" onClick={handleConnect} loading={loadingConnect}>
            Set Up Stripe Connect
          </Button>
        </div>
      </div>

      <form onSubmit={handleRedeemCode} className="space-y-3 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
        <div>
          <h2 className="font-semibold text-white">Premium access code</h2>
          <p className="mt-1 text-sm text-slate-400">
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
