import { buildAnalysis } from "../lib/analysis";
import { evaluateSession } from "../lib/evaluate";
import { aggregateInsights, insightSummary } from "../lib/insights";
import { buildPortfolioContent } from "../lib/portfolio-content";
import { buildQuestions } from "../lib/questions";
import { relevance, buildSignalSet } from "../lib/scoring";
import { demoCandidate, placementQuestions, placementRecords } from "../lib/seed-data";

const candidate = demoCandidate("demo", new Date().toISOString());
const schneiderSkills = placementRecords
  .filter((row) => row.company === "Schneider Electric" && row.role === "Software Engineer")
  .flatMap((row) => row.selectedSkills.split(",").map((item) => item.trim()));
const eySkills = placementRecords
  .filter((row) => row.company === "EY")
  .flatMap((row) => row.selectedSkills.split(",").map((item) => item.trim()));
const appleSkills = placementRecords
  .filter((row) => row.company === "Apple")
  .flatMap((row) => row.selectedSkills.split(",").map((item) => item.trim()));

function score(name: string, skills: string[], role: string) {
  const project = candidate.projects.find((item) => item.name === name)!;
  const signals = buildSignalSet(role, skills);
  return relevance([project.name, project.description, project.techStack, project.solution, project.impact].join(" "), signals).score;
}

const raahaSchneider = score("RAAHA", schneiderSkills, "Software Engineer");
const gridSchneider = score("GridWatch", schneiderSkills, "Software Engineer");
const gridEy = score("GridWatch", eySkills, "Data Analyst");
const trailEy = score("Trailmark", eySkills, "Data Analyst");
const trailApple = score("Trailmark", appleSkills, "iOS Developer");
const raahaApple = score("RAAHA", appleSkills, "iOS Developer");

if (raahaSchneider <= gridSchneider) throw new Error(`RAAHA should lead Schneider, got ${raahaSchneider} vs ${gridSchneider}`);
if (gridEy <= trailEy) throw new Error("GridWatch should lead EY");
if (trailApple <= raahaApple) throw new Error("Trailmark should lead Apple");

const questions = buildQuestions({
  candidate,
  interviewType: "Technical",
  historical: placementQuestions.filter((item) => item.company === "Schneider Electric"),
  historicalSkills: schneiderSkills,
});
const blob = questions.map((item) => item.text).join("\n");
if (!blob.includes("RAAHA")) throw new Error("Questions missed RAAHA");
if (!blob.toLowerCase().includes("fetch")) throw new Error("Questions missed the data fetch follow-up");
if (!questions.some((item) => item.source === "Historical")) throw new Error("Historical question missing");

const eyCandidate = { ...candidate, target: { id: "t", company: "EY", role: "Data Analyst", interviewType: "Technical" } };
const eyQuestions = buildQuestions({
  candidate: eyCandidate,
  interviewType: "Technical",
  historical: placementQuestions.filter((item) => item.company === "EY"),
  historicalSkills: eySkills,
});
if (!eyQuestions.some((item) => item.text.toLowerCase().includes("inner join"))) throw new Error("EY historical join question missing");

const portfolio = buildPortfolioContent(eyCandidate, eySkills);
if (portfolio.sections.projects[0]?.name !== "GridWatch") throw new Error(`EY portfolio lead was ${portfolio.sections.projects[0]?.name}`);

const empty = aggregateInsights({ records: [], questions: [], experiences: [] });
if (empty.skills.length || insightSummary("Nowhere", "Role", empty).includes("SQL appears")) {
  throw new Error("Empty insights invented skills");
}

const weak = evaluateSession({
  candidate,
  company: "Schneider Electric",
  role: "Software Engineer",
  signals: ["sql", "java", "react"],
  turns: [{ question: "What problem does RAAHA solve?", source: "Project", answer: "Buses." }],
});
const strong = evaluateSession({
  candidate,
  company: "Schneider Electric",
  role: "Software Engineer",
  signals: ["sql", "java", "react", "node"],
  turns: [
    {
      question: "What problem does RAAHA solve?",
      source: "Project",
      answer:
        "RAAHA helps students at the gate because buses bunch. I measured 180 weekly active students. The Node service stores points in PostgreSQL and the React screen shows a confidence band instead of a fake minute.",
    },
  ],
});
if (strong.readinessScore <= weak.readinessScore) throw new Error(`Scores did not separate: ${weak.readinessScore} vs ${strong.readinessScore}`);
if (/will be selected|hiring decision is yes/i.test(strong.narrative)) throw new Error("Evaluation predicted hiring");

const analysis = buildAnalysis(candidate, schneiderSkills);
if (!analysis.strengths.join(" ").includes("RAAHA") && !analysis.focusAreas.join(" ").includes("RAAHA")) {
  throw new Error("Analysis did not mention RAAHA");
}

console.log("AceIt preparation checks passed", {
  raahaSchneider,
  gridEy,
  trailApple,
  questions: questions.length,
  weak: weak.readinessScore,
  strong: strong.readinessScore,
});
