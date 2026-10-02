/**
 * ASK FYD gold-set harness.
 *
 * The harness drives the REAL production deterministic path, never a
 * reimplementation:
 *   fixture graph (TS fixture modules, the same graphs the product tests use)
 *     -> applyVariant (synthetic test variants; owner variants use the REAL
 *        owner store: applyOwnerCommand + applyOwnerFieldCorrections against
 *        a temp FYD_OWNER_DIR)
 *     -> buildAskFydContext (FYD-010 projection, field-visibility decisions,
 *        FYD-Q1 conflict suppression)
 *     -> composeAskFyd (site-patch intents, conflict observation evidence,
 *        evidence-backed composer)
 *     -> per-question scoring against the gold record.
 *
 * Zero JEV calls. JEV shadow runs separately (jev-shadow.py) and never
 * overrides these results.
 */
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ClaimClassification } from "@/lib/ping/types";
import type { ObjectGraph, PingObject } from "@/fyd/sitespec/types";
import type { FieldVisibilityDecision } from "@/fyd/sitespec/field-visibility";
import { buildAskFydContext } from "@/fyd/ask/context-builder";
import { composeAskFyd } from "@/fyd/ask/answer";
import type { AskFieldConflict } from "@/fyd/ask/field-conflicts";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { HAPPY_PLACE_GRAPH } from "@/fyd/proceduralize/__fixtures__/happy-place-graph";
import { applyOwnerCommand } from "@/fyd/object/owner-store";
import { applyOwnerFieldCorrections } from "@/fyd/object/owner-overlay";

/**
 * gold-set.json lives next to this module. Resolve it without import.meta
 * (which is a parse error under jest's CJS transform): prefer __dirname
 * when defined (jest), else the worktree-relative path (tsx scripts run
 * from the worktree root).
 */
function goldSetPath(): string {
  const candidates: string[] = [];
  if (typeof __dirname === "string") candidates.push(join(__dirname, "gold-set.json"));
  candidates.push(join(process.cwd(), "tests", "ask-fyd", "gold-set.json"));
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error("gold-set.json not found");
}

export interface GoldRecord {
  id: string;
  question: string;
  category: string;
  business: string;
  variant: null | { kind: string; [k: string]: unknown };
  expectedEpistemic: string;
  requiredEvidence: string[];
  allowedEvidence: string[];
  forbiddenClaims: string[];
  notes: string;
}

export interface GoldDoc {
  version: string;
  generated: string;
  sourceGraphs: Record<string, unknown>;
  variants: Record<string, { kind: string; description: string; [k: string]: unknown }>;
  questions: GoldRecord[];
}

export function loadGoldDoc(): GoldDoc {
  return JSON.parse(readFileSync(goldSetPath(), "utf8"));
}

export function loadGoldSet(): GoldRecord[] {
  return loadGoldDoc().questions;
}

function asFixture(graph: ObjectGraph): { businessId: string; graph: ObjectGraph } {
  const biz = graph.objects.find((o) => o.schema === "ping.social.business@1");
  if (!biz) throw new Error("fixture has no business object");
  return { businessId: biz.id, graph };
}

const FIXTURES: Record<string, { businessId: string; graph: ObjectGraph }> = {
  coppersmith: asFixture(COPPERSMITH_GRAPH),
  "happy-place": asFixture(HAPPY_PLACE_GRAPH),
};

function cloneGraph(g: ObjectGraph): ObjectGraph {
  return JSON.parse(JSON.stringify(g));
}

function withTempOwnerDir<T>(fn: () => T): T {
  const prev = process.env.FYD_OWNER_DIR;
  process.env.FYD_OWNER_DIR = mkdtempSync(join(tmpdir(), "askfyd-gold-owner-"));
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.FYD_OWNER_DIR;
    else process.env.FYD_OWNER_DIR = prev;
  }
}

/**
 * Apply a synthetic variant. Owner variants go through the REAL owner
 * store (applyOwnerCommand) and the REAL overlay
 * (applyOwnerFieldCorrections), so the harness exercises the same code
 * the product serves. Never mutates the fixture.
 */
export function applyVariant(
  fixture: { businessId: string; graph: ObjectGraph },
  variant: GoldRecord["variant"],
): ObjectGraph {
  const graph = cloneGraph(fixture.graph);
  if (!variant) return graph;
  const kind = variant.kind as string;
  if (kind === "conflict" || kind === "visibility" || kind === "private") {
    // Handled at the projection layer (buildAskFydContext args), not here.
    // "private" object visibility is set here though (it is graph state).
    if (kind === "private") {
      const ids = new Set(variant.objectIds as string[]);
      return {
        ...graph,
        objects: graph.objects.map((o) =>
          ids.has(o.id) ? { ...o, visibility: "private" as const } : o,
        ),
      };
    }
    return graph;
  }
  if (kind === "owner-correction") {
    return withTempOwnerDir(() => {
      const businessId = fixture.businessId;
      const business = graph.objects.find((o) => o.id === businessId)!;
      const serviceObjs = graph.objects.filter(
        (o) => o.schema === "ping.social.service@1",
      );
      const knownIds = serviceObjs.map((o) => o.id);
      const knownNames = new Map(serviceObjs.map((o) => [o.id, o.title ?? o.id]));
      const correctionType = variant.correctionType as string;
      if (correctionType === "correct") {
        applyOwnerCommand(
          businessId,
          {
            type: "set-contact-field",
            field: variant.field,
            value: variant.newValue,
          } as any,
          knownIds,
          knownNames,
          { sourceValue: String(business.fields?.[variant.field as string] ?? "") },
        );
      } else if (correctionType === "hide") {
        // The REAL owner service-hide command. The owner store records it
        // (hiddenServices); the ask path never consults it (AG-002).
        applyOwnerCommand(
          businessId,
          { type: "set-service-visibility", id: variant.objectId, visible: false } as any,
          knownIds,
          knownNames,
        );
      } else if (correctionType === "reject-proposal") {
        // Owner rejects a proposed phone change: recorded as a
        // confirmation of the current (source) value.
        const business2 = graph.objects.find((o) => o.id === businessId)!;
        applyOwnerCommand(
          businessId,
          { type: "confirm-contact-field", field: variant.field } as any,
          knownIds,
          knownNames,
          { sourceValue: String(business2.fields?.[variant.field as string] ?? "") },
        );
      } else {
        throw new Error(`unknown correctionType ${correctionType}`);
      }
      return applyOwnerFieldCorrections(graph, businessId).graph;
    });
  }
  if (kind === "drop-schema") {
    const schema = variant.schema as string;
    const ids = new Set(
      graph.objects.filter((o) => o.schema === schema).map((o) => o.id),
    );
    return {
      ...graph,
      objects: graph.objects.filter((o) => !ids.has(o.id)),
      relationships: graph.relationships.filter(
        (r) => !ids.has(r.subject) && !ids.has(r.object),
      ),
    };
  }
  throw new Error(`unknown variant kind ${kind}`);
}

/** Build declared field conflicts for the conflict variant (real FYD-Q1 path). */
export function buildConflicts(
  graph: ObjectGraph,
  variant: GoldRecord["variant"],
): AskFieldConflict[] {
  if (!variant || variant.kind !== "conflict") return [];
  const obj = graph.objects.find((o) => o.id === variant.objectId);
  const canonical = obj?.fields?.[variant.field as string] ?? "unknown";
  return [
    {
      objectId: variant.objectId as string,
      field: variant.field as string,
      status: "unresolved",
      observations: [
        {
          value: String(canonical),
          provenanceKind: "website-ingestion",
          provenanceRef: "website-ingestion:fixture",
          derivedAt: "2026-09-21T00:00:00Z",
        },
        {
          value: variant.conflictingValue as string,
          provenanceKind: "owner-correction",
          provenanceRef: "owner-correction:cg-001",
          derivedAt: "2026-09-30T00:00:00Z",
        },
      ],
    },
  ];
}

export interface GoldRun {
  answer: {
    answer: string;
    claimClassifications: ClaimClassification[];
    partial: boolean;
    unknowns: string[];
  };
  candidateEvidenceIds: string[];
  candidateEvidenceLabels: string[];
  claimClassifications: ClaimClassification[];
  /** Wall-clock ms for the production path (projection + compose). */
  latencyMs: number;
  /** Declared conflicts for this run (empty unless conflict variant). */
  conflicts: AskFieldConflict[];
}

/** Fresh clone of a fixture graph plus its business id (never the shared copy). */
export function getFixtureGraph(
  key: "coppersmith" | "happy-place",
): { businessId: string; graph: ObjectGraph } {
  const fixture = FIXTURES[key];
  if (!fixture) throw new Error(`unknown fixture ${key}`);
  return { businessId: fixture.businessId, graph: cloneGraph(fixture.graph) };
}

/**
 * Projection half of runGoldQuestion: buildAskFydContext + composeAskFyd
 * on a caller-supplied graph (e.g. one corrected by the real owner store).
 */
export function runQuestionOnGraph(
  graph: ObjectGraph,
  businessId: string,
  question: string,
): GoldRun {
  const business: PingObject | undefined = graph.objects.find(
    (o) => o.id === businessId,
  );
  if (!business) throw new Error(`business object missing for ${businessId}`);
  const related = graph.objects.filter((o) => o.id !== business.id);
  const ctx = buildAskFydContext({
    viewer: { id: "gold-set-visitor", displayName: "Gold Set Visitor" },
    target: business,
    relatedObjects: related,
    relationships: graph.relationships,
    plan: null,
    grants: [],
    siteSpec: null,
    question,
    fieldVisibilityDecisions: [],
    fieldConflicts: [],
  });
  const answer = composeAskFyd(ctx, question);
  return {
    answer: {
      answer: answer.answer,
      claimClassifications: answer.claimClassifications,
      partial: answer.partial,
      unknowns: answer.unknowns ?? [],
    },
    candidateEvidenceIds: ctx.base.evidenceRefs.map((r) => r.id),
    candidateEvidenceLabels: ctx.base.evidenceRefs.map((r) => r.label),
    claimClassifications: answer.claimClassifications,
    latencyMs: 0,
    conflicts: [],
  };
}

/** Run one gold question through the production deterministic path. */
export function runGoldQuestion(rec: GoldRecord): GoldRun {
  const t0 = Date.now();
  const fixture = FIXTURES[rec.business];
  if (!fixture) throw new Error(`unknown business ${rec.business}`);
  const graph = applyVariant(fixture, rec.variant);
  const business: PingObject | undefined = graph.objects.find(
    (o) => o.id === fixture.businessId,
  );
  if (!business) throw new Error(`business object missing for ${rec.id}`);
  const related = graph.objects.filter((o) => o.id !== business.id);
  const decisions =
    rec.variant?.kind === "visibility"
      ? (rec.variant.decisions as FieldVisibilityDecision[])
      : [];
  const conflicts = buildConflicts(fixture.graph, rec.variant);
  const ctx = buildAskFydContext({
    viewer: { id: "gold-set-visitor", displayName: "Gold Set Visitor" },
    target: business,
    relatedObjects: related,
    relationships: graph.relationships,
    plan: null,
    grants: [],
    siteSpec: null,
    question: rec.question,
    fieldVisibilityDecisions: decisions,
    fieldConflicts: conflicts,
  });
  const answer = composeAskFyd(ctx, rec.question);
  return {
    answer: {
      answer: answer.answer,
      claimClassifications: answer.claimClassifications,
      partial: answer.partial,
      unknowns: answer.unknowns ?? [],
    },
    candidateEvidenceIds: ctx.base.evidenceRefs.map((r) => r.id),
    candidateEvidenceLabels: ctx.base.evidenceRefs.map((r) => r.label),
    claimClassifications: answer.claimClassifications,
    latencyMs: Date.now() - t0,
    conflicts,
  };
}

export interface GoldScore {
  requiredRecall: number;
  citedRequired: string[];
  citedOutsideAllowed: string[];
  forbiddenHits: string[];
  claimsTotal: number;
  claimsWithEvidence: number;
  supportRate: number;
  refused: boolean;
  conflictAcknowledged: boolean;
  latencyMs: number;
}

export function scoreRun(rec: GoldRecord, run: GoldRun): GoldScore {
  const t0 = Date.now();
  const cited = new Set<string>();
  for (const c of run.claimClassifications) {
    for (const id of c.evidenceRefIds ?? []) cited.add(id);
  }
  const citedRequired = rec.requiredEvidence.filter((id) => cited.has(id));
  const requiredRecall =
    rec.requiredEvidence.length === 0
      ? 1
      : citedRequired.length / rec.requiredEvidence.length;
  const citedOutsideAllowed = [...cited].filter(
    (id) => !rec.allowedEvidence.includes(id) && !rec.requiredEvidence.includes(id),
  );
  const answerText = run.answer.answer;
  const forbiddenHits = rec.forbiddenClaims.filter((fc) => answerText.includes(fc));
  // Conflict-variant hardening: neither disputed observation value may
  // appear stated as fact in the answer.
  for (const c of run.conflicts) {
    for (const obs of c.observations) {
      if (obs.value && obs.value !== "unknown" && answerText.includes(obs.value)) {
        forbiddenHits.push(`disputed value stated as fact: ${obs.value}`);
      }
    }
  }
  const claimsTotal = run.claimClassifications.length;
  const claimsWithEvidence = run.claimClassifications.filter(
    (c) => (c.evidenceRefIds ?? []).length > 0,
  ).length;
  const supportRate = claimsTotal === 0 ? 1 : claimsWithEvidence / claimsTotal;
  // Refusal is a leading refusal sentence (the composer's noEvidenceAnswer
  // or scope refusal), not a substring that can also appear inside an
  // explicitly-based INFERENCE sentence ("nothing in the site record
  // mentions it").
  const refused =
    answerText.startsWith("I cannot answer that") ||
    answerText.startsWith("I can only answer questions about");
  const conflictAcknowledged =
    /being verified|conflict|unresolved|disagree/i.test(answerText);
  return {
    requiredRecall,
    citedRequired,
    citedOutsideAllowed,
    forbiddenHits,
    claimsTotal,
    claimsWithEvidence,
    supportRate,
    refused,
    conflictAcknowledged,
    latencyMs: Date.now() - t0,
  };
}

/** Canonical SHA-256 of a run's scored surface (replay equality). */
export function runDigest(rec: GoldRecord, run: GoldRun): string {
  const s = scoreRun(rec, run);
  const payload = JSON.stringify({
    id: rec.id,
    answer: run.answer.answer,
    claims: run.claimClassifications.map((c) => ({
      claim: c.claim,
      classification: c.classification,
      refs: [...(c.evidenceRefIds ?? [])].sort(),
    })),
    unknowns: [...run.answer.unknowns].sort(),
    partial: run.answer.partial,
    requiredRecall: s.requiredRecall,
    refused: s.refused,
  });
  return createHash("sha256").update(payload).digest("hex");
}
