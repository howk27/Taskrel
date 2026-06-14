"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Lightning, Plus } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import type { QuoteAssistantMetadata, QuoteLineItem } from "@/types";

type Step = "form" | "generating" | "review";

interface GeneratedQuote extends QuoteAssistantMetadata {
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
      const quotePayload: Partial<GeneratedQuote> = { ...quote };
      delete quotePayload.suggested_addons;
      delete quotePayload.assistant_notes;
      delete quotePayload.assumptions;
      delete quotePayload.risk_flags;
      delete quotePayload.terms_suggestion;

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
          ...quotePayload,
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
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 xl:py-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tr-blue)]">Quote builder</p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">New Quote</h1>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <Surface className="p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Client details</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Client name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Smith" required />
                <Input label="Email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
                <Input label="Phone" type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(305) 555-0100" />
                <Input label="Address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Main St, Miami FL" />
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Schedule</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Job start" type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
                <Input label="Job end" type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} />
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Job notes</h2>
              <div className="space-y-3">
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Describe the job in plain English. Example: Paint interior of 3-bedroom house, walls and ceilings only, about 1,800 sq ft."
                  rows={6}
                  required
                  className="tr-input w-full resize-none rounded-xl px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none"
                />
                <textarea
                  value={additionalDetails}
                  onChange={e => setAdditionalDetails(e.target.value)}
                  placeholder="Optional details: access, materials, timeline, client concerns, photos taken..."
                  rows={3}
                  className="tr-input w-full resize-none rounded-xl px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </Surface>
          </div>

          <Surface className="h-fit p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--tr-violet)]/15 text-[var(--tr-violet)]">
                <Lightning size={24} weight="duotone" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Quote Assistant</h2>
                <p className="text-sm text-[var(--tr-text-muted)]">Uses OpenAI to turn notes into a quote.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[var(--tr-text-muted)]">
              <p>Write notes like you would text a crew lead. Taskrel will structure line items, assumptions, and review tips.</p>
              <p>No supplier price feeds are used. Suggestions come from the job notes and your trade context.</p>
            </div>
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
            <Button type="submit" className="mt-5 w-full" size="lg">
              <Lightning size={19} weight="duotone" />
              Generate Quote
            </Button>
          </Surface>

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
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 xl:py-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => setStep("form")} className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tr-blue)]">Ready to review</p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Review Quote</h1>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-4">
            <Surface className="p-4">
              <p className="text-sm text-slate-400">Client</p>
              <p className="font-medium text-white">{clientName}</p>
              {clientAddress && <p className="text-sm text-slate-400">{clientAddress}</p>}
              {scheduledStart && (
                <p className="text-sm text-slate-400">
                  {new Date(scheduledStart).toLocaleString()}
                  {scheduledEnd && ` - ${new Date(scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              )}
            </Surface>

            <Surface className="overflow-hidden">
              <div className="border-b border-slate-700 px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Line Items</p>
              </div>
              <div className="divide-y divide-slate-700/50">
                {quote.line_items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.description}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} {item.unit ?? "unit"} x ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-medium text-white">${item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t border-slate-700 px-4 py-3">
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
                <div className="flex justify-between pt-1 text-base font-bold text-[var(--tr-amber)]">
                  <span>Total</span>
                  <span>${quote.total.toFixed(2)}</span>
                </div>
              </div>
            </Surface>

            {quote.notes && (
              <Surface className="p-4">
                <p className="mb-1 text-sm text-slate-400">Note to client</p>
                <p className="text-sm text-slate-300">{quote.notes}</p>
              </Surface>
            )}
          </div>

          <Surface className="h-fit p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Lightning size={22} weight="duotone" className="text-[var(--tr-violet)]" />
              Assistant review
            </h2>
            <AssistantList title="Notes" items={quote.assistant_notes} />
            <AssistantList title="Assumptions" items={quote.assumptions} />
            <AssistantList title="Risk flags" items={quote.risk_flags} tone="warning" />
            {quote.terms_suggestion && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Terms suggestion</p>
                <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{quote.terms_suggestion}</p>
              </div>
            )}
            {quote.suggested_addons?.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Suggested add-ons</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quote.suggested_addons.map(addon => (
                    <span key={addon.label} className="inline-flex items-center gap-1 rounded-full border border-[var(--tr-violet)]/30 bg-[var(--tr-violet)]/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
                      <Plus size={13} />
                      {addon.label} (${addon.price})
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Surface>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {/* Actions */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

function AssistantList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items?: string[];
  tone?: "default" | "warning";
}) {
  if (!items?.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map(item => (
          <li
            key={item}
            className={`text-sm leading-5 ${tone === "warning" ? "text-amber-100" : "text-[var(--tr-text-muted)]"}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
