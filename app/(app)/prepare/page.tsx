import { PrepareForm } from "@/components/studio";
import { Badge, PageHeader } from "@/components/ui";
import { activateTarget, deleteTarget } from "@/lib/actions/target";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { formatWhen } from "@/lib/model";
import { placementOptions } from "@/lib/placement";

export const metadata = { title: "Target" };

export default async function PreparePage() {
  const viewer = await requireUser();
  const options = await placementOptions();
  const prisma = await db();
  const targets = await prisma.targetApplication.findMany({
    where: { userId: viewer.candidate.id },
    orderBy: { createdAt: "desc" },
  });
  const active = viewer.candidate.target;
  return (
    <div>
      <PageHeader
        eyebrow="Target"
        title="What you are preparing for"
        description="This goal is shown across the portfolio, insights, questions, and mock interview."
      />
      <PrepareForm
        companies={options.companies}
        roles={options.roles}
        company={active?.company ?? ""}
        role={active?.role ?? ""}
        interviewType={active?.interviewType ?? "Technical"}
      />
      <div className="mt-6 space-y-2">
        {targets.map((target) => (
          <div key={target.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <div>
              <p className="font-medium">{target.company} → {target.role}</p>
              <p className="text-sm text-muted">{target.interviewType} · {formatWhen(target.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              {target.isActive ? <Badge tone="accent">Active</Badge> : (
                <form action={activateTarget}>
                  <input type="hidden" name="id" value={target.id} />
                  <button className="rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-2" type="submit">Make active</button>
                </form>
              )}
              <form action={deleteTarget}>
                <input type="hidden" name="id" value={target.id} />
                <button className="rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10" type="submit">Delete</button>
              </form>
            </div>
          </div>
        ))}
        {!targets.length ? <p className="text-sm text-muted">No goals yet.</p> : null}
      </div>
    </div>
  );
}
