"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function BillingPage() {
  const params = useSearchParams();
  const connectSuccess = params.get("connect") === "success";
  const subscribed = params.get("subscribed") === "true";
  const [loadingSubscribe, setLoadingSubscribe] = useState(false);
  const [loadingConnect, setLoadingConnect] = useState(false);

  async function handleSubscribe() {
    setLoadingSubscribe(true);
    const res = await fetch("/api/stripe/subscribe", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoadingSubscribe(false);
  }

  async function handleConnect() {
    setLoadingConnect(true);
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoadingConnect(false);
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-white">Billing & Payments</h1>

      {subscribed && (
        <div className="rounded-xl bg-green-900/30 border border-green-700 p-4 text-sm text-green-400">
          Subscription activated. Welcome to Taskrel!
        </div>
      )}

      {connectSuccess && (
        <div className="rounded-xl bg-green-900/30 border border-green-700 p-4 text-sm text-green-400">
          Stripe Connect setup complete. You can now accept client payments.
        </div>
      )}

      {/* Taskrel subscription */}
      <div className="rounded-xl bg-[#1E293B] p-5 space-y-3">
        <div>
          <h2 className="text-white font-semibold">Taskrel — $19/month</h2>
          <p className="text-slate-400 text-sm mt-1">
            Unlimited quotes, invoices, and jobs. Cancel anytime.
          </p>
        </div>
        <Button className="w-full" onClick={handleSubscribe} loading={loadingSubscribe}>
          Subscribe Now
        </Button>
      </div>

      {/* Stripe Connect */}
      <div className="rounded-xl bg-[#1E293B] p-5 space-y-3">
        <div>
          <h2 className="text-white font-semibold">Accept Client Payments</h2>
          <p className="text-slate-400 text-sm mt-1">
            Connect your Stripe account to collect payments directly from your invoices. Money goes straight to you — Taskrel never touches it.
          </p>
        </div>
        <Button variant="secondary" className="w-full" onClick={handleConnect} loading={loadingConnect}>
          Set Up Stripe Connect
        </Button>
      </div>
    </div>
  );
}
