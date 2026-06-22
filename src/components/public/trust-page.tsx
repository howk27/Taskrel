import Link from "next/link";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import { publicLaunch } from "@/lib/public-launch";

type TrustSection = {
  title: string;
  body: string;
};

export function TrustPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: TrustSection[];
}) {
  return (
    <main className="min-h-screen bg-[var(--tr-bg)] px-5 py-6 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Taskrel home">
            <TaskrelWordmark size="sm" />
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[var(--tr-orange)] px-4 py-2 text-sm font-black text-[#241205] transition-colors hover:bg-[var(--tr-amber)]"
          >
            {publicLaunch.primaryCta}
          </Link>
        </nav>

        <section className="py-14 md:py-20">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--tr-amber)]">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--tr-text-muted)]">{intro}</p>
        </section>

        <section className="grid gap-4 pb-14">
          {sections.map(section => (
            <article key={section.title} className="rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
              <h2 className="text-lg font-black text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--tr-text-muted)]">{section.body}</p>
            </article>
          ))}
        </section>

        <footer className="flex flex-col justify-between gap-4 border-t border-white/10 py-8 text-xs text-[var(--tr-text-faint)] sm:flex-row">
          <p>Copyright {new Date().getFullYear()} Taskrel.</p>
          <div className="flex gap-4">
            {publicLaunch.trustLinks.map(link => (
              <Link key={link.href} href={link.href} className="font-semibold text-slate-400 hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
