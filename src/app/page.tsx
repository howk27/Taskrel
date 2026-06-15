import Link from "next/link";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import {
  CalendarBlank,
  CheckCircle,
  FileText,
  Hammer,
  HouseLine,
  Invoice,
  PaintBrush,
  Receipt,
  SealCheck,
} from "@/components/ui/icons";

const workflow = [
  { label: "Create quote", Icon: FileText },
  { label: "Review pricing", Icon: SealCheck },
  { label: "Schedule job", Icon: CalendarBlank },
  { label: "Send invoice", Icon: Receipt },
];

const trades = [
  { label: "Painting", Icon: PaintBrush },
  { label: "Roofing", Icon: HouseLine },
  { label: "Repairs", Icon: Hammer },
];

const included = [
  "AI-assisted quote drafts",
  "Editable pricing before sending",
  "Saved contractor rates",
  "Branded quote templates",
  "Job calendar and invoice flow",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b1326] text-white">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" aria-label="Taskrel home">
          <TaskrelWordmark size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="hidden rounded-lg bg-[var(--tr-orange)] px-4 py-2 text-sm font-black text-[#111827] transition-colors hover:bg-[var(--tr-amber)] sm:inline-flex"
          >
            Start testing
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-start gap-12 px-5 pb-12 pt-7 md:grid-cols-[0.92fr_1.08fr] md:px-8 md:pb-16 md:pt-14 lg:gap-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--tr-orange)]/35 bg-[var(--tr-orange)]/10 px-4 py-2 text-xs font-bold uppercase text-[var(--tr-amber)]">
            Built for small trade contractors
          </div>

          <h1 className="mt-7 max-w-2xl text-4xl font-black leading-[1.04] text-white sm:text-5xl lg:text-6xl">
            Quotes, schedules, and invoices in one field-ready workflow.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--tr-text-muted)]">
            Taskrel helps contractors turn job notes into branded quotes, edit pricing before sending, schedule approved work, and keep invoice follow-up visible.
          </p>

          <div className="mt-8 flex flex-col gap-3 lg:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-13 items-center justify-center rounded-lg bg-[var(--tr-orange)] px-6 text-base font-black text-[#111827] transition-colors hover:bg-[var(--tr-amber)]"
            >
              Join the closed test
            </Link>
            <Link
              href="/login"
              className="inline-flex h-13 items-center justify-center rounded-lg border border-white/15 px-6 text-base font-bold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5"
            >
              Open your workspace
            </Link>
          </div>

        </div>

        <HeroVisual />

        <div className="grid gap-3 sm:grid-cols-3 md:col-span-2">
          {trades.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--tr-blue)]/12 text-[var(--tr-blue)]">
                <Icon size={20} weight="duotone" />
              </span>
              <span className="text-sm font-bold text-slate-200">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101827]/80 px-5 py-10 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {workflow.map(({ label, Icon }, index) => (
            <div key={label} className="flex items-center gap-4 rounded-lg border border-white/10 bg-[#172235] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-[var(--tr-amber)]">
                <Icon size={22} weight="duotone" />
              </span>
              <div>
                <p className="text-xs font-black uppercase text-[var(--tr-text-faint)]">Step {index + 1}</p>
                <p className="mt-1 text-sm font-bold text-white">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-24">
        <div>
          <p className="text-sm font-black uppercase text-[var(--tr-amber)]">Why it feels different</p>
          <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight md:text-4xl">
            Less software setup. More work getting organized.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--tr-text-muted)]">
            The first test version focuses on the work contractors repeat: quote, review, schedule, invoice. Pricing can be edited before anything goes to a client, and Taskrel remembers those rates for future quotes.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoPanel title="Consistent quotes" body="Classic, Modern, and Compact templates share your logo, terms, policy language, and quote math." tone="amber" />
          <InfoPanel title="Owner work queue" body="Dashboard cards expand into quote details so the next action is obvious without digging." tone="blue" />
          <InfoPanel title="Pricing memory" body="Edited line item prices become saved contractor rates for similar future quotes." tone="green" />
          <InfoPanel title="Closed-test ready" body="Email quote delivery works now; SMS, billing, and sheets can stay optional until you want them." tone="violet" />
        </div>
      </section>

      <section className="px-5 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-2xl border border-white/10 bg-[#172235] p-6 md:grid-cols-[1fr_360px] md:p-8">
          <div>
            <TaskrelWordmark size="md" />
            <h2 className="mt-6 text-3xl font-black leading-tight text-white">Ready for a real contractor to try?</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--tr-text-muted)]">
              Invite one business owner, watch the first quote workflow, and collect feedback on what feels useful, confusing, or missing.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--tr-orange)] px-5 text-sm font-black text-[#111827] hover:bg-[var(--tr-amber)]"
              >
                Start closed test
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-bold text-slate-200 hover:bg-white/5"
              >
                Log in
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0f172a] p-5">
            <p className="text-sm font-black uppercase text-[var(--tr-text-faint)]">$19/mo after launch</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {included.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-[var(--tr-green)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-[var(--tr-text-faint)]">
        Copyright {new Date().getFullYear()} Taskrel. taskrel.com
      </footer>
    </main>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/10 bg-[#151922] p-3 shadow-2xl shadow-black/30">
        <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-white/10 bg-[#0f172a] p-4">
            <div className="mb-5 flex items-center justify-between">
              <TaskrelWordmark size="sm" />
              <span className="rounded-full bg-[var(--tr-green)]/12 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--tr-green)]">Live</span>
            </div>
            <div className="space-y-3">
              <QueueCard client="Maria Gonzalez" status="Sent" action="Follow up" total="$3,857" tone="blue" />
              <QueueCard client="Elena Rodriguez" status="Draft" action="Review pricing" total="$4,660" tone="amber" />
              <QueueCard client="Priya Shah" status="Scheduled" action="Open schedule" total="$2,300" tone="green" />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101827] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-[var(--tr-text-faint)]">Quote preview</p>
                <p className="mt-1 text-lg font-black text-white">Kitchen cabinet repaint</p>
              </div>
              <span className="rounded-lg bg-[var(--tr-orange)] px-3 py-2 text-xs font-black text-[#111827]">Review & Send</span>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
              <div className="rounded-xl bg-[#fffaf5] p-4 text-[#1f2937]">
                <div className="flex items-start justify-between gap-4 border-b border-[#fed7aa] pb-4">
                  <div>
                    <div className="mb-3 grid h-12 w-20 place-items-center rounded-lg border border-dashed border-[#b45309] text-[10px] font-black uppercase text-[#b45309]">Logo</div>
                    <p className="font-black">Deivi Painting Co.</p>
                    <p className="text-xs text-[#9a3412]">Licensed & insured</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-[#9a3412]">Total</p>
                    <p className="text-2xl font-black">$4,820</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <LineItem label="Prep, primer, cabinet finish" value="$3,840" />
                  <LineItem label="Frame painting and reassembly" value="$980" />
                </div>
                <div className="mt-4 rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-3">
                  <p className="text-[10px] font-black uppercase text-[#b45309]">Policies & warranty</p>
                  <p className="mt-1 text-xs leading-5 text-[#7c2d12]">1-year workmanship warranty. Scope changes require approval.</p>
                </div>
              </div>

              <div className="space-y-3">
                <Metric title="Active quotes" value="$10.8k" tone="blue" />
                <Metric title="Scheduled jobs" value="6" tone="green" />
                <Metric title="Unpaid invoices" value="$1.9k" tone="amber" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueCard({
  client,
  status,
  action,
  total,
  tone,
}: {
  client: string;
  status: string;
  action: string;
  total: string;
  tone: "blue" | "amber" | "green";
}) {
  const toneClass = {
    blue: "text-[var(--tr-blue)] bg-[var(--tr-blue)]/10",
    amber: "text-[var(--tr-amber)] bg-[var(--tr-amber)]/10",
    green: "text-[var(--tr-green)] bg-[var(--tr-green)]/10",
  }[tone];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-bold text-white">{client}</p>
        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${toneClass}`}>{status}</span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-xs font-semibold text-[var(--tr-text-muted)]">{action}</p>
        <p className="text-lg font-black text-white">{total}</p>
      </div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#fed7aa] pb-3 text-sm">
      <span>{label}</span>
      <strong className="whitespace-nowrap">{value}</strong>
    </div>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: "blue" | "amber" | "green" }) {
  const toneClass = {
    blue: "text-[var(--tr-blue)]",
    amber: "text-[var(--tr-amber)]",
    green: "text-[var(--tr-green)]",
  }[tone];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase text-[var(--tr-text-faint)]">{title}</p>
      <p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function InfoPanel({ title, body, tone }: { title: string; body: string; tone: "blue" | "amber" | "green" | "violet" }) {
  const toneClass = {
    blue: "text-[var(--tr-blue)] bg-[var(--tr-blue)]/10",
    amber: "text-[var(--tr-amber)] bg-[var(--tr-amber)]/10",
    green: "text-[var(--tr-green)] bg-[var(--tr-green)]/10",
    violet: "text-[var(--tr-violet)] bg-[var(--tr-violet)]/10",
  }[tone];

  return (
    <div className="rounded-xl border border-white/10 bg-[#172235] p-5">
      <span className={`mb-4 grid h-10 w-10 place-items-center rounded-lg ${toneClass}`}>
        <Invoice size={20} weight="duotone" />
      </span>
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[var(--tr-text-muted)]">{body}</p>
    </div>
  );
}
