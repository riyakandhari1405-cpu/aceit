import { AdminConsole } from "@/components/admin-console";
import { PageHeader } from "@/components/ui";
import { aiStatus } from "@/lib/ai";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";

export const metadata = { title: "Placement office" };

export default async function AdminPage() {
  await requireAdmin();
  const prisma = await db();
  const [records, questions, experiences, ai] = await Promise.all([
    prisma.placementRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.placementQuestion.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.placementExperience.findMany({ orderBy: { createdAt: "desc" } }),
    aiStatus(),
  ]);
  return (
    <div>
      <PageHeader
        eyebrow="Administrator"
        title="Placement office"
        description={`${records.length} profiles, ${questions.length} questions, ${experiences.length} interview notes. Upload what was asked. Do not upload predictions.`}
      />
      <AdminConsole
        ai={ai}
        records={records.map((row) => ({
          id: row.id,
          company: row.company,
          role: row.role,
          year: row.year?.toString() ?? "",
          college: row.college,
          selectedSkills: row.selectedSkills,
          notes: row.notes,
        }))}
        questions={questions.map((row) => ({
          id: row.id,
          company: row.company,
          role: row.role,
          roundType: row.roundType,
          question: row.question,
          topic: row.topic,
        }))}
        experiences={experiences.map((row) => ({
          id: row.id,
          company: row.company,
          role: row.role,
          roundType: row.roundType,
          experience: row.experience,
        }))}
      />
    </div>
  );
}
