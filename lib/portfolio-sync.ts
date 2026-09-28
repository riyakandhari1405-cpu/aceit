import "server-only";
import { db } from "./db";
import { generatePortfolioCopy } from "./ai";
import { jsonValue } from "./json";
import type { Candidate } from "./model";
import { profileContentStamp } from "./model";
import { historicalContext } from "./placement";

type StoredPortfolio = {
  id: string;
  slug: string;
  theme: string;
  company: string;
  role: string;
  summary: string;
  about: string;
  sections: unknown;
  stamp: string;
  engine: string;
  isPublic: boolean;
  updatedAt: Date;
  userId: string;
};

export async function writePortfolio(candidate: Candidate, existing: StoredPortfolio | null) {
  if (!candidate.target) throw new Error("Choose a company and role first.");
  const stamp = profileContentStamp(candidate);
  const history = await historicalContext(candidate.target.company, candidate.target.role);
  const copy = await generatePortfolioCopy(candidate, history.skills);
  const prisma = await db();
  const slug = existing?.slug || (await uniqueSlug(candidate.name));
  const data = {
    slug,
    company: candidate.target.company,
    role: candidate.target.role,
    summary: copy.summary,
    about: copy.about,
    sections: jsonValue(copy.sections),
    stamp,
    engine: copy.engine,
  };
  const saved = existing
    ? await prisma.portfolio.update({ where: { id: existing.id }, data })
    : await prisma.portfolio.create({
        data: { userId: candidate.id, theme: "signal", isPublic: true, ...data },
      });
  return { saved, engine: copy.engine, warning: copy.warning, stamp };
}

export async function refreshPortfolioIfStale(candidate: Candidate, portfolio: StoredPortfolio | null) {
  if (!portfolio || !candidate.target) return { portfolio, stale: false as const };
  if (portfolio.stamp === profileContentStamp(candidate)) return { portfolio, stale: false as const };
  try {
    const { saved } = await writePortfolio(candidate, portfolio);
    return { portfolio: saved, stale: false as const };
  } catch (error) {
    console.error(error);
    return { portfolio, stale: true as const };
  }
}

async function uniqueSlug(name: string) {
  const prisma = await db();
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "candidate";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const taken = await prisma.portfolio.findUnique({ where: { slug } });
    if (!taken) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}
