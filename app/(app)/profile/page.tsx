import { ProfileEditor } from "@/components/profile-editor";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireUser();
  return (
    <div>
      <PageHeader
        eyebrow="Profile"
        title="Candidate profile"
        description={`${viewer.completion.percent}% complete. Everything you save here feeds the portfolio, the questions, and the mock interview.`}
      />
      <ProfileEditor key={viewer.candidate.updatedAt} candidate={viewer.candidate} missing={viewer.completion.missing} />
    </div>
  );
}
