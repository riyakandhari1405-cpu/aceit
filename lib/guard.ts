import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { loadCandidate } from "./load-candidate";
import { completion } from "./model";
import { refreshPortfolioIfStale } from "./portfolio-sync";
import { SESSION_COOKIE, verifySession } from "./session-token";

export async function readSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const getViewer = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const candidate = await loadCandidate(session.uid);
  if (!candidate) return null;
  const prisma = await db();
  const stored = await prisma.portfolio.findFirst({
    where: { userId: candidate.id },
    orderBy: { updatedAt: "desc" },
  });
  const refreshed = await refreshPortfolioIfStale(candidate, stored);
  return {
    session,
    candidate,
    role: session.role,
    completion: completion(candidate),
    portfolio: refreshed.portfolio,
    portfolioStale: refreshed.stale,
  };
});

export async function requireUser() {
  const viewer = await getViewer();
  if (!viewer) redirect((await readSession()) ? "/api/sign-out" : "/login");
  return viewer;
}

export async function redirectIfSignedIn() {
  const viewer = await getViewer();
  if (viewer) redirect("/dashboard");
  if (await readSession()) redirect("/api/sign-out");
}

export async function requireAdmin() {
  const viewer = await requireUser();
  if (viewer.role !== "ADMIN") redirect("/dashboard");
  return viewer;
}
