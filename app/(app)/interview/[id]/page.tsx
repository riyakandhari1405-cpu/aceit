import { notFound } from "next/navigation";
import { InterviewReport } from "@/components/interview-report";
import { InterviewRoom } from "@/components/interview-room";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Interview" };

export default async function InterviewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser();
  const prisma = await db();
  const session = await prisma.interviewSession.findFirst({
    where: { id, userId: viewer.candidate.id },
    include: { questions: { orderBy: { order: "asc" }, include: { answer: true } }, report: true },
  });
  if (!session) notFound();
  const questions = session.questions.map((question) => ({
    id: question.id,
    text: question.text,
    source: question.source,
    answer: question.answer?.text ?? null,
  }));
  if (session.status !== "completed" || !session.report) {
    return (
      <InterviewRoom
        sessionId={session.id}
        company={session.company}
        role={session.role}
        mode={session.mode}
        status={session.status}
        questions={questions}
      />
    );
  }
  return <InterviewReport company={session.company} role={session.role} report={session.report} transcript={questions} />;
}
