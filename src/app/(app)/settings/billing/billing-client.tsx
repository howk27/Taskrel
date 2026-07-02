"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, SealCheck } from "@/components/ui/icons";
import type { ReadinessItem } from "@/lib/readiness/setup-readiness";

import { getBillingPageReadiness } from "./billing-readiness";

type BillingClientProps = {
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | string | null;
  stripeConnectAccountId: string | null;
  billingConfigured: boolean;
  connectConfigured: boolean;
  webhookConfigured: boolean;
};

export function BillingClient({
  subscriptionStatus,
  stripeConnectAccountId,
  billingConfigured,
  connectConfigured,
  webhookConfigured,
}: BillingClientProps) {
  const params = useSearchParams();
  const connectReturnState = (params.get("connect") as "success" | "refresh" | "error" | null) ?? null;
  const connectSuccess = connectReturnState === "success";
  const subscribed = params.get("subscribed") === "true";
  const [loadingSubscribe, setLoadingSubscribe] = useState(false);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [message, setMessage] = useState("");

  const readinessItems = getBillingPageReadiness({
    subscriptionStatus,
    stripeConnectAccountId,
    connectReturnState,
    billingConfigured,
    connectConfigured,
    webhookConfigured,
    subscribed,
  });
  const incompleteItems = readinessItems.filter(item => item.state !== "complete");
  const completedCount = readinessItems.length - incompleteItems.length;
  const percentComplete = Math.round((completedCount / readinessItems.length) * 100);

  async function handleSubscribe() {
    setMessage("");
    setLoadingSubscribe(true);
    const res = await fetch("/api/stripe/subscribe", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else {
      setMessage(data.error ?? "Something went wrong starting checkout. Please try again.");
      setLoadingSubscribe(false);
    }
  }

  async function handleConnect() {
    setMessage("");
    setLoadingConnect(true);
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else {
      setMessage(data.error ?? "Something went wrong starting Connect setup. Please try again.");
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
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setAccessCode("");
      setMessage("Premium access unlocked for this closed test.");
    } else {
      setMessage(data.error ?? "Could not unlock premium access.");
    }

    setLoadingCode(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-lg font-semibold text-[var(--tr-text)]">Billing & payments</h1>

      {subscribed && (
        <div className="rounded-lg bg-[var(--tr-primary-fill)] p-4 text-sm text-[var(--tr-primary)] shadow-[inset_0_0_0_1px_var(--tr-primary-edge)]">
          Subscription checkout is complete. Waiting for Stripe confirmation.
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tr-text)]">
              {incompleteItems.length > 0 ? "Finish payment setup" : "Payment setup ready"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">
              {completedCount} of {readinessItems.length} checks ready.
            </p>
          </div>
          <div className="min-w-32">
            <p className="text-right text-2xl font-semibold text-[var(--tr-text)]">{percentComplete}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-[var(--tr-bg-soft)]">
              <div className="h-full rounded-sm bg-[var(--tr-primary)]" style={{ width: `${percentComplete}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {(incompleteItems.length > 0 ? incompleteItems : readinessItems.slice(0, 1)).map(item => (
            <BillingReadinessRow key={item.key} item={item} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          <div>
            <h2 className="font-semibold text-[var(--tr-text)]">Taskrel - $19/month</h2>
            <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Unlimited quotes, invoices, jobs, and records.</p>
          </div>
          <Button className="w-full" onClick={handleSubscribe} loading={loadingSubscribe}>
            Subscribe
          </Button>
        </div>

        <div className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          <div>
            <h2 className="font-semibold text-[var(--tr-text)]">Client payments</h2>
            <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Connect Stripe to collect invoice payments.</p>
          </div>
          <Button variant="secondary" className="w-full" onClick={handleConnect} loading={loadingConnect}>
            Set up Stripe Connect
          </Button>
        </div>
      </div>

      <form onSubmit={handleRedeemCode} className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <h2 className="font-semibold text-[var(--tr-text)]">Premium access code</h2>
        <Input
          label="Access code"
          value={accessCode}
          onChange={event => setAccessCode(event.target.value)}
          placeholder="Enter code"
          autoComplete="off"
        />
        <Button className="w-full" type="submit" variant="secondary" loading={loadingCode} disabled={!accessCode.trim()}>
          Unlock premium
        </Button>
      </form>
    </div>
  );
}

function BillingReadinessRow({ item }: { item: ReadinessItem }) {
  const complete = item.state === "complete";

  return (
    <div className="flex gap-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <span className={complete ? "text-[var(--tr-green)]" : "text-[var(--tr-amber)]"}>
        {complete ? <CheckCircle size={18} weight="duotone" /> : <SealCheck size={18} weight="duotone" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--tr-text)]">{item.label}</span>
        <span className="block text-sm leading-6 text-[var(--tr-text-muted)]">{item.detail}</span>
      </span>
    </div>
  );
}
