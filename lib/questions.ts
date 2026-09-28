import type { Candidate, CandidateProject } from "./model";
import { clip, splitList } from "./model";
import { buildSignalSet, includesTerm, relevance, skillGaps } from "./scoring";

export type PreparedDraft = {
  text: string;
  source: string;
  rationale: string;
};

type HistoricalQuestion = {
  question: string;
  topic: string;
  roundType: string;
  company: string;
  role: string;
};

const SKILL_PROMPTS: Record<string, (role: string, company: string) => string> = {
  sql: (role) =>
    `For this ${role} round, explain joins with a dataset you have actually used. Which join did you choose, and what would the wrong join have done to the result?`,
  python: (role, company) =>
    `Where did Python do real work in your projects, and how would you use it on a messy ${role} task at ${company}?`,
  excel: (role) =>
    `Walk through an Excel cleanup you did yourself. What was dirty in the sheet, and what did you check before trusting a number?`,
  "power bi": (role) =>
    `Describe a Power BI model you built for ${role} work. Which relationship or measure was the hard part, and what decision did the dashboard support?`,
  tableau: () =>
    `Which Tableau view did you publish, who used it, and what did you leave out so the chart would not lie?`,
  java: (role) =>
    `Tell me about a Java design you owned. Why that structure, and what would you change if the ${role} service had to take ten times the traffic?`,
  javascript: (role) =>
    `In your JavaScript code, where does state live, and what bug did that choice prevent or cause?`,
  react: (role) =>
    `Which React screen was hardest to keep correct, and how does data move through it? Answer as you would in a ${role} interview.`,
  node: (role) =>
    `How does your Node service talk to the database or an external feed, and what happens when that dependency is slow?`,
  swift: () => `Which Swift type or pattern did you rely on, and why was it a better fit than the simpler alternative?`,
  swiftui: () =>
    `How did you model state in SwiftUI? Point to one screen and explain what updates it, and what you kept out of the view.`,
  uikit: () => `When would you still use UIKit, and what part of the view lifecycle did you actually depend on?`,
  "data structures": (role) =>
    `Pick a data structure you used in a project and justify it for a ${role} interviewer: lookups, memory, and what grows first.`,
};

export function buildQuestions(input: {
  candidate: Candidate;
  interviewType: string;
  historical: HistoricalQuestion[];
  historicalSkills: string[];
}): PreparedDraft[] {
  const type = input.interviewType || "Technical";
  const company = input.candidate.target?.company || "the company";
  const role = input.candidate.target?.role || "the role";
  const pool: PreparedDraft[] = [];
  const technical = type === "Technical" || type === "Mixed";
  const people = type === "HR" || type === "Managerial" || type === "Mixed";

  if (technical) {
    pool.push(...orderedProjectQuestions(input.candidate, input.historicalSkills));

    const relevantSkills = input.candidate.skills
      .filter((skill) => skill.category !== "SOFT")
      .filter((skill) =>
        input.historicalSkills.some((item) => includesTerm(item, skill.name) || includesTerm(skill.name, item)) ||
          includesTerm(input.historicalSkills.join(" ") + role, skill.name),
      )
      .slice(0, 5);
    const skillsToAsk = relevantSkills.length ? relevantSkills : input.candidate.skills.filter((skill) => skill.category !== "SOFT").slice(0, 3);
    for (const skill of skillsToAsk) {
      pool.push({
        source: "Skill",
        text: skillQuestion(skill.name, role, company),
        rationale: `${skill.name} is on your profile and matters for ${role}.`,
      });
    }

    const gaps = skillGaps(
      input.candidate.skills.map((skill) => skill.name),
      input.historicalSkills,
      role,
    );
    const historyGaps = gaps.filter((gap) =>
      input.historicalSkills.some((skill) => includesTerm(skill, gap) || includesTerm(gap, skill)),
    );
    for (const gap of (historyGaps.length ? historyGaps : gaps).slice(0, 3)) {
      pool.push({
        source: "Role",
        text: historyGaps.length
          ? `Logged profiles for ${role} at ${company} mention ${gap}, and it is not on your skill list. Where have you touched it, or how would you approach a task that depends on it?`
          : `${gap} is typical for ${role} work and it is not on your skill list yet. How would you prepare a project story around it?`,
        rationale: historyGaps.length
          ? `${gap} appears on stored placement profiles and is missing from your skills.`
          : `Role expectation for ${role}. This is not claimed as a placement-record statistic.`,
      });
    }
  }

  if (people || type === "Managerial") {
    for (const experience of input.candidate.experiences) {
      pool.push({
        source: "Experience",
        text: `Tell me about your work as ${experience.title}${experience.company ? ` at ${experience.company}` : ""}. What did you own, and what changed because of it?`,
        rationale: experience.description ? clip(experience.description, 140) : "Drawn from your experience.",
      });
    }
    for (const internship of input.candidate.internships) {
      pool.push({
        source: "Internship",
        text: `During your internship as ${internship.title}${internship.company ? ` at ${internship.company}` : ""}, what did you ship, and how did you know it worked?`,
        rationale: internship.description ? clip(internship.description, 140) : "Drawn from your internship.",
      });
    }
    for (const roleItem of input.candidate.leadership) {
      pool.push({
        source: "Leadership",
        text: `As ${roleItem.role}${roleItem.organization ? ` at ${roleItem.organization}` : ""}, tell me about a decision that other people disagreed with. How did you make it?`,
        rationale: roleItem.description ? clip(roleItem.description, 140) : "Drawn from a leadership role.",
      });
    }
    for (const hackathon of input.candidate.hackathons) {
      pool.push({
        source: "Hackathon",
        text: `At ${hackathon.name}${hackathon.result ? ` (${hackathon.result})` : ""}, what was your specific contribution when time was almost gone?`,
        rationale: hackathon.projectName ? `Linked project: ${hackathon.projectName}.` : "Drawn from your hackathon.",
      });
    }
    for (const achievement of input.candidate.achievements.slice(0, 2)) {
      pool.push({
        source: "Achievement",
        text: `You listed "${achievement.title}". What did you do to earn it, and what does it say about how you work?`,
        rationale: achievement.description ? clip(achievement.description, 120) : "Drawn from an achievement.",
      });
    }
    if (type === "Managerial") {
      for (const project of input.candidate.projects.slice(0, 2)) {
        pool.push({
          source: "Project",
          text: `If a manager asked you to cut scope on ${project.name} a week before release, what would you drop, and what would you refuse to drop?`,
          rationale: `A tradeoff question on ${project.name}.`,
        });
      }
    }
  }

  for (const item of input.historical) {
    if (!roundFits(item.roundType, type)) continue;
    pool.push({
      source: "Historical",
      text: item.question,
      rationale: `Recorded in ${article(item.roundType)} ${item.roundType} round for ${item.role} at ${item.company}. Topic: ${item.topic}.`,
    });
  }

  const companyName = input.candidate.target?.company || "the company";
  const roleName = input.candidate.target?.role || "this role";
  if (pool.length < 4) {
    pool.push(
      {
        source: "Role",
        text: `Why this ${roleName} role at ${companyName}, and which part of your profile is the best evidence?`,
        rationale: `Based on your ${type} target.`,
      },
      {
        source: "Role",
        text: "Walk through one decision you made while building something. What did you try, what failed, and what did you keep?",
        rationale: "Uses whatever you have saved on your profile.",
      },
      {
        source: "Skill",
        text: `Which skill would you lean on first in a ${roleName} interview, and where have you already used it?`,
        rationale: "Drawn from your target role.",
      },
      {
        source: "Role",
        text: `What do you want to be able to do after three months as a ${roleName} at ${companyName}?`,
        rationale: `Interview type: ${type}.`,
      },
    );
  }
  return diversify(dedupe(pool), type === "Mixed" ? 12 : 10);
}

function orderedProjectQuestions(candidate: Candidate, historicalSkills: string[]) {
  const role = candidate.target?.role || "";
  const signals = buildSignalSet(role, historicalSkills);
  const ranked = [...candidate.projects]
    .map((project) => ({
      project,
      score: relevance(
        [project.name, project.description, project.techStack, project.challenges, project.solution, project.impact].join(" "),
        signals,
      ).score,
    }))
    .sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name));

  const lead = ranked[0];
  const leadDrafts = lead ? projectDrafts(lead.project) : [];
  const rest = ranked.slice(1).map((item) => projectDrafts(item.project));
  const ordered = [...leadDrafts.splice(0, 3)];
  for (const bucket of rest) {
    const next = bucket.shift();
    if (next && itemMatters(ranked, next)) ordered.push(next);
  }
  const leftovers = [leadDrafts, ...rest];
  let moved = true;
  while (moved) {
    moved = false;
    for (const bucket of leftovers) {
      const next = bucket.shift();
      if (!next) continue;
      ordered.push(next);
      moved = true;
    }
  }
  return ordered;
}

function itemMatters(
  ranked: { project: CandidateProject; score: number }[],
  draft: PreparedDraft,
) {
  const owner = ranked.find((item) => draft.text.includes(item.project.name));
  return !owner || owner.score > 0 || ranked.every((item) => item.score === 0);
}

function projectDrafts(project: CandidateProject): PreparedDraft[] {
  const drafts: PreparedDraft[] = [
    {
      source: "Project",
      text: `What problem does ${project.name} solve? Describe one real situation, not the feature list.`,
      rationale: `Built from your project ${project.name}.`,
    },
  ];
  const notes = `${project.description} ${project.challenges} ${project.solution}`;
  if (/fetch|feed|api|data|sql|dashboard/i.test(notes)) {
    drafts.push({
      source: "Project",
      text: `How do you fetch or prepare the data behind ${project.name}, and what do you do when that source is late, empty, or wrong?`,
      rationale: project.challenges
        ? `Your challenge note: ${clip(project.challenges, 140)}`
        : `Your description of ${project.name} is about data moving through the product.`,
    });
  }
  drafts.push({
    source: "Project",
    text: `How would you scale ${project.name} if usage grew tenfold? What would break first?`,
    rationale: `A scale question tied only to ${project.name}.`,
  });
  if (project.challenges) {
    drafts.push({
      source: "Project",
      text: `The hard part of ${project.name} was "${clip(project.challenges, 140)}". What did you try first, and what did you keep?`,
      rationale: `Uses the challenge you wrote for ${project.name}.`,
    });
  }
  drafts.push({
    source: "Project",
    text: `What makes ${project.name} different from the obvious existing way to solve the same problem?`,
    rationale: `A differentiation question tied to ${project.name}.`,
  });
  const tech = splitList(project.techStack)[0];
  if (tech) {
    drafts.push({
      source: "Project",
      text: `How does ${tech} show up in ${project.name}, and why that choice instead of a close alternative?`,
      rationale: `Tech stack starts with ${tech}.`,
    });
  }
  if (project.impact) {
    drafts.push({
      source: "Project",
      text: `You describe the impact of ${project.name} as "${clip(project.impact, 140)}". How did you measure it?`,
      rationale: `Uses the impact line on ${project.name}.`,
    });
  }
  return drafts;
}

function article(word: string) {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

function skillQuestion(skill: string, role: string, company: string) {
  const key = Object.keys(SKILL_PROMPTS).find((item) => includesTerm(skill, item) || includesTerm(item, skill));
  if (key) return SKILL_PROMPTS[key](role, company);
  return `How have you used ${skill} in a real project, and where would it matter for ${role} work at ${company}?`;
}

function roundFits(round: string, type: string) {
  const value = round.toLowerCase();
  if (type === "Mixed") return true;
  if (type === "HR") return /hr|behavioral/.test(value);
  if (type === "Managerial") return /manager|hr|behavioral|collab/.test(value);
  return /technical|coding|aptitude|assessment|case|sql|system/.test(value);
}

function dedupe(items: PreparedDraft[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function diversify(items: PreparedDraft[], limit: number) {
  const groups = new Map<string, PreparedDraft[]>();
  for (const item of items) {
    const list = groups.get(item.source) ?? [];
    list.push(item);
    groups.set(item.source, list);
  }
  const order = ["Project", "Historical", "Skill", "Experience", "Internship", "Role", "Leadership", "Hackathon", "Achievement"];
  const pulls: Record<string, number> = { Project: 2 };
  const result: PreparedDraft[] = [];
  let progressed = true;
  while (result.length < limit && progressed) {
    progressed = false;
    for (const source of order) {
      const list = groups.get(source);
      const count = pulls[source] ?? 1;
      for (let index = 0; index < count && result.length < limit; index += 1) {
        const next = list?.shift();
        if (!next) break;
        result.push(next);
        progressed = true;
      }
    }
  }
  return result;
}

export function nextInterviewMove(input: {
  candidate: Candidate;
  asked: { text: string; source: string; answer?: string }[];
  prepared: { text: string; source: string }[];
  maxQuestions?: number;
}): { done: true } | { done: false; text: string; source: string } {
  const max = input.maxQuestions ?? 7;
  const last = input.asked[input.asked.length - 1];
  if (last?.answer && last.source !== "Follow-up") {
    const words = last.answer.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0 && words.length < 35) {
      return { done: false, source: "Follow-up", text: followUpText(last, input.candidate) };
    }
  }
  if (input.asked.length >= max) return { done: true };
  const askedText = new Set(input.asked.map((item) => item.text));
  const next = input.prepared.find((item) => !askedText.has(item.text));
  if (!next) return { done: true };
  return { done: false, text: next.text, source: next.source };
}

function followUpText(last: { text: string; answer?: string }, candidate: Candidate) {
  const project = candidate.projects.find((item) => last.text.includes(item.name));
  const answer = (last.answer || "").toLowerCase();
  if (project) {
    const missing = splitList(project.techStack).find((tech) => !includesTerm(answer, tech));
    if (missing) {
      return `You have not mentioned ${missing}. How does ${missing} actually work inside ${project.name}?`;
    }
    if (project.challenges && !includesTerm(answer, project.challenges.split(" ")[0] || "")) {
      return `Stay with ${project.name}. ${clip(project.challenges, 160)} What did you try first, and what did you keep?`;
    }
  }
  const snippet = clip(last.answer || "that point", 80);
  return `You said “${snippet}”. Pick one concrete decision inside that answer: what you tried, what failed, and what you shipped.`;
}
