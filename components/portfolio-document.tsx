import type { ReactNode } from "react";
import { cleanText, type PortfolioContact, type PortfolioEducation, type PortfolioRole, type PortfolioSections } from "@/lib/portfolio-content";

const skillGroups = [
  { id: "TECHNICAL", label: "Technical" },
  { id: "FRAMEWORK", label: "Frameworks" },
  { id: "TOOL", label: "Tools" },
  { id: "SOFT", label: "Soft skills" },
] as const;

export function PortfolioDocument({
  name,
  summary,
  about,
  sections,
  theme,
  company,
  role,
  showScores = false,
}: {
  name: string;
  summary: string;
  about: string;
  sections: PortfolioSections;
  theme: string;
  company: string;
  role: string;
  showScores?: boolean;
}) {
  const themeClass = theme === "editorial" || theme === "ink" || theme === "signal" ? theme : "signal";
  const headline = sections.headline || (summaryIsProfileDump(summary, sections) ? "" : cleanText(summary));
  const aboutText = aboutIsMisplaced(about, sections) ? "" : cleanText(about);
  const contact = sections.contact;
  const experience = [...sections.experiences, ...sections.internships];

  return (
    <article className={`portfolio-root theme-${themeClass} min-w-0 overflow-hidden rounded-2xl px-5 py-8 sm:px-8 md:px-12 md:py-14`}>
      <header>
        <p className="p-accent text-xs font-medium uppercase tracking-[0.18em]">
          {company && role ? `${role} · ${company}` : "Portfolio"}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{cleanText(name) || "Portfolio"}</h1>
        {headline ? <p className="mt-4 max-w-3xl text-lg leading-8 md:text-xl">{headline}</p> : null}
        <ContactLinks contact={contact} className="mt-6" />
      </header>

      {aboutText ? (
        <Block title="About">
          {aboutText.split(/\n\n+/).map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="mt-3 max-w-3xl leading-7">
              {paragraph}
            </p>
          ))}
        </Block>
      ) : null}

      {hasEducation(sections.education) ? (
        <Block title="Education">
          <EducationCard education={sections.education} />
        </Block>
      ) : null}

      {sections.skills.length ? (
        <Block title="Skills">
          <div className="mt-4 space-y-4">
            {[...skillGroups.map((group) => ({ id: group.id, label: group.label })), { id: "OTHER", label: "Other" }].map((group) => {
              const known = new Set<string>(skillGroups.map((item) => item.id));
              const skills = sections.skills.filter((skill) => (group.id === "OTHER" ? !known.has(skill.category) : skill.category === group.id));
              if (!skills.length) return null;
              return (
                <div key={group.id}>
                  <p className="p-muted text-xs font-medium uppercase tracking-[0.14em]">{group.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span key={skill.name} className="p-chip max-w-full rounded-full px-3 py-1 text-sm" title={showScores ? skill.reason : undefined}>
                        {skill.name}
                        {showScores ? <span className="p-muted"> · {skill.relevance}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Block>
      ) : null}

      {sections.projects.length ? (
        <Block title="Projects">
          <div className="mt-4 grid gap-4">
            {sections.projects.map((project) => (
              <article key={project.id || project.name} className="p-card min-w-0 rounded-2xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                  {showScores ? <span className="p-accent text-xs font-medium">Relevance {project.relevance}</span> : null}
                </div>
                {project.techStack ? <p className="p-muted mt-2 text-sm">{project.techStack}</p> : null}
                {project.description ? <Field label="Description" text={project.description} /> : null}
                {project.challenges ? <Field label="Challenges" text={project.challenges} /> : null}
                {project.solution ? <Field label="Solution" text={project.solution} /> : null}
                {project.impact ? <Field label="Impact" text={project.impact} /> : null}
                {showScores && project.reason ? <p className="p-muted mt-3 text-xs">{project.reason}</p> : null}
                {project.github || project.demoLink ? (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    {project.github ? <a className="p-accent" href={project.github}>GitHub</a> : null}
                    {project.demoLink ? <a className="p-accent" href={project.demoLink}>Demo</a> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </Block>
      ) : null}

      {sections.certifications.length ? (
        <Block title="Certifications">
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sections.certifications.map((item) => (
              <article key={item.id || item.name} className="p-card min-w-0 rounded-2xl p-5">
                <h3 className="font-semibold">{item.name}</h3>
                {item.issuer ? <p className="mt-1 text-sm">{item.issuer}</p> : null}
                {item.issuedOn ? <p className="p-muted mt-1 text-sm">{item.issuedOn}</p> : null}
                {item.credentialUrl ? (
                  <a className="p-accent mt-3 inline-block text-sm" href={item.credentialUrl}>
                    Credential
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </Block>
      ) : null}

      {experience.length ? (
        <Block title="Experience">
          <div className="mt-4 grid gap-4">
            {experience.map((item) => (
              <ExperienceCard key={`${item.kind}-${item.id || item.title}`} item={item} />
            ))}
          </div>
        </Block>
      ) : null}

      {sections.achievements.length ? (
        <Block title="Achievements">
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sections.achievements.map((item) => (
              <article key={item.id || item.title} className="p-card min-w-0 rounded-2xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.year ? <p className="p-muted text-sm">{item.year}</p> : null}
                </div>
                {item.description ? <p className="mt-2 text-sm leading-6">{item.description}</p> : null}
              </article>
            ))}
          </div>
        </Block>
      ) : null}

      {sections.leadership.length ? (
        <Block title="Leadership">
          <div className="mt-4 grid gap-4">
            {sections.leadership.map((item) => (
              <article key={item.id || item.role} className="p-card min-w-0 rounded-2xl p-5">
                <h3 className="font-semibold">{[item.role, item.organization].filter(Boolean).join(" · ")}</h3>
                {item.description ? <p className="mt-2 text-sm leading-6">{item.description}</p> : null}
              </article>
            ))}
          </div>
        </Block>
      ) : null}

      {sections.hackathons.length ? (
        <Block title="Hackathons">
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sections.hackathons.map((item) => (
              <article key={item.id || item.name} className="p-card min-w-0 rounded-2xl p-5">
                <h3 className="font-semibold">{item.name}</h3>
                {item.result ? <p className="p-accent mt-1 text-sm">{item.result}</p> : null}
                {item.projectName ? <p className="p-muted mt-1 text-sm">Project · {item.projectName}</p> : null}
                {item.description ? <p className="mt-2 text-sm leading-6">{item.description}</p> : null}
              </article>
            ))}
          </div>
        </Block>
      ) : null}

      {hasContact(contact) ? (
        <Block title="Contact">
          <ContactLinks contact={contact} className="mt-4" />
        </Block>
      ) : null}
    </article>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="p-line border-b pb-2 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <p className="mt-3 text-sm leading-6">
      <span className="font-medium">{label}. </span>
      {text}
    </p>
  );
}

function EducationCard({ education }: { education: PortfolioEducation }) {
  const program = [education.degree, education.branch].filter(Boolean).join(" · ");
  const marks = [
    education.cgpa !== null ? `CGPA ${education.cgpa}` : "",
    education.graduationYear ? `Class of ${education.graduationYear}` : "",
  ].filter(Boolean);
  const school = [
    education.tenthPercent !== null ? `10th ${education.tenthPercent}%` : "",
    education.twelfthPercent !== null ? `12th ${education.twelfthPercent}%` : "",
  ].filter(Boolean);
  return (
    <article className="p-card mt-4 min-w-0 rounded-2xl p-5">
      {program ? <h3 className="text-lg font-semibold">{program}</h3> : null}
      {education.college ? <p className={`${program ? "mt-1" : ""} text-sm`}>{education.college}</p> : null}
      {marks.length ? <p className="p-muted mt-2 text-sm">{marks.join(" · ")}</p> : null}
      {school.length ? <p className="p-muted mt-1 text-sm">{school.join(" · ")}</p> : null}
    </article>
  );
}

function ExperienceCard({ item }: { item: PortfolioRole }) {
  const span = [item.startDate, item.endDate].filter(Boolean).join(" – ");
  return (
    <article className="p-card min-w-0 rounded-2xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{item.title || item.company}</h3>
        {item.kind === "internship" ? <span className="p-accent text-xs font-medium uppercase tracking-[0.14em]">Internship</span> : null}
      </div>
      {item.company && item.title ? <p className="mt-1 text-sm">{item.company}</p> : null}
      {span ? <p className="p-muted mt-1 text-sm">{span}</p> : null}
      {item.description ? <Field label="Responsibilities" text={item.description} /> : null}
    </article>
  );
}

function ContactLinks({ contact, className }: { contact: PortfolioContact; className?: string }) {
  const items = [
    contact.location ? { label: contact.location } : null,
    contact.email ? { label: contact.email, href: `mailto:${contact.email}` } : null,
    contact.phone ? { label: contact.phone } : null,
    contact.linkedin ? { label: "LinkedIn", href: contact.linkedin } : null,
    contact.github ? { label: "GitHub", href: contact.github } : null,
  ].filter((item): item is { label: string; href?: string } => Boolean(item));
  if (!items.length) return null;
  return (
    <div className={`p-muted flex flex-wrap gap-x-4 gap-y-2 text-sm ${className ?? ""}`}>
      {items.map((item) =>
        item.href ? (
          <a key={item.label} href={item.href} className="min-w-0 break-all">
            {item.label}
          </a>
        ) : (
          <span key={item.label} className="min-w-0">
            {item.label}
          </span>
        ),
      )}
    </div>
  );
}

function hasEducation(education: PortfolioEducation) {
  return Boolean(
    education.college ||
      education.degree ||
      education.branch ||
      education.cgpa !== null ||
      education.graduationYear ||
      education.tenthPercent !== null ||
      education.twelfthPercent !== null,
  );
}

function hasContact(contact: PortfolioContact) {
  return Boolean(contact.email || contact.phone || contact.location || contact.linkedin || contact.github);
}

function summaryIsProfileDump(summary: string, sections: PortfolioSections) {
  const text = cleanText(summary);
  if (!text) return true;
  if (sections.headline && text === sections.headline) return false;
  if (sections.education.college && text.includes(sections.education.college)) return true;
  return /closest skill overlap|the project that should open|the active target is|class of /i.test(text);
}

function aboutIsMisplaced(about: string, sections: PortfolioSections) {
  const text = cleanText(about).toLowerCase();
  if (!text) return true;
  if (sections.projects.some((project) => project.name && text.includes(project.name.toLowerCase()))) return true;
  return text.includes("internship:") || text.startsWith("leadership:") || text.includes("also on the profile:");
}
