import type { Candidate } from "./model";
import { clip } from "./model";
import { buildPortfolioContent } from "./portfolio-content";
import { skillGaps } from "./scoring";

export type AnalysisDraft = {
  strengths: string[];
  weakAreas: string[];
  focusAreas: string[];
  portfolioSummary: string;
  readinessSummary: string;
};

export function buildAnalysis(candidate: Candidate, historicalSkills: string[]): AnalysisDraft {
  const company = candidate.target?.company || "your target company";
  const role = candidate.target?.role || "your target role";
  const content = buildPortfolioContent(candidate, historicalSkills);
  const gaps = skillGaps(
    candidate.skills.map((skill) => skill.name),
    historicalSkills,
    role,
  );
  const strongSkills = content.sections.skills.filter((skill) => skill.relevance > 0).slice(0, 4);
  const lead = content.sections.projects[0];
  const quiet = content.sections.projects.filter((project) => project.relevance < 20);

  const strengths: string[] = [];
  if (strongSkills.length) {
    strengths.push(`${strongSkills.map((skill) => skill.name).join(", ")} overlap with ${role}${candidate.target?.company ? ` at ${company}` : ""}.`);
  }
  if (lead && lead.relevance > 0) {
    strengths.push(`${lead.name} is the clearest project for this target. ${lead.reason}.`);
  }
  if (candidate.internships[0]) {
    strengths.push(
      `The internship as ${candidate.internships[0].title}${candidate.internships[0].company ? ` at ${candidate.internships[0].company}` : ""} gives you a workplace story, not only a class project.`,
    );
  }
  if (candidate.leadership[0]) {
    strengths.push(`Leadership as ${candidate.leadership[0].role} is usable in HR and managerial rounds.`);
  }
  if (!strengths.length) {
    strengths.push("The profile exists. Add projects with a problem, a technical choice, and a result so later rounds have something specific to ask.");
  }

  const weakAreas: string[] = [];
  if (gaps.length) {
    const fromRecords = historicalSkills.length > 0;
    weakAreas.push(
      fromRecords
        ? `${gaps.slice(0, 4).join(", ")} show up on logged profiles for ${role} and are missing or thin on yours.`
        : `${gaps.slice(0, 4).join(", ")} are typical for ${role} and are not on the skill list yet. This is a role expectation, not a placement statistic.`,
    );
  }
  for (const project of quiet.slice(0, 2)) {
    weakAreas.push(`${project.name} has little overlap with this target, so it should not lead the portfolio unless the conversation goes there.`);
  }
  if (!candidate.projects.some((project) => project.impact)) {
    weakAreas.push("Projects are missing an impact line, so answers will not have a result to defend.");
  }
  if (!weakAreas.length) {
    weakAreas.push("Nothing in the profile looks thin yet. The interview will show where an answer stays shallow.");
  }

  const focusAreas = [
    lead ? `Be ready to explain ${lead.name} from the problem through ${clip(lead.challenges || lead.solution || "the technical choice", 100).replace(/[.!?]+$/, "")}.` : "Add one project with a challenge and a result.",
    ...gaps.slice(0, 2).map((gap) => `Prepare a concrete story for ${gap}, even if the story is how you would learn it on a task.`),
    candidate.internships[0]
      ? `Rehearse the internship at ${candidate.internships[0].company || "your host"} as a story with a decision and a result.`
      : "Add an internship or experience story so HR rounds are not only about projects.",
  ].slice(0, 4);

  const readinessSummary = `${candidate.name} is preparing for ${role} at ${company}. The profile's strongest overlap is ${
    strongSkills[0]?.name || "still thin"
  }${lead ? `, led by ${lead.name}` : ""}. This summary describes preparation fit. It does not predict an offer.`;

  return {
    strengths,
    weakAreas,
    focusAreas,
    portfolioSummary: candidate.headline || `${candidate.name} is preparing for ${role}${candidate.target?.company ? ` at ${company}` : ""}.`,
    readinessSummary,
  };
}
