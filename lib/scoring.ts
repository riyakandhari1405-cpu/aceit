import { unique } from "./model";

export type RoleSignal = {
  label: string;
  test: RegExp;
  skills: string[];
  topics: string[];
};

export const ROLE_SIGNALS: RoleSignal[] = [
  {
    label: "Data Analyst",
    test: /data analyst|business analyst|analytics|bi developer|bi analyst/i,
    skills: ["sql", "excel", "python", "power bi", "tableau", "pandas", "statistics", "data cleaning"],
    topics: ["sql joins", "data cleaning", "dashboard design", "aggregations"],
  },
  {
    label: "iOS Developer",
    test: /ios|swift|mobile developer/i,
    skills: ["swift", "swiftui", "uikit", "xcode", "ios", "mobile"],
    topics: ["swiftui state", "uikit lifecycle", "memory management", "offline"],
  },
  {
    label: "Software Engineer",
    test: /software|sde|developer|engineer|full stack|backend|frontend/i,
    skills: ["java", "python", "javascript", "react", "node", "sql", "data structures", "system design", "api"],
    topics: ["data structures", "complexity", "api design", "debugging", "sql"],
  },
];

export function signalsForRole(role: string) {
  return ROLE_SIGNALS.find((signal) => signal.test.test(role)) ?? ROLE_SIGNALS[2];
}

export function includesTerm(haystack: string, term: string) {
  const needle = term.toLowerCase().trim();
  if (!needle) return false;
  if (needle.length <= 4) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
  }
  return haystack.toLowerCase().includes(needle);
}

export function buildSignalSet(role: string, historicalSkills: string[]) {
  const historical = unique(historicalSkills.map((skill) => skill.toLowerCase()));
  const roleSkills = signalsForRole(role).skills;
  return { historical, role: roleSkills };
}

export function relevance(text: string, signals: { historical: string[]; role: string[] }) {
  const hay = text.toLowerCase();
  const historicalHits = signals.historical.filter((skill) => includesTerm(hay, skill));
  const roleHits = signals.role.filter((skill) => includesTerm(hay, skill));
  const score = Math.max(0, Math.min(100, historicalHits.length * 18 + roleHits.length * 10));
  const reasons: string[] = [];
  if (historicalHits.length) {
    reasons.push(`Matches skills on logged profiles: ${historicalHits.slice(0, 4).join(", ")}`);
  }
  if (roleHits.length) {
    reasons.push(`Matches this role's focus: ${roleHits.slice(0, 4).join(", ")}`);
  }
  if (!reasons.length) reasons.push("Little overlap with this target so far");
  return {
    score,
    hits: unique([...historicalHits, ...roleHits]),
    reason: reasons.join(". "),
  };
}

export function skillGaps(userSkills: string[], historicalSkills: string[], role: string) {
  const have = userSkills.map((skill) => skill.toLowerCase());
  const missing = (skills: string[]) =>
    unique(skills).filter((skill) => !have.some((owned) => includesTerm(owned, skill) || includesTerm(skill, owned)));
  const fromHistory = missing(historicalSkills.map((skill) => skill.toLowerCase()));
  if (fromHistory.length) return fromHistory.slice(0, 5);
  return missing(signalsForRole(role).skills).slice(0, 5);
}
