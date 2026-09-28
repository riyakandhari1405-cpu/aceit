import { CountChart } from "@/components/charts";
import { Badge, PageHeader } from "@/components/ui";
import { buildAnalysis } from "@/lib/analysis";
import { setGoal } from "@/lib/actions/target";
import { requireUser } from "@/lib/guard";
import { INTERVIEW_TYPES } from "@/lib/model";
import { canonical, getInsight, historicalContext, placementOptions } from "@/lib/placement";

export const metadata = { title: "Insights" };

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; role?: string }>;
}) {
  const viewer = await requireUser();
  const params = await searchParams;
  const options = await placementOptions();
  const company = canonical(params.company || viewer.candidate.target?.company || "", options.companies);
  const role = params.role || viewer.candidate.target?.role || "";
  const insight = company ? await getInsight(company, role || "*") : null;
  const history = company ? await historicalContext(company, role || "*") : { skills: [] as string[], questions: [] };
  const hasHistory = Boolean(insight && insight.payload.recordCount + insight.payload.questionCount + insight.payload.experienceCount > 0);
  const analysis = buildAnalysis(viewer.candidate, history.skills);
  const label = company ? (role && role !== "*" ? `${role} at ${company}` : company) : "your target";

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Preparation"
        title={company || "Insights"}
        description="Your profile, compared with any placement notes already stored for this company."
      />
      {options.companies.length > 0 ? (
        <form action="/insights" className="mb-6 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 sm:flex-row">
          <select className="w-full min-w-0 rounded-lg border border-line bg-bg px-3 py-2 text-sm" name="company" defaultValue={company}>
            {options.companies.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="w-full min-w-0 rounded-lg border border-line bg-bg px-3 py-2 text-sm" name="role" defaultValue={role || "*"}>
            <option value="*">All roles</option>
            {options.roles.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink" type="submit">Show</button>
        </form>
      ) : null}

      {!hasHistory ? (
        <p className="rounded-2xl border border-line bg-surface px-5 py-4 text-sm leading-6">
          No historical placement data available for this company yet.
        </p>
      ) : insight ? (
        <div className="space-y-6">
          <p className="text-sm leading-6 text-muted">{insight.summary}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-semibold">Skills on logged profiles</h2>
              <p className="mt-1 text-xs text-muted">{insight.payload.recordCount} profiles in this view.</p>
              <div className="mt-4"><CountChart data={insight.payload.skills.slice(0, 8)} label="Profiles" /></div>
            </section>
            <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-semibold">Topics on logged questions</h2>
              <div className="mt-4"><CountChart data={insight.payload.topics.slice(0, 8)} label="Questions" /></div>
            </section>
          </div>
          {insight.payload.questions.length ? (
            <section>
              <h2 className="text-lg font-semibold">Questions from past interviews</h2>
              <div className="mt-3 space-y-2">
                {insight.payload.questions.map((question) => (
                  <article key={`${question.roundType}-${question.question}`} className="rounded-2xl border border-line bg-surface px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="copper">{question.roundType}</Badge>
                      <Badge>{question.topic}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6">{question.question}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Profile analysis</h2>
          <p className="mt-2 text-sm leading-6">{analysis.readinessSummary}</p>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {analysis.strengths.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Skill analysis</h2>
          {viewer.candidate.skills.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {viewer.candidate.skills.map((skill) => (
                <li key={skill.id} className="rounded-full bg-bg px-3 py-1 text-sm">{skill.name}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted">Add skills on your profile and they will be listed here.</p>
          )}
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {analysis.weakAreas.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Project analysis</h2>
          {viewer.candidate.projects.length ? (
            <ul className="mt-3 space-y-3 text-sm leading-6">
              {viewer.candidate.projects.map((project) => (
                <li key={project.id}>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-muted">{project.description || project.impact || "Add a description so this project can lead an answer."}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted">Add a project with a problem, a technical choice, and a result.</p>
          )}
        </section>
        <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Interview preparation suggestions</h2>
          <p className="mt-1 text-xs text-muted">For {label}.</p>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {analysis.focusAreas.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      {company && role && role !== "*" ? (
        <form action={setGoal} className="mt-6 flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-surface p-4">
          <input type="hidden" name="company" value={company} />
          <input type="hidden" name="role" value={role} />
          <label className="text-sm">
            <span className="mb-1 block font-medium">Interview type</span>
            <select name="interviewType" className="rounded-lg border border-line bg-bg px-3 py-2" defaultValue={viewer.candidate.target?.interviewType || "Technical"}>
              {INTERVIEW_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink" type="submit">Use this target</button>
        </form>
      ) : null}
    </div>
  );
}
