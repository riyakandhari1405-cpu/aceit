import { notFound } from "next/navigation";
import { PortfolioDocument } from "@/components/portfolio-document";
import { db } from "@/lib/db";
import { asSections } from "@/lib/portfolio-content";

export default async function PublicPortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prisma = await db();
  const portfolio = await prisma.portfolio.findUnique({
    where: { slug },
    include: { user: true },
  });
  if (!portfolio || !portfolio.isPublic) notFound();
  const sections = asSections(portfolio.sections);
  if (!sections) notFound();
  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <PortfolioDocument
          name={portfolio.user.name}
          summary={portfolio.summary}
          about={portfolio.about}
          sections={sections}
          theme={portfolio.theme}
          company={portfolio.company}
          role={portfolio.role}
        />
      </div>
    </div>
  );
}
