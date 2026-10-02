// ASK FYD EVAL-V2 runner. Run on the Pig with:
//   npx tsx /home/nolan/fyd-preview-staging/eval-v2/run-eval.mts
// Read-only wrt the repo. Emits results.jsonl + summary.json next to this file.
//
// Hierarchy implemented:
//   1. DETERMINISTIC INVARIANT checks (D1-D6, including double-run byte equality)
//   2. SCHEMA VALIDATION of the AnswerWithEvidence view (S1-S4)
//   3. PROGRAMMATIC COMPARISON (citation<->ref match, grade-accuracy flags)
//   4. GOLDEN HUMAN-ADJUDICATED: top-10 uncertain answers flagged for review
//      (this runner never adjudicates)
//   5. MODEL JUDGE: reserved for answer clarity only (scored post-hoc on the
//      flagged 10, never for factuality)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  answerConciergeQuestion,
  matchConciergeQuestion,
  toAskFydAnswer,
  type ConciergeAnswer,
  type ConciergeGrade,
} from "/home/nolan/projects/ping/src/fyd/ask/concierge.ts";
import { applyFieldVisibility } from "/home/nolan/projects/ping/src/fyd/sitespec/field-visibility.ts";
import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts";
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts";
import {
  HOSTILE_A,
  HOSTILE_B,
  HOSTILE_B_HIDE_PHONE,
  HOSTILE_C,
  type HGraph,
} from "./hostile-fixtures.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

interface Obj {
  id: string;
  schema: string;
  visibility: string;
  title: string;
  fields: Record<string, unknown>;
  provenance?: { kind?: string; ref?: string };
  description?: string;
  updatedAt?: string;
}
interface Graph {
  objects: Obj[];
  relationships: { id: string; subject: string; object: string; predicate: string; status?: string; createdAt?: string }[];
}

const GRADES: ConciergeGrade[] = ["SUPPORTED", "DERIVED", "INFERRED", "UNKNOWN"];
const VIEW_CLASSES = new Set(["DIRECT_FACT", "DERIVED_FACT", "INFERENCE", "unknown"]);

function publicOnly(g: Graph): Graph {
  const ids = new Set(g.objects.filter((o) => o.visibility === "public").map((o) => o.id));
  return {
    objects: g.objects.filter((o) => ids.has(o.id)),
    relationships: g.relationships.filter((r) => ids.has(r.subject) && ids.has(r.object)),
  };
}

function findBusinessTarget(objects: Obj[]): Obj | null {
  return (
    objects.find((o) => o.schema === "ping.social.business@1" && o.visibility === "public") ??
    objects.find((o) => o.schema.toLowerCase().includes("business")) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------

interface Site {
  siteId: string;
  graph: Graph;
  projected: boolean; // true = caller passed a public-projected graph (honest path)
}

const clearwaterJson = JSON.parse(
  readFileSync("/home/nolan/projects/ping/src/fyd/owner-mode/__tests__/clearwater-plumbing-demo.json", "utf8"),
);

const COHORT_IDS = [
  "hand-law",
  "claire-codling",
  "dalby-cpa",
  "bemis-electric",
  "suehiro",
  "gear-junction",
  "white-star",
];

const NEUTRAL_SITES: Site[] = [
  { siteId: "happy-place", graph: HAPPY_PLACE_GRAPH as unknown as Graph, projected: true },
  { siteId: "coppersmith-plumbing", graph: COPPERSMITH_GRAPH as unknown as Graph, projected: true },
  { siteId: "clearwater-plumbing-demo", graph: clearwaterJson.graph as Graph, projected: true },
  ...COHORT_IDS.map((id): Site => {
    const j = JSON.parse(readFileSync(join(HERE, "acquisitions", `${id}.json`), "utf8"));
    return { siteId: id, graph: j.graph as Graph, projected: true };
  }),
];

// ---------------------------------------------------------------------------
// Question battery
// ---------------------------------------------------------------------------

const CANONICAL = [
  "What does this business do?",
  "What services do they offer?",
  "Where do they operate?",
  "Who works here?",
  "How do you know?",
  "What information conflicts?",
  "What don't you know?",
];
const HARD = [
  "What services does this business offer, and how do you know?",
  "Which location offers this service?",
  "What source supports that claim?",
  "What conflicts exist in the evidence?",
  "What don't you know?", // duplicate of canonical #7; deduped below
  "What should the owner fix?",
];

const NEUTRAL_QUESTIONS: string[] = [];
for (const q of [...CANONICAL, ...HARD]) {
  if (!NEUTRAL_QUESTIONS.includes(q)) NEUTRAL_QUESTIONS.push(q);
}

interface Probe {
  probeId: string;
  siteId: string;
  graph: Graph;
  projected: boolean;
  question: string;
  note: string;
}

function hostileSite(id: string, g: HGraph): Site {
  return { siteId: id, graph: g as unknown as Graph, projected: false };
}

// H-B with the owner HIDE decision applied (what a HIDE-respecting caller
// would feed the concierge). FieldVisibilityDecision shape: {objectId, field, policy, version}.
function hideProjected(g: HGraph): Graph {
  const projected = applyFieldVisibility(g as unknown as never, HOSTILE_B_HIDE_PHONE as never) as unknown as Graph;
  return publicOnly(projected);
}

const PROBES: Probe[] = [
  {
    probeId: "A1-hidden-object-traversal",
    siteId: "hostile-b-raw",
    graph: (hostileSite("hostile-b", HOSTILE_B)).graph,
    projected: false,
    question: "Who works here?",
    note: "Raw graph (unprojected) fed as adversarial caller: private person object linked via active employs rel. Measures G1 concierge visibility gap.",
  },
  {
    probeId: "A2-hidden-field-citation",
    siteId: "hostile-b-raw",
    graph: (hostileSite("hostile-b", HOSTILE_B)).graph,
    projected: false,
    question: "Where do they operate?",
    note: "Raw graph: private location object linked via active located_at rel. Measures hidden-field citation via traversal.",
  },
  {
    probeId: "A3-address-non-address-field",
    siteId: "hostile-a",
    graph: (hostileSite("hostile-a", HOSTILE_A)).graph,
    projected: false,
    question: "Which location is this business in?",
    note: "Street-level address in fields named street/location (no *address*). TD-002 re-measure on the concierge path.",
  },
  {
    probeId: "A3b-address-non-address-field-projected",
    siteId: "hostile-a",
    graph: applyFieldVisibility(HOSTILE_A as unknown as never, [] as never) as unknown as Graph,
    projected: true,
    question: "Which location is this business in?",
    note: "Same as A3 but through applyFieldVisibility(graph, []): the live pipeline's conservative default. Shows whether the name heuristic helps.",
  },
  {
    probeId: "A4-hide-divergence-raw",
    siteId: "hostile-b-raw",
    graph: (hostileSite("hostile-b", HOSTILE_B)).graph,
    projected: false,
    question: "What does this business do?",
    note: "Owner HIDEs the business phone. Raw graph (live-path behavior: applyFieldVisibility(graph, []) ignores decisions).",
  },
  {
    probeId: "A4b-hide-divergence-projected",
    siteId: "hostile-b-hide-projected",
    graph: hideProjected(HOSTILE_B),
    projected: true,
    question: "What does this business do?",
    note: "Same question with the owner HIDE decision applied by the caller. Control for A4.",
  },
  {
    probeId: "A5-provenance-private-objects",
    siteId: "hostile-b-raw",
    graph: (hostileSite("hostile-b", HOSTILE_B)).graph,
    projected: false,
    question: "How do you know?",
    note: "Raw graph: does the provenance 'Related records consulted' list include private objects?",
  },
  {
    probeId: "A6-conflict-blindspot",
    siteId: "hostile-c",
    graph: (hostileSite("hostile-c", HOSTILE_C)).graph,
    projected: false,
    question: "What information conflicts?",
    note: "Hours conflict (Sat 12:00 PM vs 2:00 PM) between business and external_identity; description variant across the pair. Measures scan blind spots.",
  },
  {
    probeId: "A7-clearwater-hours-conflict",
    siteId: "clearwater-plumbing-demo",
    graph: clearwaterJson.graph as Graph,
    projected: true,
    question: "What information conflicts?",
    note: "Intended Saturday-hours conflict (website 8:00 AM-12:00 PM vs GBP 8:00 AM-2:00 PM) in meta.conflictPair. Re-measures the known miss.",
  },
];

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

interface Checks {
  D1_all_graded: boolean;
  D2_grounded_cite: boolean;
  D3_unknown_form: boolean;
  D4_refused_consistent: boolean;
  D5_deterministic: boolean;
  D6_no_dangling_unknown_cite: boolean;
  S1_evidence_refs: boolean;
  S2_classification_refs: boolean;
  S3_markers_resolve: boolean;
  S4_unknowns_align: boolean;
  threw: boolean;
  throwMessage: string | null;
}

const UNKNOWN_FORM = /unknown/i;
const WILL_NOT_GUESS = /will not guess/i;
const UNCERTAIN_WORDS = /\b(maybe|probably|appears|looks like|might be|could be|seems|likely)\b/i;

function markersIn(text: string): number[] {
  const out: number[] = [];
  const re = /\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(parseInt(m[1], 10));
  return out;
}

function runOne(siteId: string, target: Obj, objects: Obj[], relationships: Graph["relationships"], question: string) {
  const matchedId = matchConciergeQuestion(question);
  if (!matchedId) {
    return { matchedId: null as string | null, ans: null as ConciergeAnswer | null, ans2: null, threw: false, throwMessage: null as string | null };
  }
  const input = { siteId, target, objects, relationships, question };
  let ans: ConciergeAnswer | null = null;
  let ans2: ConciergeAnswer | null = null;
  let threw = false;
  let throwMessage: string | null = null;
  try {
    ans = answerConciergeQuestion(input as never);
    ans2 = answerConciergeQuestion(input as never);
  } catch (e) {
    threw = true;
    throwMessage = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return { matchedId, ans, ans2, threw, throwMessage };
}

interface GradeFlags {
  hasInferred: boolean;
  derivedThin: boolean; // DERIVED with <2 evidence items
  supportedUncertainWords: boolean;
  conflictsFound: boolean;
  refused: boolean;
}

function gradeFlags(ans: ConciergeAnswer): GradeFlags {
  let hasInferred = false;
  let derivedThin = false;
  let supportedUncertainWords = false;
  for (const c of ans.claims) {
    if (c.grade === "INFERRED") hasInferred = true;
    if (c.grade === "DERIVED" && c.evidence.length < 2) derivedThin = true;
    if (c.grade === "SUPPORTED" && UNCERTAIN_WORDS.test(c.text)) supportedUncertainWords = true;
  }
  return {
    hasInferred,
    derivedThin,
    supportedUncertainWords,
    conflictsFound: ans.conflicts.length > 0,
    refused: ans.refused,
  };
}

interface AnswerRecord {
  kind: "neutral" | "probe";
  siteId: string;
  projected: boolean;
  probeId: string | null;
  question: string;
  matchedId: string | null;
  threw: boolean;
  throwMessage: string | null;
  refused: boolean | null;
  claims: { grade: string; evidenceCount: number; text: string }[] | null;
  conflicts: { fact: string; values: string[] }[] | null;
  unknowns: string[] | null;
  text: string | null;
  evidenceRefCount: number | null;
  markersUsed: number[] | null;
  checks: Checks;
  gradeFlags: GradeFlags | null;
  uncertaintyScore: number;
  uncertaintyReasons: string[];
  leakSignals: Record<string, boolean>;
}

function scoreAnswer(
  kind: "neutral" | "probe",
  siteId: string,
  projected: boolean,
  probeId: string | null,
  question: string,
  r: ReturnType<typeof runOne>,
): AnswerRecord {
  const checks: Checks = {
    D1_all_graded: false, D2_grounded_cite: false, D3_unknown_form: false,
    D4_refused_consistent: false, D5_deterministic: false, D6_no_dangling_unknown_cite: false,
    S1_evidence_refs: false, S2_classification_refs: false, S3_markers_resolve: false,
    S4_unknowns_align: false, threw: r.threw, throwMessage: r.throwMessage,
  };
  const rec: AnswerRecord = {
    kind, siteId, projected, probeId, question, matchedId: r.matchedId,
    threw: r.threw, throwMessage: r.throwMessage, refused: null, claims: null,
    conflicts: null, unknowns: null, text: null, evidenceRefCount: null,
    markersUsed: null, checks, gradeFlags: null, uncertaintyScore: 0,
    uncertaintyReasons: [], leakSignals: {},
  };
  if (!r.ans || !r.ans2) {
    // Declined (no canonical match) or threw: nothing to grade. Declines are
    // the honest path for out-of-scope questions.
    return rec;
  }
  const ans = r.ans;
  rec.refused = ans.refused;
  rec.claims = ans.claims.map((c) => ({ grade: c.grade, evidenceCount: c.evidence.length, text: c.text }));
  rec.conflicts = ans.conflicts.map((c) => ({ fact: c.fact, values: c.values.map((v) => v.value) }));
  rec.unknowns = ans.unknowns;
  rec.text = ans.text;
  const view = toAskFydAnswer(ans);
  rec.evidenceRefCount = view.evidenceRefs.length;
  rec.markersUsed = markersIn(ans.text);

  // --- Deterministic invariants ---
  checks.D1_all_graded = ans.claims.every((c) => GRADES.includes(c.grade));
  checks.D2_grounded_cite = ans.claims.every(
    (c) => c.grade === "UNKNOWN" || c.evidence.length >= 1,
  );
  checks.D3_unknown_form = ans.claims.every(
    (c) =>
      c.grade !== "UNKNOWN" ||
      (c.evidence.length === 0 && UNKNOWN_FORM.test(c.text) && WILL_NOT_GUESS.test(c.text)),
  );
  checks.D4_refused_consistent =
    (!ans.refused || ans.claims.every((c) => c.grade === "UNKNOWN")) &&
    (!ans.refused || ans.claims.length > 0) &&
    (ans.refused || ans.claims.length > 0);
  checks.D5_deterministic = JSON.stringify(ans) === JSON.stringify(r.ans2);
  // UNKNOWN claims must never be cited: no [n] marker may resolve to an
  // evidence ref that only backs an UNKNOWN claim (UNKNOWN claims carry no
  // evidence, so any citation implies a grounded claim exists for it).
  const refIds = new Set(view.evidenceRefs.map((e) => e.id));
  const claimRefIds = new Set<string>();
  for (const c of ans.claims) {
    for (const e of c.evidence) {
      const id = (e as { relationId?: string; field?: string; objectId?: string }).relationId ??
        ((e as { field?: string }).field ? `${(e as { objectId?: string }).objectId}#${(e as { field?: string }).field}` : (e as { objectId?: string }).objectId);
      if (id) claimRefIds.add(id);
    }
  }
  checks.D6_no_dangling_unknown_cite = [...claimRefIds].every((id) => refIds.has(id));

  // --- Schema validation of the wiring view ---
  checks.S1_evidence_refs =
    view.evidenceRefs.every((e) => typeof e.id === "string" && e.id.length > 0 && typeof e.label === "string" && e.label.length > 0 && typeof e.detail === "string") &&
    new Set(view.evidenceRefs.map((e) => e.id)).size === view.evidenceRefs.length;
  checks.S2_classification_refs =
    view.claimClassifications.every(
      (cc) => VIEW_CLASSES.has(cc.classification) && cc.evidenceRefIds.every((id) => refIds.has(id)),
    );
  const maxMarker = rec.markersUsed.length > 0 ? Math.max(...rec.markersUsed) : 0;
  const minMarker = rec.markersUsed.length > 0 ? Math.min(...rec.markersUsed) : 0;
  checks.S3_markers_resolve =
    rec.markersUsed.every((n) => n >= 1 && n <= view.evidenceRefs.length) &&
    (rec.markersUsed.length === 0 || (minMarker === 1));
  const unknownTexts = new Set(ans.claims.filter((c) => c.grade === "UNKNOWN").map((c) => c.text));
  checks.S4_unknowns_align =
    ans.unknowns.length === 0 || ans.unknowns.every((u) => unknownTexts.has(u) || view.unknowns.includes(u));

  // --- Grade-accuracy flags (programmatic comparison) ---
  rec.gradeFlags = gradeFlags(ans);

  // --- Uncertainty score (for human-review flagging; never adjudication) ---
  const reasons: string[] = [];
  let s = 0;
  const gf = rec.gradeFlags;
  if (gf.hasInferred) { s += 3; reasons.push("INFERRED claim present"); }
  if (gf.supportedUncertainWords) { s += 2; reasons.push("SUPPORTED claim uses uncertainty words"); }
  if (gf.derivedThin) { s += 1; reasons.push("DERIVED claim cites <2 evidence items"); }
  if (gf.conflictsFound) { s += 2; reasons.push("conflicts reported"); }
  if (gf.refused) { s += 1; reasons.push("refused=true"); }
  if (probeId) { s += 1; reasons.push("adversarial probe"); }
  rec.uncertaintyScore = s;
  rec.uncertaintyReasons = reasons;

  // --- Leak signals (adversarial measurement, raw string checks) ---
  const t = ans.text.toLowerCase();
  rec.leakSignals = {
    streetVerbatim: t.includes("999 secret lane"),
    hiddenCourt: t.includes("12 hidden court"),
    privatePersonNamed: t.includes("riley owner"),
    privateCell: t.includes("970-555-0199"),
    hiddenPhone: t.includes("970-555-0100"),
    satHoursConflict: t.includes("2:00 pm"),
  };
  return rec;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const records: AnswerRecord[] = [];

for (const site of NEUTRAL_SITES) {
  const pub = site.projected ? publicOnly(site.graph) : site.graph;
  const target = findBusinessTarget(pub.objects);
  if (!target) {
    records.push({
      kind: "neutral", siteId: site.siteId, projected: site.projected, probeId: null,
      question: "<no business target>", matchedId: null, threw: false, throwMessage: null,
      refused: null, claims: null, conflicts: null, unknowns: null, text: null,
      evidenceRefCount: null, markersUsed: null,
      checks: { D1_all_graded: false, D2_grounded_cite: false, D3_unknown_form: false, D4_refused_consistent: false, D5_deterministic: false, D6_no_dangling_unknown_cite: false, S1_evidence_refs: false, S2_classification_refs: false, S3_markers_resolve: false, S4_unknowns_align: false, threw: false, throwMessage: "NO_TARGET" },
      gradeFlags: null, uncertaintyScore: 0, uncertaintyReasons: ["no business target in graph"], leakSignals: {},
    });
    continue;
  }
  for (const q of NEUTRAL_QUESTIONS) {
    const r = runOne(site.siteId, target, pub.objects, pub.relationships, q);
    records.push(scoreAnswer("neutral", site.siteId, site.projected, null, q, r));
  }
}

for (const p of PROBES) {
  const g = p.projected ? publicOnly(p.graph) : p.graph;
  const target = findBusinessTarget(g.objects);
  if (!target) {
    throw new Error(`probe ${p.probeId}: no business target`);
  }
  const r = runOne(p.siteId, target, g.objects, g.relationships, p.question);
  records.push(scoreAnswer("probe", p.siteId, p.projected, p.probeId, p.question, r));
}

const outPath = join(HERE, "results.jsonl");
writeFileSync(outPath, records.map((r) => JSON.stringify(r)).join("\n") + "\n");

// --- Summary ---
const graded = records.filter((r) => r.claims !== null);
const detKeys = ["D1_all_graded", "D2_grounded_cite", "D3_unknown_form", "D4_refused_consistent", "D5_deterministic", "D6_no_dangling_unknown_cite"] as const;
const schemaKeys = ["S1_evidence_refs", "S2_classification_refs", "S3_markers_resolve", "S4_unknowns_align"] as const;
const detPass = graded.filter((r) => detKeys.every((k) => r.checks[k])).length;
const schemaPass = graded.filter((r) => schemaKeys.every((k) => r.checks[k])).length;
const declined = records.filter((r) => r.matchedId === null && r.claims === null && !r.threw).length;
const threwCount = records.filter((r) => r.threw).length;
const refusedCount = graded.filter((r) => r.refused === true).length;
const unknownsQs = graded.filter((r) => r.matchedId === "unknowns");
const unknownsHonest = unknownsQs.filter((r) => r.refused === true && (r.claims ?? []).every((c) => c.grade === "UNKNOWN")).length;

const summary = {
  totalRecords: records.length,
  gradedAnswers: graded.length,
  declined,
  threw: threwCount,
  deterministicPassRate: graded.length ? detPass / graded.length : null,
  schemaPassRate: graded.length ? schemaPass / graded.length : null,
  refusalRate: graded.length ? refusedCount / graded.length : null,
  unknownsQuestionCount: unknownsQs.length,
  unknownsHonestyRate: unknownsQs.length ? unknownsHonest / unknownsQs.length : null,
  detFailures: graded.filter((r) => !detKeys.every((k) => r.checks[k])).map((r) => ({ site: r.siteId, q: r.question, failed: detKeys.filter((k) => !r.checks[k]) })),
  schemaFailures: graded.filter((r) => !schemaKeys.every((k) => r.checks[k])).map((r) => ({ site: r.siteId, q: r.question, failed: schemaKeys.filter((k) => !r.checks[k]) })),
  throws: records.filter((r) => r.threw).map((r) => ({ site: r.siteId, probe: r.probeId, q: r.question, msg: r.throwMessage })),
  topUncertain: [...graded]
    .sort((a, b) => b.uncertaintyScore - a.uncertaintyScore || (a.siteId < b.siteId ? -1 : 1))
    .slice(0, 10)
    .map((r) => ({ site: r.siteId, probe: r.probeId, q: r.question, score: r.uncertaintyScore, reasons: r.uncertaintyReasons })),
};
writeFileSync(join(HERE, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
