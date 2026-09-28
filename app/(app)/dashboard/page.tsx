import Link from "next/link";
import { ArrowRight, Sparkles, UserRound } from "lucide-react";
import { TrendChart } from "@/components/charts";
import { ScoreRing } from "@/components/motion";
import { requireUser } from "@/lib/guard";
import { stringArray } from "@/lib/json";
import { formatWhen, readinessLabel } from "@/lib/model";
import { db } from "@/lib/db";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const viewer = await requireUser();
  const prisma = await db();
  const reports = await prisma.feedbackReport.findMany({
    where: { userId: viewer.candidate.id },
    orderBy: { createdAt: "asc" },
  });
  const target = viewer.candidate.target;
  const latest = reports[reports.length - 1];
  const strengths = latest ? stringArray(latest.strengths).slice(0, 3) : viewer.candidate.skills.slice(0, 3).map((skill) => skill.name);
  const next = nextStep(viewer.completion, target, Boolean(viewer.portfolio), latest?.readinessScore ?? null);
  const first = viewer.candidate.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <section className="rise glass relative overflow-hidden rounded-[1.4rem] px-6 py-8 md:px-10 md:py-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-copper">Hello, {first}</p>
        <p className="mt-6 text-sm text-muted">Preparing for</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
          {target ? (
            <>
              {target.company}
              <span className="mx-3 text-copper">→</span>
              {target.role}
            </>
          ) : (
            "Choose a company and role"
          )}
        </h1>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <ScoreRing
            value={latest ? latest.readinessScore : null}
            label="Readiness"
            detail={latest ? readinessLabel(latest.readinessScore) : "No interview yet"}
          />
          <ScoreRing
            value={viewer.completion.percent}
            label="Profile completion"
            detail={viewer.completion.missing[0] ? `Next: ${viewer.completion.missing[0]}` : "Sections filled"}
          />
          <div className="glass lift flex flex-col justify-between rounded-2xl p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Next recommended action</p>
              <p className="mt-3 text-lg font-medium leading-7">{next.label}</p>
            </div>
            <Link href={next.href} className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90">
              {next.button}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel lift rise p-5" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-copper" />
            <h2 className="font-semibold">Profile completion</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            {viewer.completion.missing.length ? `Still open: ${viewer.completion.missing.slice(0, 3).join(", ")}.` : "Your profile sections are filled in."}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="bar-fill h-full rounded-full bg-accent" style={{ width: `${viewer.completion.percent}%` }} />
          </div>
        </section>

        <section className="panel lift rise p-5" style={{ animationDelay: "140ms" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-copper" />
            <h2 className="font-semibold">Key strengths</h2>
          </div>
          {strengths.length ? (
            <ul className="mt-4 space-y-2">
              {strengths.map((item) => (
                <li key={item} className="rounded-xl bg-bg/80 px-3 py-2.5 text-sm leading-6">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted">Add skills and a project with a result. Strengths show up after your first scored interview.</p>
          )}
        </section>
      </div>

      <section className="panel lift rise p-5" style={{ animationDelay: "200ms" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Readiness trend</h2>
          <Link href="/interview" className="text-sm text-copper">Open interviews</Link>
        </div>
        <TrendChart data={reports.map((report) => ({ label: formatWhen(report.createdAt).replace(/,.*/, ""), score: report.readinessScore }))} />
      </section>
    </div>
  );
}

function nextStep(
  completion: { percent: number; missing: string[] },
  target: { company: string; role: string; interviewType: string } | null,
  hasPortfolio: boolean,
  score: number | null,
) {
  if (!target) {
    return { href: "/prepare", button: "Choose a target", action: "Set company and role", label: "Pick the company and role you want to prepare for." };
  }
  if (completion.percent < 80 && completion.missing[0]) {
    const focus = completion.missing[0];
    return {
      href: "/profile",
      button: "Update profile",
      action: "Open profile",
      label: `Fill in ${focus.charAt(0).toLowerCase()}${focus.slice(1)}, then run a ${target.interviewType} interview for ${target.role}.`,
    };
  }
  if (!hasPortfolio) {
    return { href: "/portfolio", button: "Generate portfolio", action: "Generate", label: `Generate a portfolio for ${target.role} at ${target.company}.` };
  }
  if (score === null) {
    return { href: "/interview", button: "Start interview", action: "Start interview", label: `Run a ${target.interviewType} interview for ${target.role} at ${target.company}.` };
  }
  if (score < 85) {
    return { href: "/interview", button: "Start interview", action: "Practice again", label: `Readiness is ${score}%. Run another ${target.interviewType} interview.` };
  }
  return { href: "/interview", button: "Start interview", action: "Practice again", label: `${target.role} readiness is ${score}%. A fresh round will keep the answers sharp.` };
}
