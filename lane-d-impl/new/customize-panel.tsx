/**
 * Lane D: the customize-with-FYD owner panel (DEMO ONLY).
 *
 * Renders inside DemoOwnerMode, which only mounts when
 * NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 (localhost/private). The conversational
 * loop: plain English -> typed intent -> digest-bound proposal -> explicit
 * demo-owner approval -> journaled directive -> re-rendered spec.
 *
 * CEO 2026-09-24: OWNER UX = CHAT-FIRST + PREVIEW + MINIMAL STRUCTURED
 * REVIEW/APPROVE FOR CONSEQUENTIAL CHANGES. Authority UX scales with
 * consequence (LOW = fast + reversible with undo; MEDIUM = quick apply
 * with visible undo/history; HIGH = preview + explicit approval; CRITICAL
 * = strong confirmation). Consequential changes resolve into a COMPACT
 * VISUAL DIFF PREVIEW (old -> new, affected surfaces) with Cancel/Apply.
 * The owner never sees capabilities, events, digests, or SiteSpec.
 *
 * Parse and approve both go through /api/fyd/customize. The client never
 * applies anything: approval only journals an overlay event, and the
 * rendered page picks it up on the next projection dump.
 *
 * Write-boundary F-1: the client mints ONE request_id per owner action
 * (crypto.randomUUID on Approve click) and sends it on every attempt for
 * that logical action, retained through catch with a Retry button using
 * the same ID. A server-returned requestId (including the 504 UNKNOWN
 * body) is retained the same way. The server-minted path is unreachable
 * from this panel: every mutating call carries a client-generated ID.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

type ConsequenceTier = "low" | "medium" | "high" | "critical";

interface ParsedProposal {
  intent: { kind: string; target: string };
  intentDigest: string;
  resolutionNote: string;
  siteIntent: unknown;
  proposal: Record<string, unknown>;
  reviewCard: { title: string; before: string[]; after: string[]; operationCount: number };
  specDigest: string;
  consequenceTier: ConsequenceTier;
  tierLabel: string;
  undoHint: string | null;
}

interface ApiError {
  ok: false;
  code?: string;
  error: string;
  requestId?: string;
}

interface ApprovalDone {
  summaryTitle: string;
  afterLines: string[];
  undoHint: string | null;
  undoText: string | null;
}

interface InspectData {
  siteId: string;
  specDigest: string;
  baseSpecDigest: string;
  pageOrder: { pageSlug: string; sections: { id: string; component: string; hidden: boolean }[] }[];
  directives: {
    intentId: string;
    siteIntent: unknown;
    proposalDigest: string;
    approvedBy: string;
    approvedAt: string;
    eventId?: string;
  }[];
  appliedIntentIds: string[];
  unresolved: { intentId: string; reason: string }[];
}

type Phase = "idle" | "proposing" | "proposed" | "approving" | "done" | "unknown";

const card = {
  background: "#221b0e",
  border: "1px solid #6b5518",
  borderRadius: 8,
  padding: "12px 16px",
};

const label = {
  color: "#9c8a4d",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
};

const body = { color: "#c9b98a", fontSize: 13, marginTop: 6 };

/** Plain-words inverse command for one-click undo. Null when not undoable. */
function inverseCommandText(intent: { kind: string; target: string }): string | null {
  const t = intent.target || "this";
  switch (intent.kind) {
    case "hide_section":
      return `show the ${t} section`;
    case "show_section":
      return `hide the ${t} section`;
    case "hide_fact":
      return `show ${t}`;
    case "show_fact":
      return `hide ${t}`;
    default:
      return null;
  }
}

/** Human summary of a journaled directive for the visible history. Never JSON. */
function describeDirective(siteIntent: unknown): string {
  if (!siteIntent || typeof siteIntent !== "object") return "Presentation change";
  const si = siteIntent as { kind?: string; sectionId?: string; hidden?: boolean; objectId?: string };
  switch (si.kind) {
    case "toggle_section":
      return `${si.hidden ? "Hid" : "Showed"} section ${si.sectionId ?? ""}`.trim();
    case "reorder_section":
      return `Reordered sections on ${si.sectionId ?? "the page"}`;
    case "reorder_object":
      return `Reordered items in ${si.sectionId ?? "a section"}`;
    case "set_featured":
      return `Changed featured items in ${si.sectionId ?? "a section"}`;
    case "deactivate_object":
      return `Removed an item from public view in ${si.sectionId ?? "a section"}`;
    case "edit_copy":
      return `Edited text in ${si.sectionId ?? "a section"}`;
    case "set_theme_token":
      return "Changed a design token";
    case "promote_action":
      return "Promoted an action";
    default:
      return "Presentation change";
  }
}

export function CustomizePanel({ siteId }: { siteId: string }) {
  const [text, setText] = useState("Make emergency service the first thing people see");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const [proposal, setProposal] = useState<ParsedProposal | null>(null);
  const [approval, setApproval] = useState<ApprovalDone | null>(null);
  const [inspect, setInspect] = useState<InspectData | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);
  // F-1: one request_id per owner action, retained across the catch/retry path.
  const [approveRequestId, setApproveRequestId] = useState<string | null>(null);
  const [unknownRequestId, setUnknownRequestId] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  // Consequence-scaled confirmation state.
  const [highConfirmed, setHighConfirmed] = useState(false);
  const [criticalConfirmed, setCriticalConfirmed] = useState(false);

  const refreshInspect = useCallback(async () => {
    try {
      const res = await fetch("/api/fyd/customize?siteId=" + encodeURIComponent(siteId) + "&view=inspect");
      const doc = (await res.json()) as (InspectData & { ok: boolean }) | ApiError;
      if ("ok" in doc && doc.ok) {
        setInspect(doc as InspectData);
        setInspectError(null);
      } else {
        setInspectError((doc as ApiError).error ?? "inspect failed");
      }
    } catch (e) {
      setInspectError(e instanceof Error ? e.message : String(e));
    }
  }, [siteId]);

  useEffect(() => {
    void refreshInspect();
  }, [refreshInspect]);

  const runParse = async (parseText?: string) => {
    const t = (parseText ?? text).trim();
    if (!t) return null;
    setPhase("proposing");
    setError(null);
    setProposal(null);
    setApproval(null);
    setApproveRequestId(null);
    setUnknownRequestId(null);
    setRetryable(false);
    setHighConfirmed(false);
    setCriticalConfirmed(false);
    try {
      const res = await fetch("/api/fyd/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", siteId, text: t }),
      });
      const doc = (await res.json()) as (ParsedProposal & { ok: boolean }) | ApiError;
      if ("ok" in doc && doc.ok) {
        const p = doc as ParsedProposal;
        setProposal(p);
        setPhase("proposed");
        return p;
      }
      setError(doc as ApiError);
      setPhase("idle");
      return null;
    } catch (e) {
      setError({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setPhase("idle");
      return null;
    }
  };

  const doApprove = async (requestId: string, proposalBody: Record<string, unknown>, proposalText: string) => {
    const res = await fetch("/api/fyd/customize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", siteId, text: proposalText, proposal: proposalBody, request_id: requestId }),
    });
    return (await res.json()) as
      | { ok: true; intentId?: string; eventId: string; note: string; requestId: string }
      | ApiError;
  };

  const runApprove = async () => {
    if (!proposal) return;
    // F-1: mint one request_id when the owner clicks Approve.
    const rid = crypto.randomUUID();
    setApproveRequestId(rid);
    setPhase("approving");
    setError(null);
    setRetryable(false);
    try {
      const doc = await doApprove(rid, proposal.proposal, text);
      if ("ok" in doc && doc.ok) {
        setApproval({
          summaryTitle: proposal.reviewCard.title,
          afterLines: proposal.reviewCard.after,
          undoHint: proposal.undoHint,
          undoText: inverseCommandText(proposal.intent),
        });
        setPhase("done");
        void refreshInspect();
      } else if (doc.code === "unknown_outcome") {
        // 504 UNKNOWN: the journal may have recorded it. Retain the
        // server's requestId (or ours) and offer safe retry with the same ID.
        setUnknownRequestId(doc.requestId ?? rid);
        setRetryable(true);
        setPhase("unknown");
      } else {
        setError(doc);
        setRetryable(false);
        setPhase("proposed");
      }
    } catch (e) {
      // Network failure: the request may or may not have been journaled.
      // Retain the request_id and expose Retry with the same ID.
      setError({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setRetryable(true);
      setPhase("proposed");
    }
  };

  const runRetry = async () => {
    if (!proposal) return;
    const rid = unknownRequestId ?? approveRequestId;
    if (!rid) return;
    setPhase("approving");
    setError(null);
    try {
      const doc = await doApprove(rid, proposal.proposal, text);
      if ("ok" in doc && doc.ok) {
        setApproval({
          summaryTitle: proposal.reviewCard.title,
          afterLines: proposal.reviewCard.after,
          undoHint: proposal.undoHint,
          undoText: inverseCommandText(proposal.intent),
        });
        setUnknownRequestId(null);
        setRetryable(false);
        setPhase("done");
        void refreshInspect();
      } else if (doc.code === "unknown_outcome") {
        setUnknownRequestId(doc.requestId ?? rid);
        setRetryable(true);
        setPhase("unknown");
      } else {
        setError(doc);
        setPhase("proposed");
      }
    } catch (e) {
      setError({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setRetryable(true);
      setPhase("proposed");
    }
  };

  const runUndo = async () => {
    if (!proposal || !approval?.undoText) return;
    setPhase("proposing");
    setError(null);
    try {
      // Undo is a new owner action: parse the inverse, then approve it with
      // a FRESH request_id. Every step is journaled and previewable.
      const undone = await runParse(approval.undoText);
      if (!undone) return;
      const rid = crypto.randomUUID();
      setApproveRequestId(rid);
      setPhase("approving");
      const doc = await doApprove(rid, undone.proposal as Record<string, unknown>, approval.undoText);
      if ("ok" in doc && doc.ok) {
        setProposal(null);
        setApproval(null);
        setPhase("idle");
        setText("Make emergency service the first thing people see");
        void refreshInspect();
      } else if (doc.code === "unknown_outcome") {
        setUnknownRequestId(doc.requestId ?? rid);
        setRetryable(true);
        setPhase("unknown");
      } else {
        setError(doc);
        setPhase("idle");
      }
    } catch (e) {
      setError({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setRetryable(true);
      setPhase("proposed");
    }
  };

  const runClear = async (intentId: string) => {
    setError(null);
    // Clear is a mutating action: it carries its own client-generated ID.
    const rid = crypto.randomUUID();
    try {
      const res = await fetch("/api/fyd/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear", siteId, intentId, request_id: rid }),
      });
      const doc = (await res.json()) as { ok: boolean; error?: string };
      if (!doc.ok) {
        setError({ ok: false, error: doc.error ?? "clear failed" });
      }
      void refreshInspect();
    } catch (e) {
      setError({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  const tier = proposal?.consequenceTier ?? "low";
  const needsHighConfirm = tier === "high" && !highConfirmed;
  const needsCriticalConfirm = tier === "critical" && !criticalConfirmed;
  const approveBlocked = phase !== "proposed" || needsHighConfirm || needsCriticalConfirm;

  return (
    <div style={{ ...card, marginTop: 16 }}>
      <div style={label}>Owner action: customize with FYD (demo)</div>
      <div style={body}>
        Describe a presentation change in plain English. FYD parses it into a
        typed intent, shows you exactly what will change, and only applies it
        after you approve. Facts are never changed; the design system is not
        customizable here; unsupported requests are refused, not guessed at.
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Make the services section the first thing people see"
          aria-label="Customization request"
          style={{
            flex: 1,
            minWidth: 240,
            background: "#100c06",
            color: "#f5eeda",
            border: "1px solid #6b5518",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 14,
          }}
        />
        <button
          type="button"
          onClick={() => void runParse()}
          disabled={phase === "proposing" || phase === "approving"}
          style={{
            background: "#f5c518",
            color: "#171208",
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          {phase === "proposing" ? "Parsing..." : "Review proposal"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 12,
            background: "#2a1210",
            border: "1px solid #7a2e22",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#f0a9a0",
            fontSize: 13,
          }}
          role="alert"
        >
          <strong>Not applied:</strong> {error.error}
          {retryable ? (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={runRetry}
                style={{
                  background: "#f5c518",
                  color: "#171208",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                Retry safely (same request)
              </button>
              <div style={{ fontSize: 12, marginTop: 4, color: "#c98a80" }}>
                The retry reuses your original request, so it cannot apply twice.
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "unknown" ? (
        <div
          style={{
            marginTop: 12,
            background: "#2a2110",
            border: "1px solid #7a6222",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#f0d9a0",
            fontSize: 13,
          }}
          role="alert"
        >
          <strong>Outcome unknown.</strong> Your change may have been applied;
          it was not confirmed. Do not treat this as failed.
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={runRetry}
              style={{
                background: "#f5c518",
                color: "#171208",
                fontWeight: 700,
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Check and retry safely
            </button>
          </div>
        </div>
      ) : null}

      {proposal ? (
        <div
          style={{
            marginTop: 12,
            background: "#100c06",
            border: "1px solid #6b5518",
            borderRadius: 8,
            padding: "12px 14px",
          }}
        >
          <div style={{ color: "#f5eeda", fontWeight: 700, fontSize: 14 }}>
            {proposal.reviewCard.title}
          </div>
          <div style={{ color: "#c9b98a", fontSize: 13, marginTop: 6 }}>
            {proposal.tierLabel}
          </div>
          <div style={{ color: "#c9b98a", fontSize: 13, marginTop: 4 }}>
            {proposal.resolutionNote}
          </div>
          {tier === "low" ? (
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={label}>Change</div>
                {proposal.reviewCard.after.map((line, i) => (
                  <div key={i} style={{ color: "#7fd08a", fontSize: 13, marginTop: 4 }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={label}>Before</div>
                {proposal.reviewCard.before.map((line, i) => (
                  <div key={i} style={{ color: "#9c8a4d", fontSize: 13, marginTop: 4 }}>
                    {line}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={label}>After</div>
                {proposal.reviewCard.after.map((line, i) => (
                  <div key={i} style={{ color: "#7fd08a", fontSize: 13, marginTop: 4 }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
          {tier === "high" ? (
            <label style={{ display: "flex", gap: 8, marginTop: 12, color: "#f0d9a0", fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={highConfirmed}
                onChange={(e) => setHighConfirmed(e.target.checked)}
              />
              I understand this removes content from public view. Apply it.
            </label>
          ) : null}
          {tier === "critical" ? (
            <label style={{ display: "flex", gap: 8, marginTop: 12, color: "#f0a9a0", fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={criticalConfirmed}
                onChange={(e) => setCriticalConfirmed(e.target.checked)}
              />
              This change needs extra confirmation. I have reviewed it and want it applied.
            </label>
          ) : null}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={runApprove}
              disabled={approveBlocked}
              style={{
                background: approveBlocked ? "#6b5518" : "#f5c518",
                color: "#171208",
                fontWeight: 700,
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                cursor: approveBlocked ? "not-allowed" : "pointer",
              }}
            >
              {phase === "approving" ? "Recording approval..." : tier === "low" ? "Apply" : "Approve and apply (demo)"}
            </button>
            <button
              type="button"
              onClick={() => {
                setProposal(null);
                setPhase("idle");
              }}
              disabled={phase !== "proposed"}
              style={{
                background: "transparent",
                color: "#f5c518",
                border: "1px solid #f5c518",
                borderRadius: 8,
                padding: "10px 16px",
                cursor: phase === "proposed" ? "pointer" : "not-allowed",
              }}
            >
              Cancel
            </button>
          </div>
          <div style={{ color: "#9c8a4d", fontSize: 12, marginTop: 8 }}>
            Approval journals your change. DEMO OWNER MODE - not real authentication.
          </div>
        </div>
      ) : null}

      {approval ? (
        <div
          style={{
            marginTop: 12,
            background: "#122a18",
            border: "1px solid #2e7a44",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#a9f0bd",
            fontSize: 13,
          }}
          role="status"
        >
          <strong>Applied:</strong> {approval.summaryTitle}
          {approval.afterLines.map((line, i) => (
            <div key={i} style={{ marginTop: 4, color: "#7fd08a" }}>{line}</div>
          ))}
          {approval.undoText ? (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={runUndo}
                disabled={phase === "proposing" || phase === "approving"}
                style={{
                  background: "transparent",
                  color: "#a9f0bd",
                  border: "1px solid #2e7a44",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                Undo this change
              </button>
              {approval.undoHint ? (
                <div style={{ fontSize: 12, marginTop: 4, color: "#7fd08a" }}>{approval.undoHint}</div>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: 12, marginTop: 4, color: "#7fd08a" }}>
              See the change history below.
            </div>
          )}
        </div>
      ) : null}

      <div style={{ ...label, marginTop: 16 }}>Change history</div>
      {inspectError ? (
        <div style={{ ...body, color: "#f0a9a0" }}>history unavailable: {inspectError}</div>
      ) : inspect ? (
        <div style={{ marginTop: 8 }}>
          {inspect.unresolved.map((u) => (
            <div key={u.intentId} style={{ ...body, color: "#f0a9a0" }}>
              A change could not be applied: {u.reason}
            </div>
          ))}
          {inspect.directives.length === 0 ? (
            <div style={body}>No changes yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
              {inspect.directives.map((d, i) => (
                <li key={i} style={{ marginTop: 8, fontSize: 13, color: "#c9b98a" }}>
                  <span style={{ color: "#f5eeda" }}>{describeDirective(d.siteIntent)}</span>
                  {" · "}approved {d.approvedAt} by {d.approvedBy}{" "}
                  <button
                    type="button"
                    onClick={() => runClear(d.intentId)}
                    style={{
                      background: "transparent",
                      color: "#f5c518",
                      border: "1px solid #f5c518",
                      borderRadius: 6,
                      padding: "2px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                      marginLeft: 8,
                    }}
                  >
                    Undo
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div style={body}>Loading history...</div>
      )}
    </div>
  );
}
