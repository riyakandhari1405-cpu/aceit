import { headers } from "next/headers";
import { PortfolioStudio } from "@/components/portfolio-studio";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { GeneratePortfolio } from "@/components/generate-portfolio";
import { requireUser } from "@/lib/guard";
import { asSections } from "@/lib/portfolio-content";

export const metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const viewer = await requireUser();
  const sections = viewer.portfolio ? asSections(viewer.portfolio.sections) : null;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (!viewer.portfolio || !sections) {
    return (
      <div>
        <PageHeader
          eyebrow="Portfolio"
          title="Smart portfolio"
          description="Projects and skills are ordered for the company and role you are preparing for."
        />
        <EmptyState
          title="No portfolio yet"
          body={viewer.candidate.target ? `Generate one for ${viewer.candidate.target.role} at ${viewer.candidate.target.company}.` : "Set a target first, then generate the portfolio."}
          action={viewer.candidate.target ? <GeneratePortfolio /> : <LinkButton href="/prepare">Set a target</LinkButton>}
        />
      </div>
    );
  }
  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title={`${viewer.candidate.name}`}
        description={`Ordered for ${viewer.portfolio.role || "your target"}${viewer.portfolio.company ? ` at ${viewer.portfolio.company}` : ""}. Built from your profile.`}
      />
      <PortfolioStudio
        name={viewer.candidate.name}
        summary={viewer.portfolio.summary}
        about={viewer.portfolio.about}
        sections={sections}
        theme={viewer.portfolio.theme}
        company={viewer.portfolio.company}
        role={viewer.portfolio.role}
        isPublic={viewer.portfolio.isPublic}
        shareUrl={`${proto}://${host}/p/${viewer.portfolio.slug}`}
        engine={viewer.portfolio.engine}
        stale={viewer.portfolioStale}
      />
    </div>
  );
}
