import Link from "next/link";

export default function HomePage() {
  return (
    <div className="hero-wash min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">Ace<span className="text-copper">It</span></Link>
        <div className="flex gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-muted hover:text-ink">Sign in</Link>
          <Link href="/register" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink">Create profile</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="max-w-3xl pt-10 md:pt-16">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-copper">Profile, portfolio, interview coach</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Know the interview before you walk in.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Build your profile, generate a portfolio for the company and role you want, then practice the interview and read the feedback.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink">Start with your profile</Link>
            <Link href="/login" className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium">Sign in</Link>
          </div>
        </section>
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            ["Profile", "Education, skills, projects, certifications, and experience."],
            ["Portfolio", "Generated from your profile for the company and role you choose."],
            ["Interview coach", "Questions about your work, then feedback on the answers you give."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-line bg-surface p-4">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
