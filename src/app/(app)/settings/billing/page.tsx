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

      <div className="space-y-3 rounded-xl bg-[#1E293B] p-5">
        <div>
          <h2 className="font-semibold text-white">Taskrel - $19/month</h2>
          <p className="mt-1 text-sm text-slate-400">
            Unlimited quotes, invoices, and jobs. Cancel anytime.
          </p>
        </div>
        <Button className="w-full" onClick={handleSubscribe} loading={loadingSubscribe}>
          Subscribe Now
        </Button>
      </div>

      <form onSubmit={handleRedeemCode} className="space-y-3 rounded-xl bg-[#1E293B] p-5">
        <div>
          <h2 className="font-semibold text-white">Closed-test premium access</h2>
          <p className="mt-1 text-sm text-slate-400">
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

      <div className="space-y-3 rounded-xl bg-[#1E293B] p-5">
        <div>
          <h2 className="font-semibold text-white">Accept Client Payments</h2>
          <p className="mt-1 text-sm text-slate-400">
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
