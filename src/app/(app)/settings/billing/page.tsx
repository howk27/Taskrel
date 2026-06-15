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

      {message && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          {message}
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
