"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BillingPage() {
  const params = useSearchParams();
  const connectSuccess = params.get("connect") === "success";
  const subscribed = params.get("subscribed") === "true";
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
      setMessage(data.error ?? "Subscription billing is not enabled for this closed test.");
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
      setMessage(data.error ?? "Client payments are not enabled for this closed test.");
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
      setMessage("Premium access unlocked for this closed test.");
    } else {
      setMessage(data.error ?? "Could not unlock premium access.");
    }

    setLoadingCode(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <h1 className="text-lg font-semibold text-[var(--tr-text)]">Billing & Payments</h1>

      {subscribed && (
        <div className="rounded-lg bg-[var(--tr-success-bg)] p-4 text-sm font-medium text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-success-bg)]">
          Subscription activated. Welcome to Taskrel.
        </div>
      )}

      {connectSuccess && (
        <div className="rounded-lg bg-[var(--tr-success-bg)] p-4 text-sm font-medium text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-success-bg)]">
          Stripe Connect setup complete. You can now accept client payments.
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-[var(--tr-warning-bg)] p-4 text-sm font-medium text-[var(--tr-amber)] shadow-[inset_0_0_0_1px_var(--tr-warning-bg)]">
          {message}
        </div>
      )}

      <div className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div>
          <h2 className="font-semibold text-[var(--tr-text)]">Taskrel - $19/month</h2>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">
            Unlimited quotes, invoices, and jobs. Cancel anytime.
          </p>
        </div>
        <Button className="w-full" onClick={handleSubscribe} loading={loadingSubscribe}>
          Subscribe Now
        </Button>
      </div>

      <form onSubmit={handleRedeemCode} className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div>
          <h2 className="font-semibold text-[var(--tr-text)]">Closed-test premium access</h2>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">
            Use a Taskrel access code to unlock premium while Stripe billing is being tested.
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

      <div className="space-y-3 rounded-lg bg-[var(--tr-surface)] p-5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div>
          <h2 className="font-semibold text-[var(--tr-text)]">Accept Client Payments</h2>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">
            Connect your Stripe account to collect payments directly from your invoices. Money goes straight to you - Taskrel never touches it.
          </p>
        </div>
        <Button variant="secondary" className="w-full" onClick={handleConnect} loading={loadingConnect}>
          Set Up Stripe Connect
        </Button>
      </div>
    </div>
  );
}
