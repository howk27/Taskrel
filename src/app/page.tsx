import Link from "next/link";
import { CalendarBlank, CheckCircle, DeviceMobile, FileText, Receipt } from "@/components/ui/icons";

const features = [
  {
    icon: FileText,
    title: "Consistent quotes",
    desc: "Turn job notes into itemized quotes with the same clean format every time.",
  },
  {
    icon: Receipt,
    title: "Get paid faster",
    desc: "Send invoices with a payment link and keep unpaid work visible.",
  },
  {
    icon: CalendarBlank,
    title: "Know your schedule",
    desc: "Approved work becomes scheduled jobs without double entry.",
  },
  {
    icon: DeviceMobile,
    title: "Built for the field",
    desc: "Create, send, and follow up from any phone browser.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-5">
        <span className="text-xl font-black tracking-tight text-white">
          task<span className="text-[#F97316]">rel</span>
        </span>
        <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">
          Log in
        </Link>
      </nav>

      <section className="flex-1 px-6 py-14">
        <div className="mx-auto flex w-full max-w-sm flex-col justify-center">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-[#F97316]/30 bg-[#F97316]/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#F97316]" />
            <span className="text-xs font-medium text-[#F97316]">Built for South Florida contractors</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white leading-tight">
            Quote jobs in <span className="text-[#F97316]">under 2 minutes.</span>
          </h1>

          <p className="mt-5 text-base text-slate-400 leading-relaxed">
            AI-powered quotes, invoicing, and scheduling from your phone. No laptop, no heavy setup.
          </p>

          <div className="mt-10 flex flex-col gap-3">
            <Link
              href="/signup"
              className="flex h-14 items-center justify-center rounded-lg bg-[#F97316] text-base font-bold text-white transition-colors hover:bg-[#EA6C0A] active:scale-[0.98]"
            >
              Start free - no credit card
            </Link>
            <Link
              href="/login"
              className="flex h-12 items-center justify-center rounded-lg border border-slate-700 text-base font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-14 max-w-sm mx-auto w-full space-y-3">
        {features.map(feature => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="flex gap-4 rounded-lg border border-slate-700/70 bg-[#172235] p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
                <Icon size={22} weight="duotone" />
              </span>
              <div>
                <p className="text-white font-semibold text-sm">{feature.title}</p>
                <p className="text-slate-400 text-sm mt-0.5">{feature.desc}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="px-6 pb-16 max-w-sm mx-auto w-full">
        <div className="rounded-lg border border-[#F97316]/30 bg-[#172235] p-6 text-center">
          <p className="text-4xl font-black text-white">$19<span className="text-lg font-normal text-slate-400">/mo</span></p>
          <p className="text-slate-400 text-sm mt-1">Everything. Unlimited. Flat rate.</p>
          <ul className="mt-5 space-y-2 text-left text-sm">
            {["Unlimited AI quotes", "Invoicing with Stripe payments", "Job calendar", "CSV export", "Email and SMS delivery"].map(item => (
              <li key={item} className="flex items-center gap-2 text-slate-300">
                <CheckCircle size={17} weight="fill" className="shrink-0 text-[#F97316]" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-[#F97316] text-base font-bold text-white hover:bg-[#EA6C0A]"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="pb-8 text-center text-xs text-slate-600">
        Copyright {new Date().getFullYear()} Taskrel. taskrel.com
      </footer>
    </main>
  );
}
