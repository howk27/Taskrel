import Link from "next/link";
import type { ReactNode } from "react";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import { TaskrelLogo } from "@/components/brand/taskrel-logo";
import { publicLaunch } from "@/lib/public-launch";
import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  FileText,
  HouseLine,
  MapPin,
  Receipt,
  SealCheck,
  Wrench,
} from "@/components/ui/icons";

const workflowSteps = [
  {
    n: "01",
    label: "Capture",
    title: "Start with the job, not a blank quote.",
    body: "Enter the client and describe the work in plain language. Taskrel drafts the line items for you to review.",
    Icon: FileText,
    Visual: CaptureVisual,
  },
  {
    n: "02",
    label: "Review",
    title: "Check every line before it leaves your hands.",
    body: "Edit quantities, rates, and totals. The quote stays a draft — and clearly marked as one — until you send it.",
    Icon: SealCheck,
    Visual: ReviewVisual,
  },
  {
    n: "03",
    label: "Schedule",
    title: "Approved work moves straight to the calendar.",
    body: "When a client approves, the job is ready to schedule. No retyping the address, scope, or price.",
    Icon: CalendarBlank,
    Visual: ScheduleVisual,
  },
  {
    n: "04",
    label: "Get paid",
    title: "Invoice and follow up without the paperwork pile.",
    body: "Turn the job into an invoice, send a payment link, and let Taskrel track what's still owed.",
    Icon: Receipt,
    Visual: InvoiceVisual,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--tr-bg)] text-[var(--tr-text)]">
      <SiteNav />
      <Hero />
      <WorkflowSection />
      <ClientQuoteSection />
      <CloseSection />
      <SiteFooter />
    </main>
  );
}

/* ----------------------------------------------------------------- Nav --- */

function SiteNav() {
  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <Link href="/" aria-label="Taskrel home" className="flex items-center gap-2.5">
        <TaskrelLogo className="h-8 w-8 text-[var(--tr-text)]" />
        <TaskrelWordmark size="sm" />
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="tr-accent-action hidden rounded-lg px-4 py-2 text-sm font-semibold sm:inline-flex"
        >
          {publicLaunch.navCta}
        </Link>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- Hero --- */

function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-14 pt-8 md:grid-cols-[0.92fr_1.08fr] md:px-8 md:pb-24 md:pt-14 lg:gap-16">
      <div className="max-w-xl">
        <p className="tr-rise tr-meta inline-flex items-center gap-2 rounded-full bg-[var(--tr-primary-fill)] px-3 py-1 font-semibold text-[var(--tr-primary)] shadow-[inset_0_0_0_1px_var(--tr-primary-edge)]">
          {publicLaunch.eyebrow}
        </p>

        <h1
          className="tr-rise mt-5 text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--tr-text)] sm:text-5xl lg:text-[3.5rem]"
          style={{ animationDelay: "60ms" }}
        >
          {publicLaunch.headline}
        </h1>

        <p
          className="tr-rise mt-5 max-w-lg text-lg leading-8 text-pretty text-[var(--tr-text-muted)]"
          style={{ animationDelay: "120ms" }}
        >
          {publicLaunch.subheadline}
        </p>

        <div className="tr-rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
          <Link
            href="/signup"
            className="tr-accent-action group inline-flex h-13 items-center justify-center gap-2 rounded-lg px-6 text-base font-semibold"
          >
            {publicLaunch.primaryCta}
            <ArrowRight size={18} weight="bold" className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-13 items-center justify-center rounded-lg border border-[var(--tr-border)] px-6 text-base font-semibold text-[var(--tr-text)] transition-colors hover:border-[var(--tr-primary)]/50 hover:bg-[var(--tr-surface-2)]"
          >
            {publicLaunch.secondaryCta}
          </Link>
        </div>

        <p className="tr-rise tr-meta mt-5 text-[var(--tr-text-faint)]" style={{ animationDelay: "240ms" }}>
          {publicLaunch.priceNote}
        </p>
      </div>

      <div className="tr-rise" style={{ animationDelay: "140ms" }}>
        <HeroQuoteMock />
      </div>
    </section>
  );
}

function HeroQuoteMock() {
  return (
    <div className="tr-elevation-overlay rounded-2xl p-2.5">
      <div className="rounded-xl bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div className="grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]">
          <MockSidebar />
          <div className="tr-elevation-flat rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="tr-h3 text-[var(--tr-text)]">Kitchen cabinet repaint</p>
                <p className="tr-meta mt-1 text-[var(--tr-text-muted)]">Quote · Jun 23, 2026</p>
              </div>
              <span className="inline-flex shrink-0 rounded-md bg-[var(--tr-orange)] px-2.5 py-1 text-xs font-semibold text-[#0a1424]">
                Review &amp; send
              </span>
            </div>

            <QuotePaper />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniMetric label="Active" value="$10.8k" tone="primary" />
              <MiniMetric label="Scheduled" value="6" tone="green" />
              <MiniMetric label="Unpaid" value="$1.9k" tone="amber" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockSidebar() {
  const items = [
    { label: "Dashboard", Icon: HouseLine, active: false },
    { label: "Quotes", Icon: FileText, active: true },
    { label: "Jobs", Icon: Wrench, active: false },
    { label: "Invoices", Icon: Receipt, active: false },
  ];
  return (
    <div className="hidden rounded-lg bg-[var(--tr-surface)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)] lg:block">
      <div className="px-1 pb-3">
        <TaskrelWordmark size="sm" />
      </div>
      <div className="space-y-1">
        {items.map(({ label, Icon, active }) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium ${
              active
                ? "bg-[var(--tr-surface-2)] text-[var(--tr-text)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]"
                : "text-[var(--tr-text-muted)]"
            }`}
          >
            <Icon size={15} weight={active ? "duotone" : "regular"} className={active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"} />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuotePaper() {
  return (
    <div className="mt-4 rounded-lg bg-[#f8fafc] p-4 text-[#0f172a]">
      <div className="flex items-start justify-between gap-4 border-b border-[#dbe2ec] pb-3">
        <div>
          <p className="text-sm font-semibold">Summit Finish Co.</p>
          <p className="text-xs text-[#64748b]">Licensed &amp; insured</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-[#64748b]">Total</p>
          <p className="text-xl font-semibold tabular-nums">$4,820</p>
        </div>
      </div>
      <div className="mt-3 space-y-2.5">
        <PaperLine label="Prep, primer, cabinet finish" detail="1 job × $3,840" value="$3,840" />
        <PaperLine label="Frame painting & reassembly" detail="14 doors × $70" value="$980" />
      </div>
      <div className="mt-3 rounded-md bg-[#eef2f7] p-2.5">
        <p className="text-xs font-semibold text-[#0f172a]">1-year workmanship warranty</p>
        <p className="mt-0.5 text-xs leading-5 text-[#64748b]">Scope changes require written approval.</p>
      </div>
    </div>
  );
}

function PaperLine({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-3 border-b border-[#e7ecf3] pb-2.5 text-sm last:border-0">
      <span className="min-w-0">
        <span className="block truncate font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-[#64748b]">{detail}</span>
      </span>
      <strong className="text-right tabular-nums">{value}</strong>
    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: "primary" | "green" | "amber" }) {
  const toneClass = { primary: "text-[var(--tr-primary)]", green: "text-[var(--tr-green)]", amber: "text-[var(--tr-amber)]" }[tone];
  return (
    <div className="rounded-lg bg-[var(--tr-surface)] p-2.5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <p className="tr-meta text-[var(--tr-text-muted)]">{label}</p>
      <p className={`mt-0.5 text-base font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------- Workflow zigzag --- */

function WorkflowSection() {
  return (
    <section className="border-t border-[var(--tr-border-soft)] bg-[var(--tr-bg-soft)]">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="max-w-2xl">
          <p className="tr-meta font-semibold text-[var(--tr-primary)]">How the work moves</p>
          <h2 className="tr-h2 mt-3 text-3xl font-semibold leading-tight tracking-[-0.01em] text-[var(--tr-text)] md:text-4xl">
            One connected path, four clear moments.
          </h2>
          <p className="tr-body mt-4 text-base leading-7 text-[var(--tr-text-muted)]">
            Each step has a job: collect enough to quote, review before sending, move approved work forward, and get paid.
            Nothing is retyped between them.
          </p>
        </div>

        <div className="mt-14 space-y-16 md:mt-20 md:space-y-24">
          {workflowSteps.map((step, i) => (
            <WorkflowRow key={step.n} step={step} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowRow({
  step,
  flip,
}: {
  step: (typeof workflowSteps)[number];
  flip: boolean;
}) {
  const { n, label, title, body, Icon, Visual } = step;
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className={flip ? "md:order-2" : undefined}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--tr-primary-fill)] text-[var(--tr-primary)] shadow-[inset_0_0_0_1px_var(--tr-primary-edge)]">
            <Icon size={20} weight="duotone" />
          </span>
          <span className="tr-meta font-semibold uppercase tracking-wide text-[var(--tr-text-faint)]">
            {n} · {label}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-semibold leading-snug tracking-[-0.01em] text-[var(--tr-text)]">
          {title}
        </h3>
        <p className="tr-body mt-3 max-w-md text-base leading-7 text-[var(--tr-text-muted)]">{body}</p>
      </div>

      <div className={flip ? "md:order-1" : undefined}>
        <Visual />
      </div>
    </div>
  );
}

/* ----------------------------------------------------- Workflow visuals --- */

function VisualFrame({ children }: { children: ReactNode }) {
  return (
    <div className="tr-elevation-raised rounded-xl p-4 sm:p-5">
      {children}
    </div>
  );
}

function CaptureVisual() {
  return (
    <VisualFrame>
      <p className="tr-meta font-semibold text-[var(--tr-text-muted)]">New quote</p>
      <div className="mt-3 space-y-2.5">
        <MockField label="Client" value="Marisol Reyes" />
        <MockField label="Address" value="412 Palmetto Ave, Hialeah" />
      </div>
      <div className="mt-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <p className="tr-meta font-semibold text-[var(--tr-text-muted)]">Describe the job</p>
        <p className="mt-1.5 text-sm leading-6 text-[var(--tr-text)]">
          Repaint 14 kitchen cabinet doors, prep and prime, reattach hardware. One coat ceiling touch-up.
        </p>
      </div>
      <div className="mt-3 flex justify-end">
        <span className="tr-accent-action inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold">
          <SealCheck size={15} weight="bold" />
          Draft quote
        </span>
      </div>
    </VisualFrame>
  );
}

function ReviewVisual() {
  return (
    <VisualFrame>
      <div className="flex items-center justify-between">
        <p className="tr-meta font-semibold text-[var(--tr-text-muted)]">Line items</p>
        <span className="rounded-md bg-[var(--tr-badge-default-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--tr-badge-default-text)] ring-1 ring-[var(--tr-badge-default-ring)]">
          Draft
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <MockLineItem label="Prep, primer, cabinet finish" detail="1 job × $3,840" value="$3,840" />
        <MockLineItem label="Frame painting & reassembly" detail="14 doors × $70" value="$980" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--tr-border-soft)] pt-3">
        <span className="text-sm font-medium text-[var(--tr-text-muted)]">Total</span>
        <span className="text-lg font-semibold tabular-nums text-[var(--tr-text)]">$4,820</span>
      </div>
    </VisualFrame>
  );
}

function ScheduleVisual() {
  const days = ["M", "T", "W", "T", "F"];
  return (
    <VisualFrame>
      <p className="tr-meta font-semibold text-[var(--tr-text-muted)]">This week</p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="rounded-md bg-[var(--tr-bg-soft)] py-2 text-center shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
            <span className="tr-meta text-[var(--tr-text-faint)]">{d}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3 rounded-lg bg-[var(--tr-primary-fill)] p-3 shadow-[inset_0_0_0_1px_var(--tr-primary-edge)]">
          <CalendarBlank size={18} weight="duotone" className="shrink-0 text-[var(--tr-primary)]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--tr-text)]">Cabinet repaint · Reyes</p>
            <p className="tr-meta text-[var(--tr-text-muted)]">Wed 8:00 AM · 412 Palmetto Ave</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          <Wrench size={18} weight="duotone" className="shrink-0 text-[var(--tr-text-faint)]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--tr-text)]">Deck staining · Okafor</p>
            <p className="tr-meta text-[var(--tr-text-muted)]">Fri 9:30 AM</p>
          </div>
        </div>
      </div>
    </VisualFrame>
  );
}

function InvoiceVisual() {
  return (
    <VisualFrame>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tr-meta font-semibold text-[var(--tr-text-muted)]">Invoice #1042</p>
          <p className="mt-1 text-sm font-semibold text-[var(--tr-text)]">Marisol Reyes</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--tr-badge-success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--tr-badge-success-text)] ring-1 ring-[var(--tr-badge-success-ring)]">
          <CheckCircle size={13} weight="fill" />
          Paid
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="tr-meta text-[var(--tr-text-muted)]">Amount</p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--tr-text)]">$4,820</p>
        </div>
        <div className="text-right">
          <p className="tr-meta text-[var(--tr-text-muted)]">Paid via</p>
          <p className="text-sm font-semibold text-[var(--tr-text)]">Card · Stripe</p>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--tr-bg-soft)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div className="h-full w-full rounded-full bg-[var(--tr-green)]" />
      </div>
    </VisualFrame>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--tr-bg-soft)] px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <span className="tr-meta font-semibold text-[var(--tr-text-faint)]">{label}</span>
      <span className="truncate text-sm font-medium text-[var(--tr-text)]">{value}</span>
    </div>
  );
}

function MockLineItem({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3 rounded-lg bg-[var(--tr-bg-soft)] px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[var(--tr-text)]">{label}</span>
        <span className="tr-meta mt-0.5 block text-[var(--tr-text-muted)]">{detail}</span>
      </span>
      <strong className="text-right text-sm tabular-nums text-[var(--tr-text)]">{value}</strong>
    </div>
  );
}

/* ------------------------------------------------ Client-facing quote --- */

function ClientQuoteSection() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-24">
      <div className="max-w-lg">
        <p className="tr-meta font-semibold text-[var(--tr-primary)]">What your client sees</p>
        <h2 className="tr-h2 mt-3 text-3xl font-semibold leading-tight tracking-[-0.01em] text-[var(--tr-text)] md:text-4xl">
          A quote that looks like you ran a real business.
        </h2>
        <p className="tr-body mt-4 text-base leading-7 text-[var(--tr-text-muted)]">
          Your details, the client&apos;s, a clear scope with quantities and prices, totals, terms, and warranty — laid out
          so there&apos;s no guessing about what they&apos;re approving.
        </p>
        <ul className="mt-6 space-y-2.5">
          {[
            "Business identity and license up top",
            "Itemized scope with quantity, rate, and amount",
            "Subtotal, tax, and total — no surprises",
            "Terms, policies, and warranty in plain words",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-[var(--tr-green)]" />
              <span className="text-sm leading-6 text-[var(--tr-text)]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="tr-elevation-overlay rounded-2xl p-5 sm:p-7">
        <FullQuotePaper />
      </div>
    </section>
  );
}

function FullQuotePaper() {
  return (
    <div className="rounded-lg bg-[#f8fafc] p-5 text-[#0f172a] sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-[#dbe2ec] pb-4">
        <div>
          <p className="text-base font-semibold">Summit Finish Co.</p>
          <p className="text-xs text-[#64748b]">License #CFC-100482 · Licensed &amp; insured</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Quote</p>
          <p className="text-xs text-[#64748b]">Jun 23, 2026</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          <p className="text-xs font-medium text-[#64748b]">Prepared for</p>
          <p className="font-semibold">Marisol Reyes</p>
          <p className="text-xs text-[#64748b]">412 Palmetto Ave, Hialeah FL</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <PaperLine label="Prep, primer, cabinet finish" detail="1 job × $3,840" value="$3,840" />
        <PaperLine label="Frame painting & reassembly" detail="14 doors × $70" value="$980" />
      </div>

      <div className="mt-4 space-y-1.5 border-t border-[#dbe2ec] pt-4 text-sm">
        <div className="flex justify-between text-[#475569]">
          <span>Subtotal</span>
          <span className="tabular-nums">$4,820</span>
        </div>
        <div className="flex justify-between text-[#475569]">
          <span>Tax</span>
          <span className="tabular-nums">$0.00</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">$4,820</span>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-[#eef2f7] p-3">
        <p className="text-xs font-semibold">Terms &amp; warranty</p>
        <p className="mt-1 text-xs leading-5 text-[#64748b]">
          50% deposit to schedule. 1-year workmanship warranty. Scope changes require written approval.
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Close --- */

function CloseSection() {
  return (
    <section className="border-t border-[var(--tr-border-soft)] bg-[var(--tr-bg-soft)] px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_360px] md:items-center">
        <div className="max-w-xl">
          <span className="flex items-center gap-3">
            <TaskrelLogo className="h-10 w-10 text-[var(--tr-text)]" />
            <TaskrelWordmark size="md" />
          </span>
          <h2 className="tr-h2 mt-6 text-3xl font-semibold leading-tight tracking-[-0.01em] text-[var(--tr-text)] md:text-4xl">
            {publicLaunch.proofHeading}
          </h2>
          <p className="tr-body mt-4 text-base leading-7 text-[var(--tr-text-muted)]">
            {publicLaunch.proofBody}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="tr-accent-action inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold"
            >
              {publicLaunch.primaryCta}
              <ArrowRight size={17} weight="bold" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--tr-border)] px-5 text-sm font-semibold text-[var(--tr-text)] transition-colors hover:bg-[var(--tr-surface-2)]"
            >
              Log in
            </Link>
          </div>
        </div>

        <div className="tr-elevation-raised rounded-xl p-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-[var(--tr-text)]">{publicLaunch.price.split("/")[0]}</span>
            <span className="text-sm font-medium text-[var(--tr-text-muted)]">/ month</span>
          </div>
          <p className="tr-meta mt-1 font-semibold text-[var(--tr-primary)]">{publicLaunch.pricingLabel}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--tr-text-muted)]">{publicLaunch.pricingBody}</p>
          <ul className="mt-4 space-y-2.5 border-t border-[var(--tr-border-soft)] pt-4">
            {publicLaunch.included.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--tr-text)]">
                <CheckCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-[var(--tr-green)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Footer --- */

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--tr-border-soft)] px-5 py-12 text-sm text-[var(--tr-text-muted)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-[var(--tr-text-faint)]">
          <MapPin size={15} weight="duotone" />
          <p>Copyright {new Date().getFullYear()} Taskrel · taskrel.com</p>
        </div>
        <div className="flex items-center gap-4">
          {publicLaunch.trustLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-semibold text-[var(--tr-text-muted)] transition-colors hover:text-[var(--tr-text)]">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
