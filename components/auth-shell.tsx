import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="hero-wash grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 lg:flex">
        <Link href="/" className="text-xl font-semibold tracking-tight">Ace<span className="text-copper">It</span></Link>
        <div>
          <p className="max-w-md text-3xl font-semibold tracking-tight">Walk in knowing which projects they will ask about.</p>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">Portfolio, placement history, and a mock interview that uses your actual work.</p>
        </div>
        <p className="text-sm text-muted">Preparation notes, not hiring predictions.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
          <Link href="/" className="text-lg font-semibold lg:hidden">Ace<span className="text-copper">It</span></Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-4 text-sm text-muted">{footer}</p>
        </div>
      </div>
    </div>
  );
}
