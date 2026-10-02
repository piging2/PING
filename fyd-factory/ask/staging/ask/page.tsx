/**
 * FYD preview: Ask FYD concierge (LANE-ASK).
 *
 * Preview scope only. This page is NOT wired into the repo; it lives in the
 * preview staging directory and runs the concierge server-side against the
 * site's PUBLIC object graph (happy-place default, ?site=coppersmith-plumbing
 * supported). It reuses the concierge and its types; it introduces no new
 * authority and no new data access.
 *
 * The seven canonical concierge questions are offered as buttons; any other
 * question gets an honest "not answered by this preview" note instead of an
 * invented answer (matchConciergeQuestion returns null -> no answer).
 */

import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import {
  CONCIERGE_QUESTIONS,
  answerConciergeQuestion,
  conciergeInputFor,
  matchConciergeQuestion,
  toAskFydAnswer,
  type ConciergeGrade,
} from "@/fyd/ask/concierge";
import type { ObjectGraph } from "@/fyd/sitespec/types";

const SITE_IDS = ["happy-place", "coppersmith-plumbing"] as const;
const DEFAULT_SITE: (typeof SITE_IDS)[number] = "happy-place";

/** Privacy boundary: the concierge only ever sees public objects. */
function publicGraph(graph: ObjectGraph): ObjectGraph {
  const ids = new Set(
    graph.objects.filter((o) => o.visibility === "public").map((o) => o.id),
  );
  return {
    ...graph,
    objects: graph.objects.filter((o) => ids.has(o.id)),
    relationships: graph.relationships.filter(
      (r) => ids.has(r.subject) && ids.has(r.object),
    ),
  };
}

const GRADE_CHIP: Record<ConciergeGrade, { label: string; bg: string }> = {
  SUPPORTED: { label: "direct", bg: "#1d4d2b" },
  DERIVED: { label: "derived", bg: "#4d3f1d" },
  INFERRED: { label: "inferred", bg: "#4d1d3a" },
  UNKNOWN: { label: "unknown", bg: "#3a3a3a" },
};

type SearchParams = { site?: string; q?: string } | Promise<{ site?: string; q?: string }>;

export default async function AskPreviewPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = (await searchParams) ?? {};
  const site = SITE_IDS.includes(params.site as (typeof SITE_IDS)[number])
    ? (params.site as (typeof SITE_IDS)[number])
    : DEFAULT_SITE;
  const question = (params.q ?? "").trim();

  const { graph } = await getPingObjectGraph(site);
  const pub = publicGraph(graph);
  const target = pub.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );

  const questionId = question.length > 0 ? matchConciergeQuestion(question) : null;
  const answer =
    questionId && target
      ? answerConciergeQuestion(
          conciergeInputFor(site, target, pub.objects, pub.relationships, question),
        )
      : null;
  const view = answer ? toAskFydAnswer(answer) : null;

  const base = `/preview/ask`;

  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "32px 20px",
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
        background: "#111",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Ask FYD (preview)</h1>
      <p style={{ color: "#aaa", marginTop: 0 }}>
        Answers come only from the public site graph, with per-claim grades and
        evidence citations. Anything without evidence is said to be unknown.
      </p>

      <nav style={{ marginBottom: 20 }}>
        {SITE_IDS.map((s) => (
          <a
            key={s}
            href={`${base}?site=${s}`}
            style={{
              marginRight: 12,
              color: s === site ? "#fff" : "#7aa2ff",
              fontWeight: s === site ? 700 : 400,
              textDecoration: "underline",
            }}
          >
            {s}
          </a>
        ))}
      </nav>

      <form method="get" action={base} style={{ marginBottom: 8 }}>
        <input type="hidden" name="site" value={site} />
        <input
          type="text"
          name="q"
          defaultValue={question}
          placeholder="Ask a question..."
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #444",
            background: "#1a1a1a",
            color: "#eee",
          }}
        />
      </form>
      <div style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CONCIERGE_QUESTIONS.map((cq) => (
          <a
            key={cq.id}
            href={`${base}?site=${site}&q=${encodeURIComponent(cq.question)}`}
            style={{
              padding: "6px 12px",
              borderRadius: 16,
              border: "1px solid #555",
              color: "#cfe0ff",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            {cq.question}
          </a>
        ))}
      </div>

      {question.length > 0 && (
        <section>
          <h2 style={{ fontSize: 20 }}>Question</h2>
          <p style={{ fontStyle: "italic" }}>{question}</p>

          {!target && (
            <p style={{ color: "#ff9" }}>
              No public business record found for this site; no answer is possible.
            </p>
          )}

          {target && questionId === null && (
            <p style={{ color: "#fc6" }}>
              This preview only answers the seven canonical questions above. It
              will not guess at anything else.
            </p>
          )}

          {target && answer && view && (
            <div>
              {answer.refused && (
                <p style={{ color: "#fc6" }}>
                  This question could not be answered from the site data at all.
                </p>
              )}

              <h3 style={{ fontSize: 18 }}>Claims</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {answer.claims.map((c, i) => {
                  const chip = GRADE_CHIP[c.grade];
                  const classification = view.claimClassifications.find(
                    (cc) => cc.claim === c.text,
                  )?.classification;
                  const markers = c.evidence
                    .map((e) => answer.evidence.indexOf(e) + 1)
                    .filter((n) => n > 0);
                  return (
                    <li
                      key={i}
                      style={{
                        marginBottom: 12,
                        padding: "10px 14px",
                        border: "1px solid #333",
                        borderRadius: 8,
                        background: "#181818",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          background: chip.bg,
                          color: "#fff",
                          fontSize: 12,
                          marginRight: 8,
                        }}
                      >
                        {chip.label}
                      </span>
                      {classification && (
                        <span style={{ fontSize: 12, color: "#888", marginRight: 8 }}>
                          {classification}
                        </span>
                      )}
                      <span>
                        {c.grade === "UNKNOWN" ? `[UNKNOWN] ${c.text}` : c.text}
                      </span>
                      {markers.length > 0 && (
                        <span style={{ color: "#7aa2ff", marginLeft: 6 }}>
                          [{markers.join("][")}]
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {answer.conflicts.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 18 }}>Conflicts in the evidence</h3>
                  {answer.conflicts.map((cf, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: 12,
                        padding: "10px 14px",
                        border: "1px solid #7a4",
                        borderRadius: 8,
                        background: "#1c1a10",
                      }}
                    >
                      <strong>{cf.fact}</strong>
                      <ul>
                        {cf.values.map((v, j) => (
                          <li key={j}>
                            {v.value}{" "}
                            <span style={{ color: "#888", fontSize: 13 }}>
                              ({v.evidence.source})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {answer.evidence.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 18 }}>Evidence</h3>
                  <ol style={{ fontSize: 14, color: "#ccc" }}>
                    {answer.evidence.map((e, i) => (
                      <li key={i} style={{ marginBottom: 8 }}>
                        <strong>[{i + 1}] {e.label}.</strong> Source: {e.source}.{" "}
                        Basis: {e.basis}.
                        {e.lastChecked && ` Last checked: ${e.lastChecked}.`}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
