import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5">
        <span className="text-xl font-black tracking-tight text-white">
          task<span className="text-[#F97316]">rel</span>
        </span>
        <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#F97316]/30 bg-[#F97316]/10 px-4 py-1.5 mb-8">
          <span className="h-2 w-2 rounded-full bg-[#F97316] animate-pulse" />
          <span className="text-xs font-medium text-[#F97316]">Built for South Florida contractors</span>
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white leading-tight max-w-xs mx-auto">
          Quote jobs in<br /><span className="text-[#F97316]">under 2 minutes.</span>
        </h1>

        <p className="mt-5 text-base text-slate-400 max-w-sm mx-auto leading-relaxed">
          AI-powered quotes, invoicing, and scheduling — all from your phone. No laptop. No learning curve.
        </p>

        <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/signup"
            className="flex h-14 items-center justify-center rounded-xl bg-[#F97316] text-base font-bold text-white transition-colors hover:bg-[#EA6C0A] active:scale-[0.98]"
          >
            Start free — no credit card
          </Link>
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-xl border border-slate-700 text-base font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            I have an account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-16 max-w-sm mx-auto w-full space-y-4">
        {[
          {
            icon: "⚡",
            title: "AI quotes in seconds",
            desc: "Describe the job. Get a professional, itemized quote. Send it on the spot.",
          },
          {
            icon: "💸",
            title: "Get paid faster",
            desc: "Send invoices with a payment link. Clients pay by card, money goes straight to you.",
          },
          {
            icon: "📅",
            title: "Know your schedule",
            desc: "Jobs auto-populate your calendar when quotes are approved. No double-entry.",
          },
          {
            icon: "📱",
            title: "Works from your phone",
            desc: "No app download. Open taskrel.com and you're ready. Works on any Android or iPhone.",
          },
        ].map(f => (
          <div key={f.title} className="flex gap-4 rounded-xl bg-[#1E293B] p-4">
            <span className="text-2xl leading-none mt-0.5">{f.icon}</span>
            <div>
              <p className="text-white font-semibold text-sm">{f.title}</p>
              <p className="text-slate-400 text-sm mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="px-6 pb-16 max-w-sm mx-auto w-full">
        <div className="rounded-2xl border border-[#F97316]/30 bg-[#1E293B] p-6 text-center">
          <p className="text-4xl font-black text-white">$19<span className="text-lg font-normal text-slate-400">/mo</span></p>
          <p className="text-slate-400 text-sm mt-1">Everything. Unlimited. Flat rate.</p>
          <ul className="mt-5 space-y-2 text-left text-sm">
            {["Unlimited AI quotes", "Invoicing with Stripe payments", "Job calendar", "CSV export", "Email & SMS delivery"].map(item => (
              <li key={item} className="flex items-center gap-2 text-slate-300">
                <svg viewBox="0 0 20 20" fill="#F97316" className="w-4 h-4 shrink-0">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#F97316] text-base font-bold text-white hover:bg-[#EA6C0A]"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8 text-xs text-slate-600">
        © {new Date().getFullYear()} Taskrel · taskrel.com
      </footer>
    </main>
  );
}
