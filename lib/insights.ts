import { unique } from "./model";
import { splitList } from "./model";

export type InsightQuestion = {
  question: string;
  topic: string;
  roundType: string;
};

export type InsightPayload = {
  skills: { name: string; count: number }[];
  topics: { name: string; count: number }[];
  rounds: string[];
  questions: InsightQuestion[];
  experiences: { roundType: string; experience: string }[];
  recordCount: number;
  questionCount: number;
  experienceCount: number;
};

const ROUND_RANK = ["aptitude", "online assessment", "coding", "technical", "case", "managerial", "hr"];

export function aggregateInsights(input: {
  records: { selectedSkills: string }[];
  questions: InsightQuestion[];
  experiences: { roundType: string; experience: string }[];
}): InsightPayload {
  const skillCounts = new Map<string, { name: string; count: number }>();
  for (const record of input.records) {
    const seen = new Set<string>();
    for (const skill of splitList(record.selectedSkills)) {
      const key = skill.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const current = skillCounts.get(key) ?? { name: skill, count: 0 };
      current.count += 1;
      skillCounts.set(key, current);
    }
  }

  const topicCounts = new Map<string, { name: string; count: number }>();
  for (const question of input.questions) {
    const topic = question.topic.trim();
    if (!topic) continue;
    const key = topic.toLowerCase();
    const current = topicCounts.get(key) ?? { name: topic, count: 0 };
    current.count += 1;
    topicCounts.set(key, current);
  }

  const roundNames = unique(
    [...input.questions.map((question) => question.roundType), ...input.experiences.map((item) => item.roundType)]
      .map((round) => round.trim())
      .filter(Boolean),
  ).sort((a, b) => rank(a) - rank(b));

  return {
    skills: [...skillCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    topics: [...topicCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    rounds: roundNames,
    questions: input.questions,
    experiences: input.experiences,
    recordCount: input.records.length,
    questionCount: input.questions.length,
    experienceCount: input.experiences.length,
  };
}

function rank(round: string) {
  const index = ROUND_RANK.findIndex((item) => round.toLowerCase().includes(item));
  return index === -1 ? ROUND_RANK.length : index;
}

export function insightStamp(company: string, role: string, counts: { records: number; questions: number; experiences: number }) {
  return `${company.toLowerCase()}|${role.toLowerCase()}|${counts.records}|${counts.questions}|${counts.experiences}`;
}

export function insightSummary(company: string, role: string, payload: InsightPayload) {
  const scope = role === "*" ? company : `${role} at ${company}`;
  if (payload.recordCount + payload.questionCount + payload.experienceCount === 0) {
    return `No placement records are stored for ${scope}. This page only shows what has been uploaded.`;
  }
  const skillText = payload.skills
    .slice(0, 4)
    .map((skill) => `${skill.name} (${skill.count} of ${payload.recordCount || skill.count})`)
    .join(", ");
  const topicText = payload.topics
    .slice(0, 3)
    .map((topic) => topic.name)
    .join(", ");
  const roundText = payload.rounds.length ? ` Recorded rounds: ${payload.rounds.join(" → ")}.` : "";
  const skillsSentence = payload.skills.length
    ? ` Skills that appear on the logged profiles: ${skillText}.`
    : "";
  const topicSentence = topicText ? ` Topics named on the logged questions: ${topicText}.` : "";
  return `AceIt found ${payload.recordCount} profile${payload.recordCount === 1 ? "" : "s"}, ${payload.questionCount} question${payload.questionCount === 1 ? "" : "s"}, and ${payload.experienceCount} interview note${payload.experienceCount === 1 ? "" : "s"} for ${scope}.${skillsSentence}${topicSentence}${roundText} These are preparation notes from stored records, not a prediction of who will be hired.`;
}

export function emptyInsight(): InsightPayload {
  return {
    skills: [],
    topics: [],
    rounds: [],
    questions: [],
    experiences: [],
    recordCount: 0,
    questionCount: 0,
    experienceCount: 0,
  };
}
