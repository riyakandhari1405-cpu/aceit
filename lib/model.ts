export type SkillCategory = "TECHNICAL" | "TOOL" | "FRAMEWORK" | "SOFT";

export type CandidateProject = {
  id: string;
  name: string;
  description: string;
  techStack: string;
  challenges: string;
  solution: string;
  impact: string;
  github: string;
  demoLink: string;
};

export type DatedRole = {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  updatedAt: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  headline: string;
  tenthPercent: number | null;
  twelfthPercent: number | null;
  college: string;
  degree: string;
  branch: string;
  cgpa: number | null;
  graduationYear: number | null;
  skills: { id: string; name: string; category: SkillCategory }[];
  projects: CandidateProject[];
  certifications: { id: string; name: string; issuer: string; issuedOn: string; credentialUrl: string }[];
  experiences: DatedRole[];
  internships: DatedRole[];
  achievements: { id: string; title: string; description: string; year: string }[];
  leadership: { id: string; role: string; organization: string; description: string }[];
  hackathons: { id: string; name: string; result: string; description: string; projectName: string }[];
  target: { id: string; company: string; role: string; interviewType: string } | null;
};

export type TargetRef = { company: string; role: string; interviewType: string };

export const INTERVIEW_TYPES = ["Technical", "HR", "Managerial", "Mixed"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const PORTFOLIO_THEMES = [
  { id: "signal", name: "Signal", description: "Quiet cards and a clear project order." },
  { id: "editorial", name: "Editorial", description: "A long-form story with serif type." },
  { id: "ink", name: "Ink", description: "A dark profile with tight sections." },
] as const;

export function isInterviewType(value: string): value is InterviewType {
  return (INTERVIEW_TYPES as readonly string[]).includes(value);
}

export function preparationStamp(updatedAt: Date | string, target: TargetRef | null) {
  const iso = typeof updatedAt === "string" ? updatedAt : updatedAt.toISOString();
  return `${iso}|${target?.company ?? ""}|${target?.role ?? ""}|${target?.interviewType ?? ""}`;
}

export function profileContentStamp(candidate: Candidate) {
  const body = JSON.stringify({
    name: candidate.name,
    headline: candidate.headline,
    phone: candidate.phone,
    location: candidate.location,
    linkedin: candidate.linkedin,
    github: candidate.github,
    college: candidate.college,
    degree: candidate.degree,
    branch: candidate.branch,
    cgpa: candidate.cgpa,
    tenth: candidate.tenthPercent,
    twelfth: candidate.twelfthPercent,
    year: candidate.graduationYear,
    skills: candidate.skills.map((skill) => `${skill.category}:${skill.name}`).sort(),
    projects: candidate.projects
      .map((project) => [project.name, project.description, project.techStack, project.challenges, project.solution, project.impact, project.github, project.demoLink].join("|"))
      .sort(),
    certifications: candidate.certifications.map((item) => [item.name, item.issuer].join("|")).sort(),
    experiences: candidate.experiences.map((item) => [item.title, item.company, item.description].join("|")).sort(),
    internships: candidate.internships.map((item) => [item.title, item.company, item.description].join("|")).sort(),
    achievements: candidate.achievements.map((item) => [item.title, item.description].join("|")).sort(),
    leadership: candidate.leadership.map((item) => [item.role, item.organization, item.description].join("|")).sort(),
    hackathons: candidate.hackathons.map((item) => [item.name, item.result, item.description, item.projectName].join("|")).sort(),
    target: candidate.target ? `${candidate.target.company}|${candidate.target.role}|${candidate.target.interviewType}` : "",
  });
  let hash = 2166136261;
  for (let index = 0; index < body.length; index += 1) {
    hash ^= body.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `profile:v2:${(hash >>> 0).toString(16)}:${body.length}`;
}

export function clip(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function splitList(value: string) {
  return value
    .split(/[,|/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

export function completion(candidate: Candidate) {
  const projectReady = candidate.projects.some(
    (project) => project.name && project.description && project.techStack && project.impact,
  );
  const checks = [
    { label: "Phone", ok: Boolean(candidate.phone), weight: 4 },
    { label: "Location", ok: Boolean(candidate.location), weight: 4 },
    { label: "LinkedIn", ok: Boolean(candidate.linkedin), weight: 4 },
    { label: "GitHub", ok: Boolean(candidate.github), weight: 4 },
    { label: "Headline", ok: Boolean(candidate.headline), weight: 4 },
    { label: "10th percentage", ok: candidate.tenthPercent !== null, weight: 4 },
    { label: "12th percentage", ok: candidate.twelfthPercent !== null, weight: 4 },
    { label: "College", ok: Boolean(candidate.college), weight: 6 },
    { label: "Degree", ok: Boolean(candidate.degree), weight: 4 },
    { label: "Branch", ok: Boolean(candidate.branch), weight: 4 },
    { label: "CGPA", ok: candidate.cgpa !== null, weight: 6 },
    { label: "Graduation year", ok: candidate.graduationYear !== null, weight: 4 },
    { label: "At least 3 skills", ok: candidate.skills.length >= 3, weight: 10 },
    { label: "A project with impact", ok: projectReady, weight: 14 },
    { label: "A certification", ok: candidate.certifications.length > 0, weight: 6 },
    { label: "Experience or an internship", ok: candidate.experiences.length + candidate.internships.length > 0, weight: 8 },
    { label: "An achievement", ok: candidate.achievements.length > 0, weight: 4 },
    { label: "A leadership role", ok: candidate.leadership.length > 0, weight: 4 },
    { label: "A hackathon", ok: candidate.hackathons.length > 0, weight: 2 },
  ];
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  return {
    percent: Math.round((earned / total) * 100),
    missing: checks.filter((check) => !check.ok).map((check) => check.label),
  };
}

export function formatWhen(value: string | Date) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function readinessLabel(score: number) {
  if (score >= 85) return "Ready";
  if (score >= 60) return "Needs More Preparation";
  return "Early";
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
