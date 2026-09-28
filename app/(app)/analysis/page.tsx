import { AnalysisRunner } from "@/components/studio";
import { EngineNote, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { stringArray } from "@/lib/json";
import { formatWhen, preparationStamp } from "@/lib/model";

export const metadata = { title: "Analysis" };

export default async function AnalysisPage() {
  const viewer = await requireUser();
  const prisma = await db();
  const analyses = await prisma.profileAnalysis.findMany({
    where: { userId: viewer.candidate.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const latest = analyses[0];
  const stamp = preparationStamp(viewer.candidate.updatedAt, viewer.candidate.target);
  const fresh = Boolean(latest && latest.stamp === stamp && latest.company === viewer.candidate.target?.company);
  return (
    <div>
      <PageHeader
        eyebrow="Profile analysis"
        title="Where to spend the next hour"
        description="Strengths, thin spots, and focus areas for the active target. This is preparation advice, not a hiring prediction."
        actions={<AnalysisRunner stale={!fresh} />}
      />
      {!latest ? (
        <p className="text-sm text-muted">No analysis saved yet. Run one after your profile and target are in place.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">{latest.company} · {latest.role} · {latest.interviewType} · {formatWhen(latest.createdAt)}</p>
          <EngineNote engine={latest.engine} />
          {!fresh ? <p className="text-sm text-copper">This analysis is older than your profile or target. Refresh it.</p> : null}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Strengths" items={stringArray(latest.strengths)} />
            <Card title="Thin areas" items={stringArray(latest.weakAreas)} />
            <Card title="Focus" items={stringArray(latest.focusAreas)} />
          </div>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-semibold">Readiness summary</h2>
            <p className="mt-2 text-sm leading-6">{latest.readinessSummary}</p>
            <h2 className="mt-4 font-semibold">Portfolio summary</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{latest.portfolioSummary}</p>
          </section>
          {analyses.length > 1 ? (
            <section>
              <h2 className="text-sm font-medium text-muted">Earlier runs</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {analyses.slice(1).map((item) => (
                  <li key={item.id}>{formatWhen(item.createdAt)} · {item.company} · {item.role}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
