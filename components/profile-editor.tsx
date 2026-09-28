"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EntityList } from "@/components/entity-list";
import { Button, fieldClass, Field } from "@/components/ui";
import {
  deleteAchievement,
  deleteCertification,
  deleteExperience,
  deleteHackathon,
  deleteInternship,
  deleteLeadership,
  deleteProject,
  deleteSkill,
  saveAchievement,
  saveCertification,
  saveEducation,
  saveExperience,
  saveHackathon,
  saveInternship,
  saveLeadership,
  savePersonal,
  saveProject,
  saveSkill,
} from "@/lib/actions/profile";
import type { Candidate } from "@/lib/model";

const categories = [
  { id: "TECHNICAL", label: "Technical" },
  { id: "TOOL", label: "Tool" },
  { id: "FRAMEWORK", label: "Framework" },
  { id: "SOFT", label: "Soft skill" },
] as const;

export function ProfileEditor({ candidate, missing }: { candidate: Candidate; missing: string[] }) {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
      <nav className="hidden lg:block">
        <div className="sticky top-0 space-y-1">
          {[
            ["personal", "Personal"],
            ["academics", "Academics"],
            ["skills", "Skills"],
            ["projects", "Projects"],
            ["certifications", "Certifications"],
            ["experience", "Experience"],
            ["internships", "Internships"],
            ["achievements", "Achievements"],
            ["leadership", "Leadership"],
            ["hackathons", "Hackathons"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-ink">
              {label}
            </a>
          ))}
        </div>
      </nav>
      <div className="min-w-0 space-y-6">
        {missing.length ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            Still open: {missing.slice(0, 6).join(", ")}
            {missing.length > 6 ? "…" : ""}.
          </p>
        ) : (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">Profile sections are filled in.</p>
        )}
        <Section id="personal" title="Personal">
          <PersonalForm candidate={candidate} />
        </Section>
        <Section id="academics" title="Academics">
          <EducationForm candidate={candidate} />
        </Section>
        <Section id="skills" title="Skills">
          <SkillEditor candidate={candidate} />
        </Section>
        <Section id="projects" title="Projects">
          <EntityList
            title="Projects"
            description="Write the problem, the hard part, and the result. Interview questions are built from these fields."
            addLabel="Add project"
            items={candidate.projects.map((project) => ({
              id: project.id,
              title: project.name,
              detail: project.techStack,
              values: {
                name: project.name,
                description: project.description,
                techStack: project.techStack,
                challenges: project.challenges,
                solution: project.solution,
                impact: project.impact,
                github: project.github,
                demoLink: project.demoLink,
              },
            }))}
            blank={{ name: "", description: "", techStack: "", challenges: "", solution: "", impact: "", github: "", demoLink: "" }}
            fields={[
              { name: "name", label: "Name", placeholder: "RAAHA" },
              { name: "techStack", label: "Tech stack", placeholder: "React, Node.js, PostgreSQL" },
              { name: "description", label: "Description", type: "textarea", placeholder: "Who it is for and what it does" },
              { name: "challenges", label: "Challenges", type: "textarea", placeholder: "The hard technical part" },
              { name: "solution", label: "Solution", type: "textarea", placeholder: "What you actually built" },
              { name: "impact", label: "Impact", type: "textarea", placeholder: "What changed, with a number if you have one" },
              { name: "github", label: "GitHub" },
              { name: "demoLink", label: "Demo link" },
            ]}
            save={saveProject}
            remove={deleteProject}
          />
        </Section>
        <Section id="certifications" title="Certifications">
          <EntityList
            title="Certifications"
            description="Courses and credentials you can talk about."
            addLabel="Add certification"
            items={candidate.certifications.map((item) => ({
              id: item.id,
              title: item.name,
              detail: [item.issuer, item.issuedOn].filter(Boolean).join(" · "),
              values: { name: item.name, issuer: item.issuer, issuedOn: item.issuedOn, credentialUrl: item.credentialUrl },
            }))}
            blank={{ name: "", issuer: "", issuedOn: "", credentialUrl: "" }}
            fields={[
              { name: "name", label: "Name" },
              { name: "issuer", label: "Issuer" },
              { name: "issuedOn", label: "Year" },
              { name: "credentialUrl", label: "Credential URL" },
            ]}
            save={saveCertification}
            remove={deleteCertification}
          />
        </Section>
        <Section id="experience" title="Experience">
          <RoleList
            description="Roles, clubs, or jobs outside internships."
            addLabel="Add experience"
            items={candidate.experiences}
            save={saveExperience}
            remove={deleteExperience}
          />
        </Section>
        <Section id="internships" title="Internships">
          <RoleList
            description="What you owned, and how you knew it worked."
            addLabel="Add internship"
            items={candidate.internships}
            save={saveInternship}
            remove={deleteInternship}
          />
        </Section>
        <Section id="achievements" title="Achievements">
          <EntityList
            title="Achievements"
            description="Awards and lists worth a sentence in an HR round."
            addLabel="Add achievement"
            items={candidate.achievements.map((item) => ({
              id: item.id,
              title: item.title,
              detail: item.year,
              values: { title: item.title, description: item.description, year: item.year },
            }))}
            blank={{ title: "", description: "", year: "" }}
            fields={[
              { name: "title", label: "Title" },
              { name: "year", label: "Year" },
              { name: "description", label: "Description", type: "textarea" },
            ]}
            save={saveAchievement}
            remove={deleteAchievement}
          />
        </Section>
        <Section id="leadership" title="Leadership">
          <EntityList
            title="Leadership"
            description="Positions where you made a decision other people felt."
            addLabel="Add role"
            items={candidate.leadership.map((item) => ({
              id: item.id,
              title: item.role,
              detail: item.organization,
              values: { role: item.role, organization: item.organization, description: item.description },
            }))}
            blank={{ role: "", organization: "", description: "" }}
            fields={[
              { name: "role", label: "Role" },
              { name: "organization", label: "Organization" },
              { name: "description", label: "Description", type: "textarea" },
            ]}
            save={saveLeadership}
            remove={deleteLeadership}
          />
        </Section>
        <Section id="hackathons" title="Hackathons">
          <EntityList
            title="Hackathons"
            description="What you built when the clock was short."
            addLabel="Add hackathon"
            items={candidate.hackathons.map((item) => ({
              id: item.id,
              title: item.name,
              detail: item.result,
              values: { name: item.name, result: item.result, description: item.description, projectName: item.projectName },
            }))}
            blank={{ name: "", result: "", description: "", projectName: "" }}
            fields={[
              { name: "name", label: "Name" },
              { name: "result", label: "Result" },
              { name: "projectName", label: "Project" },
              { name: "description", label: "Description", type: "textarea" },
            ]}
            save={saveHackathon}
            remove={deleteHackathon}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PersonalForm({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [values, setValues] = useState({
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    linkedin: candidate.linkedin,
    github: candidate.github,
    headline: candidate.headline,
  });
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await savePersonal(values);
          if (!result.ok) setError(result.error);
          else {
            setError("");
            setNote("Saved.");
            router.refresh();
          }
        });
      }}
    >
      <Field label="Name"><input className={fieldClass} value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></Field>
      <Field label="Email"><input className={fieldClass} value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></Field>
      <Field label="Phone"><input className={fieldClass} value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></Field>
      <Field label="Location"><input className={fieldClass} value={values.location} onChange={(event) => setValues({ ...values, location: event.target.value })} /></Field>
      <Field label="LinkedIn"><input className={fieldClass} value={values.linkedin} onChange={(event) => setValues({ ...values, linkedin: event.target.value })} /></Field>
      <Field label="GitHub"><input className={fieldClass} value={values.github} onChange={(event) => setValues({ ...values, github: event.target.value })} /></Field>
      <div className="md:col-span-2">
        <Field label="Headline"><input className={fieldClass} value={values.headline} onChange={(event) => setValues({ ...values, headline: event.target.value })} placeholder="One line a recruiter can repeat" /></Field>
      </div>
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      {note ? <p className="text-sm text-muted md:col-span-2">{note}</p> : null}
      <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save personal details"}</Button></div>
    </form>
  );
}

function EducationForm({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [values, setValues] = useState({
    tenthPercent: candidate.tenthPercent?.toString() ?? "",
    twelfthPercent: candidate.twelfthPercent?.toString() ?? "",
    college: candidate.college,
    degree: candidate.degree,
    branch: candidate.branch,
    cgpa: candidate.cgpa?.toString() ?? "",
    graduationYear: candidate.graduationYear?.toString() ?? "",
  });
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveEducation(values);
          if (!result.ok) setError(result.error);
          else {
            setError("");
            setNote("Saved.");
            router.refresh();
          }
        });
      }}
    >
      <Field label="10th percentage"><input className={fieldClass} value={values.tenthPercent} onChange={(event) => setValues({ ...values, tenthPercent: event.target.value })} /></Field>
      <Field label="12th percentage"><input className={fieldClass} value={values.twelfthPercent} onChange={(event) => setValues({ ...values, twelfthPercent: event.target.value })} /></Field>
      <Field label="College"><input className={fieldClass} value={values.college} onChange={(event) => setValues({ ...values, college: event.target.value })} /></Field>
      <Field label="Degree"><input className={fieldClass} value={values.degree} onChange={(event) => setValues({ ...values, degree: event.target.value })} /></Field>
      <Field label="Branch"><input className={fieldClass} value={values.branch} onChange={(event) => setValues({ ...values, branch: event.target.value })} /></Field>
      <Field label="CGPA (out of 10)"><input className={fieldClass} value={values.cgpa} onChange={(event) => setValues({ ...values, cgpa: event.target.value })} /></Field>
      <Field label="Graduation year"><input className={fieldClass} value={values.graduationYear} onChange={(event) => setValues({ ...values, graduationYear: event.target.value })} /></Field>
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      {note ? <p className="text-sm text-muted md:col-span-2">{note}</p> : null}
      <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save academics"}</Button></div>
    </form>
  );
}

function SkillEditor({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("TECHNICAL");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await saveSkill({ id: editing ?? undefined, name, category });
            if (!result.ok) setError(result.error);
            else {
              setError("");
              setName("");
              setEditing(null);
              router.refresh();
            }
          });
        }}
      >
        <input className={fieldClass} value={name} placeholder="SQL" onChange={(event) => setName(event.target.value)} />
        <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Update" : "Add"}</Button>
      </form>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {candidate.skills.map((skill) => (
          <span key={skill.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1 text-sm">
            <button
              type="button"
              className="hover:text-copper"
              onClick={() => {
                setEditing(skill.id);
                setName(skill.name);
                setCategory(skill.category);
              }}
            >
              {skill.name}
              <span className="text-muted"> · {categories.find((item) => item.id === skill.category)?.label}</span>
            </button>
            <button
              type="button"
              className="text-muted hover:text-danger"
              aria-label={`Remove ${skill.name}`}
              onClick={() =>
                start(async () => {
                  const result = await deleteSkill(skill.id);
                  if (!result.ok) setError(result.error);
                  else router.refresh();
                })
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function RoleList({
  description,
  addLabel,
  items,
  save,
  remove,
}: {
  description: string;
  addLabel: string;
  items: Candidate["experiences"];
  save: (values: Record<string, string | undefined>) => Promise<{ ok: true } | { ok: false; error: string }>;
  remove: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  return (
    <EntityList
      title=""
      description={description}
      addLabel={addLabel}
      items={items.map((item) => ({
        id: item.id,
        title: item.title,
        detail: [item.company, [item.startDate, item.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" · "),
        values: {
          title: item.title,
          company: item.company,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
        },
      }))}
      blank={{ title: "", company: "", startDate: "", endDate: "", description: "" }}
      fields={[
        { name: "title", label: "Title" },
        { name: "company", label: "Organization" },
        { name: "startDate", label: "Start" },
        { name: "endDate", label: "End" },
        { name: "description", label: "What you owned", type: "textarea" },
      ]}
      save={save}
      remove={remove}
    />
  );
}
