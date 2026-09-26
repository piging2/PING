/**
 * AskFYD entry (family registry #11). Job: INVITE.
 *
 * Ask FYD on the public surface is exactly one quiet affordance:
 * floating-entry (one quiet pill the user opens deliberately) or
 * inline-section (an unobtrusive prompt block). The Q&A panel opens
 * ON DEMAND from that affordance: a question field, an Ask button, and
 * the evidence-bounded answer with its epistemic status, citations,
 * and explicit unknowns. Nothing fetches until the visitor asks.
 *
 * Tenant selection comes from the route path only:
 * POST /api/fyd/ask/<siteSlug> with { question, mode: "visitor" }.
 * No model, no credentials, no body-controlled tenant.
 */

"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { FOCUS_RING, cx, type FamilySectionProps } from "../shared";

interface PublicCitation {
  n: number;
  label: string;
  source: string;
  basis: string;
  lastChecked: string | null;
  claimClass: "supported" | "derived";
  evidenceClass: "direct" | "derived" | "inferred" | "generated" | "unknown";
}

interface AskResponse {
  ok: boolean;
  answer?: string;
  refusal?: boolean;
  citations?: PublicCitation[];
  unknowns?: string[];
  answerClass?: "supported" | "derived" | "unknown";
  answerEvidenceClass?: PublicCitation["evidenceClass"];
  error?: string;
}

const EVIDENCE_STATUS: Record<PublicCitation["evidenceClass"], string> = {
  direct: "From the site record",
  derived: "Derived from the site record",
  inferred: "Inferred — check before relying on it",
  generated: "Generated summary — not a verified fact",
  unknown: "Evidence unclear",
};

/** Render [n] markers as superscript refs into the citation list. */
function AnswerText({ text }: { text: string }): ReactNode {
  const parts = text.split(/\[(\d+)\]/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <sup key={i} className="ml-0.5 font-body text-caption text-text-muted">
            [{part}]
          </sup>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function AskPanel({ siteSlug }: { siteSlug: string }): JSX.Element {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  async function ask(e: FormEvent): Promise<void> {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch(`/api/fyd/ask/${encodeURIComponent(siteSlug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, mode: "visitor" }),
      });
      if (!resp.ok) {
        setError("Ask FYD is unavailable right now. Please try again later.");
        return;
      }
      const body = (await resp.json()) as AskResponse;
      if (!body.ok) {
        setError(
          typeof body.error === "string" && body.error.length > 0
            ? body.error
            : "Ask FYD could not answer that.",
        );
        return;
      }
      setResult(body);
    } catch {
      setError("Ask FYD is unavailable right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  const evidenceClass = result?.answerEvidenceClass ?? "unknown";

  return (
    <div data-component="AskFYD" data-variant="qa-panel">
      <form onSubmit={ask} className="flex flex-col gap-3">
        <label
          htmlFor="ask-fyd-question"
          className="font-body text-body font-semibold text-text-heading"
        >
          Ask about this business
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="ask-fyd-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What services do you offer?"
            maxLength={500}
            disabled={loading}
            className={cx(
              "min-h-[44px] flex-1 rounded-md border border-border-subtle bg-surface-raised px-4",
              "font-body text-body text-text-body placeholder:text-text-muted",
              FOCUS_RING,
            )}
          />
          <button
            type="submit"
            disabled={loading || question.trim().length === 0}
            className={cx(
              "inline-flex min-h-[44px] items-center justify-center rounded-pill px-6 font-body text-body",
              "bg-cta-primary-background text-cta-primary-text hover:bg-cta-primary-hover",
              "disabled:cursor-not-allowed disabled:opacity-50",
              FOCUS_RING,
            )}
          >
            {loading ? "Asking…" : "Ask FYD"}
          </button>
        </div>
        <p className="font-body text-caption text-text-muted">
          Answers come only from what we can verify about this business. When the
          evidence is not there, Ask FYD says so.
        </p>
      </form>

      {error && (
        <p role="alert" className="mt-4 font-body text-body text-text-body">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6">
          <p
            className={cx(
              "inline-flex items-center rounded-pill px-3 py-1 font-body text-caption",
              result.refusal
                ? "bg-surface-raised text-text-muted"
                : "bg-surface-content text-text-body",
            )}
            aria-live="polite"
          >
            {result.refusal ? "No verified answer" : EVIDENCE_STATUS[evidenceClass]}
          </p>
          {result.answer && (
            <div className="mt-3 font-body text-body text-text-body">
              {result.answer.split("\n\n").map((para, i) => (
                <p key={i} className="mb-3">
                  <AnswerText text={para} />
                </p>
              ))}
            </div>
          )}
          {result.unknowns && result.unknowns.length > 0 && (
            <div className="mt-4">
              <p className="font-body text-body font-semibold text-text-heading">
                Not on record:
              </p>
              <ul className="mt-1 list-disc pl-5 font-body text-body text-text-muted">
                {result.unknowns.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}
          {result.citations && result.citations.length > 0 && (
            <details className="mt-4">
              <summary
                className={cx(
                  "cursor-pointer font-body text-body font-semibold text-text-heading",
                  FOCUS_RING,
                  "rounded-sm",
                )}
              >
                Why this answer? ({result.citations.length}{" "}
                {result.citations.length === 1 ? "source" : "sources"})
              </summary>
              <ol className="mt-2 space-y-3">
                {result.citations.map((c) => (
                  <li key={c.n} className="font-body text-body text-text-muted">
                    <span className="font-semibold text-text-body">[{c.n}] </span>
                    {c.label} — {c.source}. {c.basis}
                    {c.lastChecked ? ` Checked ${c.lastChecked}.` : ""}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function AskPill({ ctx }: { ctx: FamilySectionProps["ctx"] }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Ask FYD about this business"
        data-component="AskFYD"
        data-variant="floating-entry"
        className={cx(
          // Mobile: left-side placement with breathing room from the right
          // edge and the sticky call bar below (object-presence exploration,
          // 2026-09-26). Anchoring untouched: still a floating entry.
          // Desktop keeps the right-side floating entry.
          "fixed bottom-24 left-4 z-40 inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-pill px-5 md:bottom-6 md:left-auto md:right-4",
          "bg-cta-primary-background text-cta-primary-text shadow-lg hover:bg-cta-primary-hover",
          FOCUS_RING,
        )}
      >
        <span aria-hidden="true" className="font-body text-body font-semibold">
          ?
        </span>
        <span className="font-body text-body">Ask FYD</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Ask FYD about this business"
          data-component="AskFYD"
          data-variant="qa-dialog"
          className={cx(
            "fixed bottom-40 left-4 z-40 max-h-[70vh] w-[calc(100vw-2rem)] max-w-[420px] overflow-y-auto",
            "rounded-lg border border-border-subtle bg-surface-content p-5 shadow-xl",
            "md:bottom-24 md:left-auto md:right-4",
          )}
        >
          <AskPanel siteSlug={ctx.input.siteSlug} />
        </div>
      )}
    </>
  );
}

function InlineSection({ section, ctx }: FamilySectionProps): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <section
      id="ask-fyd"
      data-component="AskFYD"
      data-variant="inline-section"
      aria-label="Ask FYD"
      className="bg-surface-content"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8">
        <div className="max-w-[65ch] rounded-lg border border-border-subtle bg-surface-raised p-8 shadow-md">
          <h2 className="font-display text-h2 text-text-heading">Questions about the work?</h2>
          <p className="mt-4 font-body text-body text-text-muted">
            Ask about services, scope, or scheduling. Answers come from what we can verify about
            this business.
          </p>
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={false}
              className={cx(
                "mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill px-6 font-body text-body",
                "bg-cta-primary-background text-cta-primary-text hover:bg-cta-primary-hover",
                FOCUS_RING,
              )}
            >
              Ask FYD
            </button>
          ) : (
            <div className="mt-6">
              <AskPanel siteSlug={ctx.input.siteSlug} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function AskFYD(props: FamilySectionProps): JSX.Element {
  if (props.section.variant === "inline-section") {
    return <InlineSection {...props} />;
  }
  return <AskPill ctx={props.ctx} />;
}
