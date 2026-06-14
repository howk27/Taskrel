"use client";

import { useActionState } from "react";
import { updateQuoteSettings, type SettingsActionState } from "@/lib/actions/settings";
import type { Contractor, QuoteTemplatePreset } from "@/types";

type Props = {
  contractor: Pick<
    Contractor,
    | "logo_url"
    | "business_phone"
    | "business_website"
    | "license_text"
    | "quote_default_terms"
    | "quote_default_note"
    | "quote_template_preset"
  >;
};

const presetOptions: { value: QuoteTemplatePreset; label: string; description: string }[] = [
  { value: "classic", label: "Classic", description: "Dark Taskrel styling with orange totals." },
  { value: "modern", label: "Modern", description: "High-contrast layout with a green approval feel." },
  { value: "compact", label: "Compact", description: "Paper-like quote for dense line items." },
];

export function QuoteDocumentSettingsForm({ contractor }: Props) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(updateQuoteSettings, undefined);

  return (
    <form action={formAction} className="rounded-lg border border-slate-700/70 bg-[#172235] p-4 space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-300" htmlFor="quote_template_preset">Default quote template</label>
        <select
          id="quote_template_preset"
          name="quote_template_preset"
          defaultValue={contractor.quote_template_preset ?? "classic"}
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2.5 text-sm text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]"
        >
          {presetOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {presetOptions.find(option => option.value === (contractor.quote_template_preset ?? "classic"))?.description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Field name="logo_url" label="Logo URL" defaultValue={contractor.logo_url ?? ""} placeholder="https://..." />
        <Field name="business_phone" label="Business phone" defaultValue={contractor.business_phone ?? ""} placeholder="(305) 555-0100" />
        <Field name="business_website" label="Website" defaultValue={contractor.business_website ?? ""} placeholder="taskrel.com" />
        <Field name="license_text" label="License / insured text" defaultValue={contractor.license_text ?? ""} placeholder="Licensed and insured in Florida" />
      </div>

      <TextArea
        name="quote_default_note"
        label="Default client note"
        defaultValue={contractor.quote_default_note ?? ""}
        placeholder="Thank you for the opportunity to quote this work."
      />
      <TextArea
        name="quote_default_terms"
        label="Default terms"
        defaultValue={contractor.quote_default_terms ?? ""}
        placeholder="Quote valid for 30 days. A deposit may be required before scheduling."
      />

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-400">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#EA6C0A] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save quote settings"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]"
      />
    </label>
  );
}
