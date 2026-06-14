"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "@/components/ui/icons";
import type { QuoteLineItem } from "@/types";

type Step = "form" | "generating" | "review";

interface GeneratedQuote {
  line_items: (QuoteLineItem & { unit?: string })[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  // Generated quote
  const [quote, setQuote] = useState<GeneratedQuote | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("generating");

    try {
      const res = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, additionalDetails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setQuote(data);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }

  async function handleSave(sendVia: string[]) {
    if (!quote) return;
    setSaving(true);
    setError("");

    try {
      // Save quote to DB
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_address: clientAddress || null,
          scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
          ...quote,
          status: "draft",
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error ?? "Save failed");

      // Send if requested
      if (sendVia.length > 0) {
        await fetch("/api/quotes/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteId: saved.id, via: sendVia }),
        });
      }

      router.push(`/quotes/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  // Form step
  if (step === "form") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} weight="bold" />
          </button>
          <h1 className="text-lg font-semibold text-white">New Quote</h1>
        </div>

        <form onSubmit={handleGenerate} className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Client Info</h2>
            <div className="space-y-3">
              <Input label="Client name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Smith" required />
              <Input label="Email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
              <Input label="Phone" type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(305) 555-0100" />
              <Input label="Address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Main St, Miami FL" />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Schedule</h2>
            <div className="space-y-3">
              <Input
                label="Job start"
                type="datetime-local"
                value={scheduledStart}
                onChange={e => setScheduledStart(e.target.value)}
              />
              <Input
                label="Job end"
                type="datetime-local"
                value={scheduledEnd}
                onChange={e => setScheduledEnd(e.target.value)}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Job Details</h2>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Describe the job <span className="text-[#F97316]">*</span></label>
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="e.g. Paint interior of 3-bedroom house. Walls and ceilings only, no trim. About 1,800 sq ft total. Client wants 2 coats of flat paint."
                  rows={4}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-[#1E293B] px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Additional details <span className="text-slate-500">(optional)</span></label>
                <textarea
                  value={additionalDetails}
                  onChange={e => setAdditionalDetails(e.target.value)}
                  placeholder="e.g. High ceilings in living room, needs scaffolding. Client supplying paint."
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-[#1E293B] px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" size="lg">
            Generate Quote with AI
          </Button>
        </form>
      </div>
    );
  }

  // Generating step
  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#F97316] border-r-transparent" />
        <p className="text-white font-medium">Generating your quote...</p>
        <p className="text-slate-400 text-sm">Usually takes 5-10 seconds</p>
      </div>
    );
  }

  // Review step
  if (step === "review" && quote) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("form")} className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} weight="bold" />
          </button>
          <h1 className="text-lg font-semibold text-white">Review Quote</h1>
        </div>

        {/* Client */}
        <div className="mb-4 rounded-xl bg-[#1E293B] p-4">
          <p className="text-sm text-slate-400">Client</p>
          <p className="text-white font-medium">{clientName}</p>
          {clientAddress && <p className="text-slate-400 text-sm">{clientAddress}</p>}
          {scheduledStart && (
            <p className="text-slate-400 text-sm">
              {new Date(scheduledStart).toLocaleString()}
              {scheduledEnd && ` - ${new Date(scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          )}
        </div>

        {/* Line items */}
        <div className="rounded-xl bg-[#1E293B] overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Line Items</p>
          </div>
          <div className="divide-y divide-slate-700/50">
            {quote.line_items.map((item, i) => (
              <div key={i} className="px-4 py-3 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-white text-sm">{item.description}</p>
                  <p className="text-slate-500 text-xs">{item.quantity} {item.unit ?? "unit"} x ${item.unit_price.toFixed(2)}</p>
                </div>
                <p className="text-white font-medium text-sm whitespace-nowrap">${item.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-700 space-y-1">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>${quote.subtotal.toFixed(2)}</span>
            </div>
            {quote.tax_amount > 0 && (
              <div className="flex justify-between text-sm text-slate-400">
                <span>Tax ({(quote.tax_rate * 100).toFixed(1)}%)</span>
                <span>${quote.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#F97316] pt-1">
              <span>Total</span>
              <span>${quote.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="rounded-xl bg-[#1E293B] p-4 mb-6">
            <p className="text-sm text-slate-400 mb-1">Note to client</p>
            <p className="text-slate-300 text-sm">{quote.notes}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {/* Actions */}
        <div className="space-y-3">
          {(clientEmail || clientPhone) && (
            <Button
              className="w-full"
              size="lg"
              loading={saving}
              onClick={() => {
                const via = [];
                if (clientEmail) via.push("email");
                if (clientPhone) via.push("sms");
                handleSave(via);
              }}
            >
              Send Quote
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            loading={saving}
            onClick={() => handleSave([])}
          >
            Save as Draft
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
