import Link from "next/link";
import { deleteInterview } from "@/lib/actions/interview";
import { InterviewLauncher } from "@/components/interview-launcher";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { formatWhen, readinessLabel } from "@/lib/model";

export const metadata = { title: "Interview" };

export default async function InterviewPage() {
  const viewer = await requireUser();
  const prisma = await db();
  const sessions = await prisma.interviewSession.findMany({
    where: { userId: viewer.candidate.id },
    orderBy: { startedAt: "desc" },
    include: { report: true },
  });
  const mode = viewer.candidate.target?.interviewType || "Technical";
  return (
    <div>
      <PageHeader
        eyebrow="Interview"
        title="Practice the role"
        description={viewer.candidate.target ? `${viewer.candidate.target.company} · ${viewer.candidate.target.role}. Questions are written from your profile when you start.` : "Choose a company and role, then start."}
      />
      <section className="mb-8 rounded-2xl border border-line bg-surface p-5 md:p-6">
        <h2 className="text-lg font-semibold">Start interview</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-muted">One question at a time. You can move to the next question or end the round and see the score.</p>
        <div className="mt-4">
          {viewer.candidate.target ? <InterviewLauncher mode={mode} /> : <Link href="/prepare" className="text-sm text-copper">Choose a company and role</Link>}
        </div>
      </section>
      <h2 className="mb-3 text-lg font-semibold">Past interviews</h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <Link href={`/interview/${session.id}`} className="min-w-0">
              <p className="font-medium">{session.company} · {session.role}</p>
              <p className="text-sm text-muted">{session.mode} · {formatWhen(session.startedAt)}</p>
            </Link>
            <div className="flex items-center gap-3">
              {session.report ? (
                <div className="text-right">
                  <p className="text-2xl font-semibold leading-none">{session.report.readinessScore}</p>
                  <p className="mt-1 text-xs text-muted">{readinessLabel(session.report.readinessScore)}</p>
                </div>
              ) : (
                <span className="text-sm text-copper">Resume</span>
              )}
              <form action={deleteInterview.bind(null, session.id)}>
                <button className="rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10" type="submit">Delete</button>
              </form>
            </div>
          </div>
        ))}
        {!sessions.length ? <p className="text-sm text-muted">No interviews yet.</p> : null}
      </div>
    </div>
  );
}
