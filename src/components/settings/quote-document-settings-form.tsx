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

const presetOptions: { value: QuoteTemplatePreset; label: string }[] = [
  { value: "classic", label: "Executive Estimate" },
  { value: "modern", label: "Premium Proposal" },
  { value: "compact", label: "Work Order" },
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
    <form action={formAction} className="space-y-4 rounded-lg bg-[var(--tr-surface)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <ReadinessSectionHeader
        title="Document defaults"
        subtitle="Client-facing quote defaults."
        item={readiness}
      />

      <section className="space-y-3 border-t border-[var(--tr-border-soft)] pt-4">
        <h3 className="text-base font-semibold text-[var(--tr-text)]">Template</h3>
        <label className="text-sm font-medium text-[var(--tr-text-muted)]" htmlFor="quote_template_preset">Default quote template</label>
        <select
          id="quote_template_preset"
          name="quote_template_preset"
          defaultValue={contractor.quote_template_preset ?? "classic"}
          className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"
        >
          {presetOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </section>

      <section className="border-t border-[var(--tr-border-soft)] pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--tr-text)]">Logo</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">Shown in the quote header.</p>
          </div>
          {logoUrl ? (
            <div
              aria-label="Current quote logo"
              className="h-14 w-24 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat p-2"
              style={{ backgroundImage: `url("${safeLogoPreviewUrl}")` }}
            />
          ) : (
            <div className="grid h-14 w-24 shrink-0 place-items-center rounded-lg border border-dashed border-[var(--tr-primary-edge)] bg-[var(--tr-primary-fill)] text-sm font-semibold text-[var(--tr-primary)]">
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--tr-primary-edge)] bg-[var(--tr-primary-fill)] px-4 py-6 text-sm font-semibold text-[var(--tr-primary)] transition-colors hover:bg-[var(--tr-primary-fill-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadSimple size={20} weight="duotone" />
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
        {uploadError && <p className="mt-2 text-sm text-[var(--tr-red)]">{uploadError}</p>}
      </section>

      <section className="grid grid-cols-1 gap-3 border-t border-[var(--tr-border-soft)] pt-4">
        <h3 className="text-base font-semibold text-[var(--tr-text)]">Business contact</h3>
        <input type="hidden" name="logo_url" value={logoUrl} />
        <Field name="business_phone" label="Business phone" defaultValue={contractor.business_phone ?? ""} placeholder="(305) 555-0100" />
        <Field name="business_website" label="Website" defaultValue={contractor.business_website ?? ""} placeholder="taskrel.com" />
        <Field name="license_text" label="License / insured text" defaultValue={contractor.license_text ?? ""} placeholder="Licensed and insured in Florida" />
      </section>

      <section className="space-y-3 border-t border-[var(--tr-border-soft)] pt-4">
        <h3 className="text-base font-semibold text-[var(--tr-text)]">Client text</h3>
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
      </section>

      {state?.error && <p className="text-sm text-[var(--tr-red)]">{state.error}</p>}
      {state?.success && <p className="text-sm text-[var(--tr-green)]">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="tr-primary-action w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
      <span className="text-sm font-medium text-[var(--tr-text-muted)]">{label}</span>
      <input
        name={name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={event => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"
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
      <span className="text-sm font-medium text-[var(--tr-text-muted)]">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className="tr-input mt-1.5 w-full resize-none rounded-lg px-3 py-2.5 text-sm"
      />
    </label>
  );
}
