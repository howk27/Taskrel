"use client";

import { useActionState, useRef, useState } from "react";
import { UploadSimple } from "@/components/ui/icons";
import { ReadinessSectionHeader } from "@/components/ui/readiness";
import { updateQuoteSettings, type SettingsActionState } from "@/lib/actions/settings";
import { getQuoteDocumentReadiness } from "@/lib/readiness/setup-readiness";
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
    | "quote_policy_text"
    | "quote_template_preset"
  >;
};

const presetOptions: { value: QuoteTemplatePreset; label: string; description: string }[] = [
  { value: "classic", label: "Classic", description: "Dark work-order style with a strong total block." },
  { value: "modern", label: "Modern", description: "Bright invoice-style document with clear sender/client panels." },
  { value: "compact", label: "Compact", description: "Clean short-form estimate with grouped scope and fewer columns." },
];

export function QuoteDocumentSettingsForm({ contractor }: Props) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(updateQuoteSettings, undefined);
  const [logoUrl, setLogoUrl] = useState(contractor.logo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const safeLogoPreviewUrl = logoUrl.replace(/["\\\n\r]/g, "");
  const readiness = getQuoteDocumentReadiness({
    ...contractor,
    logo_url: logoUrl,
    uploading,
    uploadError,
  });

  async function uploadLogo(file: File) {
    setUploadError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/settings/logo", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setUploading(false);

    if (!response.ok) {
      setUploadError(data.error ?? "Logo upload failed.");
      return;
    }

    setLogoUrl(data.logo_url);
  }

  return (
    <form action={formAction} className="rounded-lg border border-slate-700/70 bg-[#172235] p-4 space-y-4">
      <ReadinessSectionHeader
        title="Quote documents"
        subtitle="These defaults appear on client-facing quote documents."
        item={readiness}
      />

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

      <div className="rounded-xl border border-slate-700 bg-[#0F172A] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Quote logo</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Drop your logo here or choose an image. PNG, JPG, WebP, or GIF up to 2MB.
            </p>
          </div>
          {logoUrl ? (
            <div
              aria-label="Current quote logo"
              className="h-14 w-24 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat p-2"
              style={{ backgroundImage: `url("${safeLogoPreviewUrl}")` }}
            />
          ) : (
            <div className="grid h-14 w-24 shrink-0 place-items-center rounded-lg border border-dashed border-[#F97316] bg-[#111827] text-[10px] font-black uppercase tracking-[0.18em] text-[#F97316]">
              Logo
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            const file = event.dataTransfer.files.item(0);
            if (file) void uploadLogo(file);
          }}
          disabled={uploading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#F97316]/70 bg-[#111827] px-4 py-6 text-sm font-semibold text-slate-200 transition-colors hover:border-[#F97316] hover:bg-[#182235] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadSimple size={20} weight="duotone" className="text-[#F97316]" />
          {uploading ? "Uploading logo..." : "Drop logo or choose file"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.item(0);
            if (file) void uploadLogo(file);
          }}
        />
        {uploadError && <p className="mt-2 text-sm text-red-400">{uploadError}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <input type="hidden" name="logo_url" value={logoUrl} />
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
      <TextArea
        name="quote_policy_text"
        label="Policies & warranty template"
        defaultValue={contractor.quote_policy_text ?? ""}
        placeholder="Workmanship warranty: 1 year. Product warranties follow manufacturer terms. Scope changes require written approval."
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
  value,
  onChange,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        name={name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={event => onChange?.(event.target.value)}
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
