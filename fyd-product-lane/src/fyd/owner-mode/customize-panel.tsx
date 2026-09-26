/**
 * Lane D: the customize-with-FYD owner panel (DEMO ONLY).
 *
 * Renders inside DemoOwnerMode, which only mounts when
 * NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 (localhost/private). The generic loop:
 *   UNDERSTAND -> PROPOSE -> PREVIEW -> APPROVE -> APPLY -> PERSIST
 * Plain English (possibly compound: "A and B") -> typed intents ->
 * digest-bound proposal bundle -> preview -> one explicit demo-owner
 * approval -> every op journaled in a single overlay event -> the
 * rendered page picks it up on the next projection dump.
 *
 * Parse and approve both go through /api/fyd/customize. The client never
 * applies anything. Visibility quick-controls below issue the same
 * canonical phrases through the same pipeline: no privileged path.
 *
 * Auth honesty: this panel is labeled NOT PRODUCTION AUTH. The demo
 * toggle is a label, never ownership proof; consequential external
 * capabilities stay disabled.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

interface ReviewCard {
  title: string;
  before: string[];
  after: string[];
  operationCount: number;
}

interface BundleItem {
  intent: { kind: string; target?: string };
  intentDigest: string;
  resolutionNote: string;
  layer: "presentation" | "visibility";
  reviewCard: ReviewCard;
  siteIntent?: unknown;
  proposal?: Record<string, unknown>;
  visibility?: { objectId: string; field: string; policy: string; objectTitle: string };
  visibilityProposal?: Record<string, unknown>;
}

interface ProposalBundle {
  siteId: string;
  items: BundleItem[];
  bundleDigest: string;
  specDigest: string;
  preview: {
    pageOrder: { before: string[]; after: string[] };
    visibilityFields: { field: string; before: string; after: string }[];
  };
}

interface ApiError {
  ok: false;
  code?: string;
  error: string;
}

interface VisibilityState {
  objectId: string;
  objectTitle: string;
  field: string;
  policy: string;
  source: "owner_override" | "conservative_default";
  approvedAt?: string;
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
  visibility: VisibilityState[];
  appliedIntentIds: string[];
  unresolved: { intentId: string; reason: string }[];
}

type Phase = "idle" | "proposing" | "proposed" | "approving" | "done";

const STAGES = ["UNDERSTAND", "PROPOSE", "PREVIEW", "APPROVE", "APPLY", "PERSIST"] as const;

function stageIndex(phase: Phase): number {
  switch (phase) {
    case "proposing":
      return 0;
    case "proposed":
      return 2;
    case "approving":
      return 3;
    case "done":
      return 5;
    default:
      return -1;
  }
}

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

const FIELD_CONTROLS: { field: string; phrases: { label: string; text: string }[] }[] = [
  {
    field: "address",
    phrases: [
      { label: "Show", text: "Show my street address" },
      { label: "Hide", text: "Hide my street address" },
    ],
  },
  {
    field: "phone",
    phrases: [
      { label: "Show", text: "Show my phone number" },
      { label: "Hide", text: "Hide my phone number" },
    ],
  },
  {
    field: "email",
    phrases: [
      { label: "Show", text: "Show my email address" },
      { label: "Hide", text: "Hide my email address" },
      { label: "Members only", text: "Show my email address only to FYD members" },
    ],
  },
];

export function CustomizePanel({ siteId }: { siteId: string }) {
  const [text, setText] = useState("Make emergency service the first thing people see");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const [bundle, setBundle] = useState<ProposalBundle | null>(null);
  const [approval, setApproval] = useState<{ eventId: string; opCount: number; note: string } | null>(null);
  const [inspect, setInspect] = useState<InspectData | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

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

  const runParse = useCallback(
    async (overrideText?: string) => {
      const requestText = (overrideText ?? text).trim();
      if (!requestText) return;
      setPhase("proposing");
      setError(null);
      setBundle(null);
      setApproval(null);
      try {
        const res = await fetch("/api/fyd/customize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "parse", siteId, text: requestText }),
        });
        const doc = (await res.json()) as (ProposalBundle & { ok: boolean }) | ApiError;
        if ("ok" in doc && doc.ok) {
          setBundle(doc as ProposalBundle);
          setPhase("proposed");
        } else {
          setError(doc as ApiError);
          setPhase("idle");
        }
      } catch (e) {
        setError({ ok: false, error: e instanceof Error ? e.message : String(e) });
        setPhase("idle");
      }
    },
    [siteId, text],
  );

  const runApprove = async () => {
    if (!bundle) return;
    setPhase("approving");
    setError(null);
    try {
      const res = await fetch("/api/fyd/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", siteId, text, bundle }),
      });
      const doc = (await res.json()) as
        | { ok: true; eventId: string; opCount: number; note: string }
        | ApiError;
      if ("ok" in doc && doc.ok) {
        setApproval({ eventId: doc.eventId, opCount: doc.opCount, note: doc.note });
        setPhase("done");
        void refreshInspect();
      } else {
        setError(doc as ApiError);
        setPhase("proposed");
      }
    } catch (e) {
      setError({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setPhase("proposed");
    }
  };

  const runClear = async (intentId: string, layer: "presentation" | "visibility") => {
    setError(null);
    try {
      const res = await fetch("/api/fyd/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear", siteId, intentId, layer }),
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

  const active = stageIndex(phase);

  return (
    <div style={{ ...card, marginTop: 16 }}>
      <div style={label}>Owner action: customize with FYD (demo)</div>
      <div
        style={{
          display: "inline-block",
          marginTop: 8,
          background: "#3a2c10",
          color: "#f5c518",
          border: "1px solid #f5c518",
          fontWeight: 800,
          letterSpacing: 1,
          padding: "4px 12px",
          fontSize: 12,
        }}
      >
        NOT PRODUCTION AUTH
      </div>
      <div style={body}>
        Describe a presentation change in plain English. FYD parses it into
        typed intents, proposes a digest-bound bundle, previews the combined
        effect, and only applies it after you approve. Facts are never
        changed; the design system is not customizable here; unsupported
        requests are refused, not guessed at. One approval covers the whole
        bundle, never a partial application.
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {STAGES.map((s, i) => (
          <span
            key={s}
            style={{
              fontSize: 11,
              letterSpacing: 1,
              padding: "4px 10px",
              borderRadius: 9999,
              border: "1px solid " + (i <= active ? "#f5c518" : "#6b5518"),
              color: i <= active ? "#f5eeda" : "#9c8a4d",
              background: i === active ? "#3a2c10" : "transparent",
              fontWeight: i === active ? 800 : 400,
            }}
          >
            {s}
          </span>
        ))}
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

      <div style={{ ...label, marginTop: 14 }}>Visibility policy (owner decides)</div>
      <div style={{ ...body, marginTop: 4 }}>
        Source discovery may classify a field conservatively, but it never
        permanently decides what is private. The owner policy below wins;
        the source fact stays intact either way.
      </div>
      {FIELD_CONTROLS.map((fc) => {
        const state = inspect?.visibility.find((v) => v.field === fc.field || (fc.field === "address" && v.field === "street_address"));
        return (
          <div key={fc.field} style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "#f5eeda", fontSize: 13, minWidth: 70, textTransform: "capitalize" }}>
              {fc.field}
            </span>
            <span style={{ color: "#9c8a4d", fontSize: 12 }}>
              {state ? `policy: ${state.policy} (${state.source === "owner_override" ? "owner decision" : "conservative default"})` : "not in evidence"}
            </span>
            {fc.phrases.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setText(p.text);
                  void runParse(p.text);
                }}
                disabled={phase === "proposing" || phase === "approving"}
                style={{
                  background: "transparent",
                  color: "#f5c518",
                  border: "1px solid #6b5518",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        );
      })}

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
          {error.code ? (
            <div style={{ fontSize: 12, marginTop: 4, color: "#c98a80" }}>
              code: {error.code}
            </div>
          ) : null}
        </div>
      ) : null}

      {bundle ? (
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
            Proposal bundle: {bundle.items.length} operation{bundle.items.length === 1 ? "" : "s"}
          </div>
          {bundle.items.map((item, i) => (
            <div key={i} style={{ marginTop: 10, borderTop: "1px solid #3a2c10", paddingTop: 10 }}>
              <div style={{ color: "#c9b98a", fontSize: 12 }}>
                <span
                  style={{
                    display: "inline-block",
                    border: "1px solid #6b5518",
                    borderRadius: 4,
                    padding: "1px 8px",
                    marginRight: 8,
                    color: "#f5eeda",
                  }}
                >
                  {item.layer === "visibility" ? "VISIBILITY" : "PRESENTATION"}
                </span>
                <code>{item.intent.kind}</code>
                {item.intent.target ? (
                  <span> on <code>{item.intent.target}</code></span>
                ) : null}
              </div>
              <div style={{ color: "#f5eeda", fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                {item.reviewCard.title}
              </div>
              <div style={{ color: "#c9b98a", fontSize: 13, marginTop: 4 }}>
                {item.resolutionNote}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={label}>Before</div>
                  {item.reviewCard.before.map((line, j) => (
                    <div key={j} style={{ color: "#9c8a4d", fontSize: 13, marginTop: 4 }}>
                      {line}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={label}>After</div>
                  {item.reviewCard.after.map((line, j) => (
                    <div key={j} style={{ color: "#7fd08a", fontSize: 13, marginTop: 4 }}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {bundle.preview.visibilityFields.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div style={label}>Preview: public projection</div>
              {bundle.preview.visibilityFields.map((f, i) => (
                <div key={i} style={{ color: "#c9b98a", fontSize: 13, marginTop: 4 }}>
                  {f.field}: <span style={{ color: "#9c8a4d" }}>{f.before || "(hidden)"}</span>
                  {" -> "}
                  <span style={{ color: "#7fd08a" }}>{f.after || "(hidden)"}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ color: "#9c8a4d", fontSize: 12, marginTop: 10 }}>
            bundle digest: <code>{bundle.bundleDigest.slice(0, 20)}...</code>
            {" "}· spec digest: <code>{bundle.specDigest.slice(0, 20)}...</code>
          </div>
          <button
            type="button"
            onClick={runApprove}
            disabled={phase !== "proposed"}
            style={{
              marginTop: 12,
              background: phase === "proposed" ? "#f5c518" : "#6b5518",
              color: "#171208",
              fontWeight: 700,
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: phase === "proposed" ? "pointer" : "not-allowed",
            }}
          >
            {phase === "approving" ? "Recording approval..." : "Approve bundle (demo)"}
          </button>
          <div style={{ color: "#9c8a4d", fontSize: 12, marginTop: 8 }}>
            One approval journals the whole bundle as a single overlay event.
            DEMO OWNER MODE - not real authentication. NOT PRODUCTION AUTH.
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
          <strong>Approved and journaled.</strong>
          <div style={{ marginTop: 4 }}>
            {approval.opCount} operation{approval.opCount === 1 ? "" : "s"} · event:{" "}
            <code>{approval.eventId}</code>
          </div>
          <div style={{ marginTop: 4, color: "#7fd08a" }}>{approval.note}</div>
        </div>
      ) : null}

      <div style={{ ...label, marginTop: 16 }}>Current owner state (live)</div>
      {inspectError ? (
        <div style={{ ...body, color: "#f0a9a0" }}>inspect unavailable: {inspectError}</div>
      ) : inspect ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: "#c9b98a", fontSize: 13 }}>
            Section order (home):{" "}
            {(inspect.pageOrder.find((p) => p.pageSlug === "home")?.sections ?? [])
              .map((s) => s.component + (s.hidden ? " (hidden)" : ""))
              .join(" -> ") || "(no home page)"}
          </div>
          <div style={{ color: "#9c8a4d", fontSize: 12, marginTop: 4 }}>
            spec digest: <code>{inspect.specDigest.slice(0, 20)}...</code> · base:{" "}
            <code>{inspect.baseSpecDigest.slice(0, 20)}...</code>
          </div>
          {inspect.visibility.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              <div style={label}>Visibility policy</div>
              {inspect.visibility.map((v, i) => (
                <div key={i} style={{ color: "#c9b98a", fontSize: 13, marginTop: 4 }}>
                  {v.field}: <strong style={{ color: "#f5eeda" }}>{v.policy}</strong>
                  <span style={{ color: "#9c8a4d" }}>
                    {" "}({v.source === "owner_override" ? "owner decision" : "conservative default"})
                  </span>{" "}
                  <button
                    type="button"
                    onClick={() => void runClear(v.objectId + "|" + v.field, "visibility")}
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
                    Clear
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {inspect.unresolved.map((u) => (
            <div key={u.intentId} style={{ ...body, color: "#f0a9a0" }}>
              Unresolved directive <code>{u.intentId}</code>: {u.reason}
            </div>
          ))}
          {inspect.directives.length === 0 ? (
            <div style={body}>No approved presentation directives yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
              {inspect.directives.map((d) => (
                <li key={d.intentId} style={{ marginTop: 8, fontSize: 13, color: "#c9b98a" }}>
                  <code style={{ color: "#f5eeda" }}>{d.intentId}</code> ·{" "}
                  {String(JSON.stringify(d.siteIntent))} ·
                  approved {d.approvedAt} by {d.approvedBy}
                  {d.eventId ? (
                    <span> · event <code>{d.eventId}</code></span>
                  ) : null}{" "}
                  <button
                    type="button"
                    onClick={() => void runClear(d.intentId, "presentation")}
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
                    Clear
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div style={body}>Loading current state...</div>
      )}
    </div>
  );
}
