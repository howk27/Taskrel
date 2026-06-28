"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarBlank,
  DeviceMobile,
  FileText,
  Gear,
  HouseLine,
  Lightning,
  List,
  MagnifyingGlass,
  Moon,
  Plus,
  Receipt,
  Sun,
  UserList,
  Wrench,
  X,
} from "@/components/ui/icons";
import type { Trade } from "@/types";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";

type ShellContractor = {
  business_name: string | null;
  email: string | null;
  trade: Trade | null;
  primary_trade: Trade | null;
};

const nav = [
  { href: "/dashboard", label: "Dashboard", Icon: HouseLine },
  { href: "/jobs", label: "Jobs", Icon: Wrench },
  { href: "/quotes", label: "Quotes", Icon: FileText },
  { href: "/invoices", label: "Invoices", Icon: Receipt },
  { href: "/clients", label: "Clients", Icon: UserList },
  { href: "/ai-assistant", label: "Notices", Icon: Lightning },
  { href: "/settings", label: "Settings", Icon: Gear },
];

// Bottom bar shows the four highest-frequency destinations; everything else
// is reachable from the "More" sheet so no destination is lost below xl.
const mobilePrimaryNav = nav.filter(item =>
  ["/dashboard", "/jobs", "/quotes", "/invoices"].includes(item.href)
);

const mobileMoreNav = [
  { href: "/calendar", label: "Calendar", Icon: CalendarBlank },
  { href: "/clients", label: "Clients", Icon: UserList },
  { href: "/ai-assistant", label: "Notices", Icon: Lightning },
  { href: "/settings", label: "Settings", Icon: Gear },
];

export function AppShell({
  children,
  contractor,
}: {
  children: ReactNode;
  contractor: ShellContractor | null;
}) {
  const pathname = usePathname();
  const businessName = contractor?.business_name || "Taskrel";
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [moreOpen, setMoreOpen] = useState(false);
  const focusedOnboarding = pathname === "/onboarding";
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const moreActive = mobileMoreNav.some(item => isActive(item.href));

  // Close the More sheet whenever the route changes (e.g. after tapping a link).
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close the More sheet on Escape and lock body scroll while it is open.
  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "system") {
      root.removeAttribute("data-theme");
      window.localStorage.setItem("taskrel-theme", "system");
      return;
    }

    root.setAttribute("data-theme", themeMode);
    window.localStorage.setItem("taskrel-theme", themeMode);
  }, [themeMode]);

  if (focusedOnboarding) {
    return (
      <div className="min-h-screen bg-[var(--tr-bg)] text-[var(--tr-text)]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tr-bg)] text-[var(--tr-text)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] border-r border-[var(--tr-border)] bg-[var(--tr-shell)] xl:flex xl:flex-col">
        <div className="border-b border-[var(--tr-border-soft)] px-4 py-4">
          <Link href="/dashboard" className="block">
            <TaskrelWordmark size="md" />
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--tr-surface-2)] text-[var(--tr-text)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]"
                    : "text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface)] hover:text-[var(--tr-text)]"
                }`}
              >
                {active && <span className="absolute left-0 h-5 w-0.5 rounded-r bg-[var(--tr-primary)]" />}
                <Icon size={18} weight={active ? "duotone" : "regular"} className={active ? "text-[var(--tr-primary)]" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--tr-border-soft)] p-2.5">
          <ThemeToggle mode={themeMode} onChange={setThemeMode} expanded />
          <div className="mt-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
            <p className="truncate text-sm font-medium text-[var(--tr-text)]">{businessName}</p>
            <p className="truncate text-sm text-[var(--tr-text-muted)]">{contractor?.email ?? "Contractor workspace"}</p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 hidden h-14 grid-cols-[1fr_minmax(320px,480px)_1fr] items-center border-b border-[var(--tr-border-soft)] bg-[var(--tr-bg)]/96 px-5 backdrop-blur xl:ml-[236px] xl:grid">
        <form
          action="/quotes"
          role="search"
          className="col-start-2 flex h-11 w-full items-center gap-3 rounded-lg border border-[var(--tr-border)] bg-[var(--tr-bg-soft)] px-4 transition-colors focus-within:border-[var(--tr-primary)]/60"
        >
          <MagnifyingGlass size={20} className="text-[var(--tr-text-faint)]" />
          <input
            name="q"
            type="search"
            enterKeyHint="search"
            aria-label="Search quotes by client, address, contact, or status"
            placeholder="Search quotes by client, address, or status..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--tr-text)] placeholder:text-[var(--tr-text-faint)] focus:outline-none"
          />
        </form>
        <div className="col-start-3 flex items-center justify-end gap-3">
          <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          <Link href="/calendar" className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--tr-border)] text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]">
            <CalendarBlank size={20} />
          </Link>
          <Link href="/quotes/new" className="tr-primary-action inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold">
            <Plus size={17} weight="bold" />
            Create new
          </Link>
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-[var(--tr-border)] bg-[var(--tr-bg)]/95 px-4 backdrop-blur-xl safe-top xl:hidden">
        <div className="mx-auto grid h-14 max-w-lg grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <Link href="/dashboard" className="flex min-w-0 items-center">
            <TaskrelWordmark size="sm" />
            <span className="sr-only">Taskrel dashboard</span>
          </Link>
          <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          <Link
            href="/quotes/new"
            className="tr-primary-action inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold"
          >
            <Plus size={17} weight="bold" />
            Create
          </Link>
        </div>
      </header>

      <main className="pb-24 xl:ml-[236px] xl:pb-0">
        {children}
      </main>

      {moreOpen && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="More destinations">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--tr-border)] bg-[var(--tr-bg)] pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-sm font-semibold text-[var(--tr-text-muted)]">More</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-lg text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <nav className="px-2 pb-2">
              {mobileMoreNav.map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-base font-semibold transition-colors ${
                      active
                        ? "bg-[var(--tr-surface-2)] text-[var(--tr-text)]"
                        : "text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface)] hover:text-[var(--tr-text)]"
                    }`}
                  >
                    <Icon size={22} weight={active ? "duotone" : "regular"} className={active ? "text-[var(--tr-primary)]" : ""} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--tr-border)] bg-[var(--tr-bg)]/95 backdrop-blur safe-bottom xl:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-stretch">
          {mobilePrimaryNav.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition-colors ${
                  active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"
                }`}
              >
                <Icon size={22} weight={active ? "duotone" : "regular"} />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-label="More destinations"
            onClick={() => setMoreOpen(open => !open)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition-colors ${
              moreOpen || moreActive ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"
            }`}
          >
            <List size={22} weight={moreOpen || moreActive ? "duotone" : "regular"} />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}

type ThemeMode = "system" | "light" | "dark";

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const saved = window.localStorage.getItem("taskrel-theme");
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function ThemeToggle({
  mode,
  onChange,
  expanded = false,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  expanded?: boolean;
}) {
  const nextMode: Record<ThemeMode, ThemeMode> = {
    system: "light",
    light: "dark",
    dark: "system",
  };
  const label = mode === "system" ? "System theme" : mode === "light" ? "Light theme" : "Dark theme";
  const Icon = mode === "system" ? DeviceMobile : mode === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => onChange(nextMode[mode])}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--tr-border)] bg-[var(--tr-bg-soft)] px-3 text-sm font-semibold text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)] ${
        expanded ? "w-full justify-start" : "w-10"
      }`}
      aria-label={`Theme mode: ${label}. Click to change.`}
      title={label}
    >
      <Icon size={18} weight="duotone" />
      {expanded && <span>{label}</span>}
    </button>
  );
}
