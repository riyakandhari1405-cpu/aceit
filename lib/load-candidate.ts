import "server-only";
import type { SkillCategory } from "./model";
import type { Candidate } from "./model";
import { db } from "./db";

export async function loadCandidate(userId: string): Promise<Candidate | null> {
  const prisma = await db();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      education: true,
      skills: { orderBy: { name: "asc" } },
      projects: { orderBy: { name: "asc" } },
      certifications: { orderBy: { name: "asc" } },
      experiences: { orderBy: { title: "asc" } },
      internships: { orderBy: { title: "asc" } },
      achievements: { orderBy: { title: "asc" } },
      leadershipRoles: { orderBy: { role: "asc" } },
      hackathons: { orderBy: { name: "asc" } },
      targets: { where: { isActive: true }, take: 1 },
    },
  });
  if (!user) return null;
  const target = user.targets[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    updatedAt: user.updatedAt.toISOString(),
    phone: user.profile?.phone ?? "",
    location: user.profile?.location ?? "",
    linkedin: user.profile?.linkedin ?? "",
    github: user.profile?.github ?? "",
    headline: user.profile?.headline ?? "",
    tenthPercent: user.education?.tenthPercent ?? null,
    twelfthPercent: user.education?.twelfthPercent ?? null,
    college: user.education?.college ?? "",
    degree: user.education?.degree ?? "",
    branch: user.education?.branch ?? "",
    cgpa: user.education?.cgpa ?? null,
    graduationYear: user.education?.graduationYear ?? null,
    skills: user.skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category as SkillCategory,
    })),
    projects: user.projects,
    certifications: user.certifications,
    experiences: user.experiences,
    internships: user.internships,
    achievements: user.achievements,
    leadership: user.leadershipRoles,
    hackathons: user.hackathons,
    target: target
      ? { id: target.id, company: target.company, role: target.role, interviewType: target.interviewType }
      : null,
  };
}
