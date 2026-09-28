import Link from "next/link";
import { CountUp, Meter } from "@/components/motion";
import { stringArray } from "@/lib/json";
import { readinessLabel } from "@/lib/model";

type Report = {
  readinessScore: number;
  technicalDepth: number;
  communication: number;
  problemSolving: number;
  confidence: number;
  strengths: unknown;
  weaknesses: unknown;
  suggestions: unknown;
  narrative: string;
};

export function reportScores(report: Report) {
  const legacy = report.problemSolving === 0 && report.confidence === 0 && report.technicalDepth <= 10 && report.communication <= 10;
  if (!legacy) {
    return {
      overall: report.readinessScore,
      technical: report.technicalDepth,
      communication: report.communication,
      problemSolving: report.problemSolving,
      confidence: report.confidence,
    };
  }
  return {
    overall: report.readinessScore,
    technical: report.technicalDepth * 10,
    communication: report.communication * 10,
    problemSolving: report.readinessScore,
    confidence: report.readinessScore,
  };
}

export function InterviewReport({
  company,
  role,
  report,
  transcript,
}: {
  company: string;
  role: string;
  report: Report;
  transcript: { id: string; text: string; source: string; answer: string | null }[];
}) {
  const scores = reportScores(report);
  const outcome = readinessLabel(scores.overall);
  const bars = [
    ["Technical knowledge", scores.technical],
    ["Communication", scores.communication],
    ["Problem solving", scores.problemSolving],
    ["Confidence", scores.confidence],
  ] as const;

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <section className="glass rise rounded-[1.4rem] p-6 md:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-copper">{company}</p>
        <h1 className="mt-3 text-6xl font-semibold tracking-tight md:text-8xl">
          <CountUp value={scores.overall} />
        </h1>
        <p className="mt-3 text-xl font-medium">{role} readiness</p>
        <p className="mt-1 text-lg text-muted">Interview outcome: {outcome}</p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{report.narrative}</p>
      </section>

      <div className="panel lift mt-4 space-y-5 p-5">
        {bars.map(([label, value]) => (
          <Meter key={label} label={label} value={value} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Block title="Strengths" items={stringArray(report.strengths)} />
        <Block title="Weaknesses" items={stringArray(report.weaknesses)} />
      </div>
      <div className="mt-4">
        <Block title="Suggested improvements" items={stringArray(report.suggestions)} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Transcript</h2>
        <div className="mt-3 space-y-3">
          {transcript.map((question, index) => (
            <article key={question.id} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs text-copper">Question {index + 1}</p>
              <p className="mt-1 text-sm leading-6">{question.text}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{question.answer || "No answer."}</p>
            </article>
          ))}
        </div>
      </section>
      <p className="mt-6">
        <Link href="/interview" className="text-sm text-copper">All interviews</Link>
      </p>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel lift min-w-0 p-5">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li className="text-muted">None noted.</li>}
      </ul>
    </section>
  );
}
