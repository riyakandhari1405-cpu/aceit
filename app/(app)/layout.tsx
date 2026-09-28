import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireUser();
  return (
    <Shell
      name={viewer.candidate.name}
      role={viewer.role}
      completion={viewer.completion.percent}
      target={viewer.candidate.target ? { company: viewer.candidate.target.company, role: viewer.candidate.target.role } : null}
      portfolioStale={viewer.portfolioStale}
    >
      {children}
    </Shell>
  );
}
