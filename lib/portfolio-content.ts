import type { Candidate, CandidateProject } from "./model";
import { buildSignalSet, relevance } from "./scoring";

export type PortfolioEducation = {
  college: string;
  degree: string;
  branch: string;
  cgpa: number | null;
  graduationYear: number | null;
  tenthPercent: number | null;
  twelfthPercent: number | null;
};

export type PortfolioContact = {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
};

export type PortfolioProject = CandidateProject & { relevance: number; reason: string };

export type PortfolioRole = {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
  kind: "experience" | "internship";
};

export type PortfolioSections = {
  headline: string;
  education: PortfolioEducation;
  skills: { name: string; category: string; relevance: number; reason: string }[];
  projects: PortfolioProject[];
  certifications: Candidate["certifications"];
  experiences: PortfolioRole[];
  internships: PortfolioRole[];
  achievements: Candidate["achievements"];
  leadership: Candidate["leadership"];
  hackathons: Candidate["hackathons"];
  contact: PortfolioContact;
};

const BLANK = /^(undefined|null|n\/a|na|none|no data available|not available|—|-|\.)$/i;

export function cleanText(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text || BLANK.test(text)) return "";
  return text;
}

export function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return number;
}

export function safeUrl(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";
  const withProtocol = /^https?:\/\//i.test(text) ? text : text.includes(".") ? `https://${text}` : "";
  if (!withProtocol) return "";
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!url.hostname.includes(".")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function buildPortfolioContent(candidate: Candidate, historicalSkills: string[]) {
  const role = candidate.target?.role || "";
  const signals = buildSignalSet(role, historicalSkills);
  const projects = candidate.projects
    .map((project) => {
      const scored = relevance([project.name, project.description, project.techStack, project.solution, project.impact].join(" "), signals);
      return sanitizeProject({ ...project, relevance: scored.score, reason: scored.reason });
    })
    .filter((project) => project.name)
    .sort((a, b) => b.relevance - a.relevance || a.name.localeCompare(b.name));
  const skills = candidate.skills
    .map((skill) => {
      const scored = relevance(skill.name, signals);
      return { name: cleanText(skill.name), category: cleanText(skill.category) || "TECHNICAL", relevance: scored.score, reason: cleanText(scored.reason) };
    })
    .filter((skill) => skill.name)
    .sort((a, b) => b.relevance - a.relevance || a.name.localeCompare(b.name));

  const headline = cleanText(candidate.headline);
  const sections: PortfolioSections = {
    headline,
    education: {
      college: cleanText(candidate.college),
      degree: cleanText(candidate.degree),
      branch: cleanText(candidate.branch),
      cgpa: cleanNumber(candidate.cgpa),
      graduationYear: cleanNumber(candidate.graduationYear),
      tenthPercent: cleanNumber(candidate.tenthPercent),
      twelfthPercent: cleanNumber(candidate.twelfthPercent),
    },
    skills,
    projects,
    certifications: candidate.certifications
      .map((item) => ({
        id: item.id,
        name: cleanText(item.name),
        issuer: cleanText(item.issuer),
        issuedOn: cleanText(item.issuedOn),
        credentialUrl: safeUrl(item.credentialUrl),
      }))
      .filter((item) => item.name),
    experiences: candidate.experiences.map((item) => sanitizeRole(item, "experience")).filter((item) => item.title || item.company),
    internships: candidate.internships.map((item) => sanitizeRole(item, "internship")).filter((item) => item.title || item.company),
    achievements: candidate.achievements
      .map((item) => ({ id: item.id, title: cleanText(item.title), description: cleanText(item.description), year: cleanText(item.year) }))
      .filter((item) => item.title),
    leadership: candidate.leadership
      .map((item) => ({ id: item.id, role: cleanText(item.role), organization: cleanText(item.organization), description: cleanText(item.description) }))
      .filter((item) => item.role || item.organization),
    hackathons: candidate.hackathons
      .map((item) => ({
        id: item.id,
        name: cleanText(item.name),
        result: cleanText(item.result),
        description: cleanText(item.description),
        projectName: cleanText(item.projectName),
      }))
      .filter((item) => item.name),
    contact: {
      email: cleanText(candidate.email),
      phone: cleanText(candidate.phone),
      location: cleanText(candidate.location),
      linkedin: safeUrl(candidate.linkedin),
      github: safeUrl(candidate.github),
    },
  };
  return { summary: headline, about: "", sections };
}

function sanitizeProject(project: PortfolioProject): PortfolioProject {
  return {
    ...project,
    name: cleanText(project.name),
    description: cleanText(project.description),
    techStack: cleanText(project.techStack),
    challenges: cleanText(project.challenges),
    solution: cleanText(project.solution),
    impact: cleanText(project.impact),
    github: safeUrl(project.github),
    demoLink: safeUrl(project.demoLink),
    reason: cleanText(project.reason),
  };
}

function sanitizeRole(item: { id: string; title: string; company: string; startDate: string; endDate: string; description: string }, kind: PortfolioRole["kind"]): PortfolioRole {
  return {
    id: item.id,
    title: cleanText(item.title),
    company: cleanText(item.company),
    startDate: cleanText(item.startDate),
    endDate: cleanText(item.endDate),
    description: cleanText(item.description),
    kind,
  };
}

export function asSections(value: unknown): PortfolioSections | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.projects) || !Array.isArray(record.skills)) return null;
  const contact = objectOf(record.contact);
  const education = objectOf(record.education);
  const educationSource = Object.keys(education).length ? education : contact;
  return {
    headline: cleanText(record.headline),
    education: {
      college: cleanText(educationSource.college),
      degree: cleanText(educationSource.degree),
      branch: cleanText(educationSource.branch),
      cgpa: cleanNumber(educationSource.cgpa),
      graduationYear: cleanNumber(educationSource.graduationYear),
      tenthPercent: cleanNumber(educationSource.tenthPercent),
      twelfthPercent: cleanNumber(educationSource.twelfthPercent),
    },
    skills: record.skills
      .map((item) => {
        const skill = objectOf(item);
        return {
          name: cleanText(skill.name),
          category: cleanText(skill.category) || "TECHNICAL",
          relevance: cleanNumber(skill.relevance) ?? 0,
          reason: cleanText(skill.reason),
        };
      })
      .filter((skill) => skill.name),
    projects: record.projects
      .map((item) => {
        const project = objectOf(item);
        return sanitizeProject({
          id: cleanText(project.id),
          name: cleanText(project.name),
          description: cleanText(project.description),
          techStack: cleanText(project.techStack),
          challenges: cleanText(project.challenges),
          solution: cleanText(project.solution),
          impact: cleanText(project.impact),
          github: cleanText(project.github),
          demoLink: cleanText(project.demoLink),
          relevance: cleanNumber(project.relevance) ?? 0,
          reason: cleanText(project.reason),
        });
      })
      .filter((project) => project.name),
    certifications: arrayOf(record.certifications)
      .map((item) => ({
        id: cleanText(item.id),
        name: cleanText(item.name),
        issuer: cleanText(item.issuer),
        issuedOn: cleanText(item.issuedOn),
        credentialUrl: safeUrl(item.credentialUrl),
      }))
      .filter((item) => item.name),
    experiences: arrayOf(record.experiences).map((item) => sanitizeRole(roleFrom(item), "experience")).filter((item) => item.title || item.company),
    internships: arrayOf(record.internships).map((item) => sanitizeRole(roleFrom(item), "internship")).filter((item) => item.title || item.company),
    achievements: arrayOf(record.achievements)
      .map((item) => ({ id: cleanText(item.id), title: cleanText(item.title), description: cleanText(item.description), year: cleanText(item.year) }))
      .filter((item) => item.title),
    leadership: arrayOf(record.leadership)
      .map((item) => ({ id: cleanText(item.id), role: cleanText(item.role), organization: cleanText(item.organization), description: cleanText(item.description) }))
      .filter((item) => item.role || item.organization),
    hackathons: arrayOf(record.hackathons)
      .map((item) => ({
        id: cleanText(item.id),
        name: cleanText(item.name),
        result: cleanText(item.result),
        description: cleanText(item.description),
        projectName: cleanText(item.projectName),
      }))
      .filter((item) => item.name),
    contact: {
      email: cleanText(contact.email),
      phone: cleanText(contact.phone),
      location: cleanText(contact.location),
      linkedin: safeUrl(contact.linkedin),
      github: safeUrl(contact.github),
    },
  };
}

function objectOf(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function arrayOf(value: unknown) {
  return Array.isArray(value) ? value.map(objectOf) : [];
}

function roleFrom(item: Record<string, unknown>) {
  return {
    id: cleanText(item.id),
    title: cleanText(item.title),
    company: cleanText(item.company),
    startDate: cleanText(item.startDate),
    endDate: cleanText(item.endDate),
    description: cleanText(item.description),
  };
}
