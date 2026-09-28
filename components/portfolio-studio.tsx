"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PortfolioDocument } from "@/components/portfolio-document";
import { Badge, Button, EngineNote } from "@/components/ui";
import { generatePortfolio, savePortfolioTheme, setPortfolioPublic } from "@/lib/actions/portfolio";
import { PORTFOLIO_THEMES } from "@/lib/model";
import type { PortfolioSections } from "@/lib/portfolio-content";

export function PortfolioStudio({
  name,
  summary,
  about,
  sections,
  theme,
  company,
  role,
  isPublic,
  shareUrl,
  engine,
  stale,
}: {
  name: string;
  summary: string;
  about: string;
  sections: PortfolioSections;
  theme: string;
  company: string;
  role: string;
  isPublic: boolean;
  shareUrl: string;
  engine: string;
  stale: boolean;
}) {
  const router = useRouter();
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [publicOn, setPublicOn] = useState(isPublic);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [usedEngine, setUsedEngine] = useState(engine);
  const [pending, start] = useTransition();
  const [pendingLabel, setPendingLabel] = useState("Saving…");
  const [copied, setCopied] = useState(false);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-medium">Theme</p>
          <div className="mt-3 space-y-2">
            {PORTFOLIO_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCurrentTheme(item.id);
                  setPendingLabel("Saving…");
                  start(async () => {
                    const result = await savePortfolioTheme(item.id);
                    if (!result.ok) setError(result.error);
                    else router.refresh();
                  });
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left ${currentTheme === item.id ? "border-copper bg-copper/10" : "border-line"}`}
              >
                <span className="block text-sm font-medium">{item.name}</span>
                <span className="mt-1 block text-xs text-muted">{item.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Public link</p>
            <Badge tone={publicOn ? "accent" : "neutral"}>{publicOn ? "Live" : "Private"}</Badge>
          </div>
          <p className="mt-2 break-all text-xs text-muted">{shareUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                start(async () => {
                  const next = !publicOn;
                  const result = await setPortfolioPublic(next);
                  if (!result.ok) setError(result.error);
                  else {
                    setPublicOn(next);
                    router.refresh();
                  }
                })
              }
            >
              {publicOn ? "Make private" : "Make public"}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setPendingLabel("Generating…");
              start(async () => {
                setError("");
                const result = await generatePortfolio(stale);
                if (!result.ok) setError(result.error);
                else {
                  setNote(result.message);
                  setWarning(result.warning || "");
                  setUsedEngine(result.engine);
                  router.refresh();
                }
              });
            }}
          >
            {pending ? pendingLabel : stale ? "Refresh for this target" : "Regenerate"}
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {note ? <p className="text-sm text-muted">{note}</p> : null}
          <EngineNote engine={usedEngine} warning={warning} />
        </div>
      </div>
      <div className="min-w-0">
      <PortfolioDocument
        name={name}
        summary={summary}
        about={about}
        sections={sections}
        theme={currentTheme}
        company={company}
        role={role}
        showScores
      />
      </div>
    </div>
  );
}
