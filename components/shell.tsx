"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  LayoutDashboard,
  Library,
  LogOut,
  MessagesSquare,
  PanelsTopLeft,
  ScanSearch,
  UserRound,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/prepare", label: "Target", icon: Crosshair },
  { href: "/portfolio", label: "Portfolio", icon: PanelsTopLeft },
  { href: "/interview", label: "Interview", icon: MessagesSquare },
  { href: "/insights", label: "Insights", icon: Library },
  { href: "/analysis", label: "Analysis", icon: ScanSearch },
];

export function Shell({
  name,
  completion,
  target,
  portfolioStale,
  children,
}: {
  name: string;
  role: "STUDENT" | "ADMIN";
  completion: number;
  target: { company: string; role: string } | null;
  portfolioStale: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-stage fixed inset-0 overflow-hidden md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden h-full min-h-0 border-r border-line bg-surface/80 backdrop-blur-xl md:flex md:flex-col">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Ace<span className="text-copper">It</span>
          </Link>
          <p className="mt-1 text-xs text-muted">Interview readiness</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-item flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                  active ? "bg-surface-2 text-ink shadow-[inset_2px_0_0_var(--copper)]" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="mt-2 text-xs text-muted">Profile {completion}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="bar-fill h-full rounded-full bg-accent" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </aside>
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <header className="glass-bar z-20 shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
            <Link href="/dashboard" className="text-base font-semibold md:hidden">
              Ace<span className="text-copper">It</span>
            </Link>
            {target ? (
              <Link href="/prepare" className="truncate rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted hover:border-copper">
                Preparing for <span className="font-medium text-ink">{target.company}</span>
                <span className="mx-1 text-copper">→</span>
                {target.role}
              </Link>
            ) : (
              <Link href="/prepare" className="rounded-full border border-line px-3 py-1 text-sm text-copper hover:bg-surface">
                Choose a target company
              </Link>
            )}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <form action={logout}>
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </form>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 md:hidden">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs",
                    active ? "bg-surface-2 text-ink" : "text-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {portfolioStale ? (
          <div className="border-b border-line bg-copper/10 px-4 py-2 text-sm md:px-8">
            The portfolio could not refresh from your latest profile.{" "}
            <Link href="/portfolio" className="font-medium text-copper">
              Open portfolio
            </Link>
            .
          </div>
        ) : null}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div key={pathname} className="page-enter mx-auto w-full min-w-0 max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
