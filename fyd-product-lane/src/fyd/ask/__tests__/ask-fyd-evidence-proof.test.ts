/**
 * P1 PRODUCT proof: RENDERED EXPERIENCE -> ASK FYD -> EVIDENCE.
 * (Nolan's consolidated recovery directive, 2026-09-24 11:40 MDT,
 * superseding the earlier FYD ordering where they conflict.)
 *
 * The smallest real proof: "What services does this business offer, and
 * how do you know?" answered through the ownership chain
 *   OBSERVATION -> EVIDENCE -> OBJECT/FACT -> SITE PLANNER
 *   -> BINDING VERIFIER -> PRESENTATION MODEL -> RENDERER
 * This proof consumes the OBJECT/FACT authority's output
 * (verifyObjectGraph: tenant attestation, schema catalog, evidence
 * references, relationship legality) and asserts the binding-verifier
 * analogue invariant for answers: every factual claim in the answer
 * resolves to an authorized graph object/relationship, or is explicitly
 * classified generated/inferred. The renderer/composer never decides
 * truth: the composer only restates verified records.
 *
 * Required output per answer: ANSWER + OBJECTS USED + EVIDENCE USED +
 * SOURCE REFERENCES + DIRECT / DERIVED / INFERRED classification. When
 * evidence does not support the answer, the composer says so explicitly
 * (proven by the negative cases below). No filler, no generic chatbot.
 *
 * Epistemic mapping used by this proof (documented, deterministic):
 * - DIRECT: the claim restates observed records without adding
 *   information. "Acme Plumbing offers Drain cleaning" restates the
 *   active provides relationship (an observed record), naming the
 *   endpoint from the observed service object. Provenance sentences
 *   restate the target's record. Evidence: the relationship + objects.
 * - DERIVED: the claim is deterministically composed from multiple
 *   observed records and is not itself one record. "Related offerings:
 *   A; B." composes N provides edges + N service objects into a listing.
 * - INFERRED: the claim adds information present in no observed record.
 *   The proof asserts ZERO inferred claims: any inferred (or
 *   unclassifiable) claim fails the proof instead of being collapsed
 *   into a softer bucket.
 *
 * A transcript is written to proof/ask-fyd-services-proof.md so the
 * evidence trail is inspectable outside the test runner.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { verifyObjectGraph } from "../../builder/object-builder";
import { buildAskFydContext } from "../context-builder";
import { composeAskFyd } from "../answer";
import type { AskFydContextInput } from "../types";
import type {
  AskAnswer,
  FydGrant,
  PingObject,
  PingRelationship,
} from "../../../lib/ping/types";
import type { ObjectGraph } from "../../sitespec/types";
import type { PingProjection } from "../../data/ping-object-source";

const TENANT = "acme-plumbing-proof";
const QUESTION = "What services does this business offer, and how do you know?";
const SITE_URL = "https://acme-plumbing.example.com/";
const SERVICES_URL = "https://acme-plumbing.example.com/services";
const STAMP = "2026-09-24T00:00:00.000Z";

const BIZ = "ping.social.business@1";
const SVC = "ping.social.service@1";

function obj(
  id: string,
  schema: string,
  title: string,
  description: string,
  ref: string,
): PingObject {
  return {
    id,
    schema,
    controllerId: "owner-acme",
    visibility: "public",
    title,
    description,
    fields: {},
    createdAt: STAMP,
    updatedAt: STAMP,
    provenance: { kind: "website-derived", ref, derivedAt: STAMP },
  };
}

function rel(
  id: string,
  subject: string,
  predicate: string,
  object: string,
  evidenceRef: string,
): PingRelationship {
  return {
    id,
    subject,
    predicate,
    object,
    status: "active",
    createdAt: STAMP,
    evidenceRef,
  };
}

/** Synthetic trade graph: all public, every record evidence-backed. The
 *  business description names no services, so the answer provably comes
 *  from structured objects + relationships, never prose. */
function proofGraph(): ObjectGraph {
  return {
    objects: [
      obj(
        "biz-acme",
        BIZ,
        "Acme Plumbing",
        "Family-run plumbing shop serving the valley.",
        "website-ingestion:" + SITE_URL,
      ),
      obj("svc-drains", SVC, "Drain cleaning", "Clear slow drains fast.", "website-ingestion:" + SERVICES_URL),
      obj("svc-heaters", SVC, "Water heaters", "Install and repair.", "website-ingestion:" + SERVICES_URL),
    ],
    relationships: [
      rel("rel-provides-drains", "biz-acme", "provides", "svc-drains", "website-ingestion:" + SERVICES_URL),
      rel("rel-provides-heaters", "biz-acme", "provides", "svc-heaters", "website-ingestion:" + SERVICES_URL),
    ],
  };
}

function asProjection(graph: ObjectGraph): PingProjection {
  return {
    graph,
    meta: {
      siteId: TENANT,
      dumpedAt: STAMP,
      dumperVersion: "proof-harness@1",
      baseDigest: "proof",
      fixtureFileDigest: "proof",
      fixtureHeader: "proof",
      overlayEventIds: [],
      graphDigest: "proof",
      generatedAt: STAMP,
      eventSequences: null,
    },
    ownerOverlay: null,
    presentationIntent: null,
    fieldVisibility: null,
  };
}

function askContextFor(graph: ObjectGraph): AskFydContextInput {
  const target = graph.objects.find((o) => o.schema === BIZ) ?? null;
  const relatedObjects = graph.objects.filter((o) => o.schema === SVC);
  const relationships = graph.relationships.filter(
    (r) => r.status === "active" && (r.predicate === "provides" || r.predicate === "offers"),
  );
  return {
    viewer: { id: null, displayName: null },
    target,
    relatedObjects,
    relationships,
    plan: null,
    grants: ["site.read"] as FydGrant[],
    siteSpec: null,
    question: QUESTION,
  };
}

type Epistemic = "DIRECT" | "DERIVED" | "INFERRED";

interface ClassifiedClaim {
  claim: string;
  epistemic: Epistemic;
  evidenceClass: string;
  evidenceIds: string[];
  note: string;
}

/**
 * Epistemic classification for one claim, per the mapping documented at
 * the top of this file. Anything that does not match a known shape is
 * INFERRED, which fails the proof: unclassifiable claims are never
 * silently bucketed.
 */
function classifyClaim(
  claim: string,
  evidenceClass: string,
  evidenceIds: string[],
  graph: ObjectGraph,
  targetId: string,
): ClassifiedClaim {
  const offersMatch = /^(.+) offers (.+)$/.exec(claim);
  if (offersMatch) {
    const serviceTitle = offersMatch[2];
    const svc = graph.objects.find((o) => o.title === serviceTitle && o.schema === SVC);
    const edge = graph.relationships.find(
      (r) =>
        r.status === "active" &&
        (r.predicate === "provides" || r.predicate === "offers") &&
        r.subject === targetId &&
        svc !== undefined &&
        r.object === svc.id,
    );
    if (!svc || !edge) {
      return { claim, epistemic: "INFERRED", evidenceClass, evidenceIds, note: "no grounding edge+object in the verified graph" };
    }
    return {
      claim,
      epistemic: "DIRECT",
      evidenceClass,
      evidenceIds: [...evidenceIds, edge.id],
      note: "restates the active " + edge.predicate + " relationship " + edge.id,
    };
  }
  if (/record (identity|source|date|basis)/.test(claim)) {
    return {
      claim,
      epistemic: "DIRECT",
      evidenceClass,
      evidenceIds,
      note: "restates the target's verified record/provenance",
    };
  }
  return { claim, epistemic: "INFERRED", evidenceClass, evidenceIds, note: "no known claim shape" };
}

function evidenceLine(id: string, graph: ObjectGraph): string {
  const o = graph.objects.find((x) => x.id === id);
  if (o) {
    return `- [object] ${o.id} (${o.schema}): "${o.title}" — provenance ${o.provenance.kind}, ref ${o.provenance.ref}`;
  }
  const r = graph.relationships.find((x) => x.id === id);
  if (r) {
    return `- [relationship] ${r.id}: ${r.subject} ${r.predicate} ${r.object} (${r.status}), event ${r.evidenceRef}`;
  }
  throw new Error("evidence id \"" + id + "\" resolves to no authorized graph record");
}

function renderTranscript(
  answer: AskAnswer,
  graph: ObjectGraph,
  classified: ClassifiedClaim[],
  derivedListing: { text: string; evidenceIds: string[] } | null,
): string {
  const L: string[] = [];
  L.push("# Ask FYD evidence proof: services question");
  L.push("");
  L.push("Ownership chain: OBSERVATION -> EVIDENCE -> OBJECT/FACT");
  L.push("(verifyObjectGraph, tenant attestation \"" + TENANT + "\")");
  L.push("-> ASK FYD (composeAskFyd, deterministic, no LLM) -> EVIDENCE.");
  L.push("The composer restates verified records; it never decides truth.");
  L.push("");
  L.push("## Question");
  L.push(QUESTION);
  L.push("");
  L.push("## Answer");
  L.push(answer.answer);
  L.push("");
  L.push("## Objects used");
  const target = graph.objects.find((o) => o.schema === BIZ)!;
  L.push(`- ${target.id} (${target.schema}): "${target.title}" [target]`);
  for (const o of graph.objects.filter((o) => o.schema === SVC)) {
    L.push(`- ${o.id} (${o.schema}): "${o.title}" [related]`);
  }
  L.push("");
  L.push("## Evidence used");
  const seen = new Set<string>();
  for (const c of classified) {
    for (const id of c.evidenceIds) {
      if (!seen.has(id)) {
        seen.add(id);
        L.push(evidenceLine(id, graph));
      }
    }
  }
  if (derivedListing) {
    for (const id of derivedListing.evidenceIds) {
      if (!seen.has(id)) {
        seen.add(id);
        L.push(evidenceLine(id, graph));
      }
    }
  }
  L.push("");
  L.push("## Source references");
  for (const u of answer.sourceUrls) L.push("- " + u);
  L.push("");
  L.push("## Claim classification (DIRECT / DERIVED / INFERRED)");
  L.push("");
  L.push("| # | Claim | Class | Evidence class | Evidence |");
  L.push("| - | ----- | ----- | -------------- | -------- |");
  let n = 0;
  const row = (c: ClassifiedClaim): void => {
    n += 1;
    L.push(
      `| ${n} | ${c.claim} | ${c.epistemic} | ${c.evidenceClass} | ${c.evidenceIds.join(", ")} |`,
    );
  };
  if (derivedListing) {
    n += 1;
    L.push(
      `| ${n} | ${derivedListing.text} | DERIVED | composed listing | ${derivedListing.evidenceIds.join(", ")} |`,
    );
  }
  for (const c of classified) row(c);
  L.push("");
  const inferred = classified.filter((c) => c.epistemic === "INFERRED");
  L.push("Inferred claims: " + (inferred.length === 0 ? "none." : inferred.map((c) => c.claim).join("; ")));
  L.push("");
  L.push("## Verification");
  L.push("- every factual claim resolves to an authorized object/relationship in the verified graph;");
  L.push("- every offers claim has its grounding provides/offers edge in the verified graph;");
  L.push("- the answer is byte-identical across two runs (deterministic composer);");
  L.push("- unknowns are named explicitly when evidence is absent (see negative cases).");
  return L.join("\n") + "\n";
}

describe("P1 Ask FYD evidence proof: services question", () => {
  test("positive: verified graph -> cited, classified, sourced answer; transcript written", () => {
    // OBJECT/FACT authority: the proof consumes the verified graph, never
    // raw observations.
    const verified = verifyObjectGraph({ tenantId: TENANT }, asProjection(proofGraph()));
    expect(verified.attestation.checks).toContain("tenant-attestation");
    const graph = verified.graph;

    const ctx = buildAskFydContext(askContextFor(graph));
    const answer = composeAskFyd(ctx, QUESTION);

    expect(answer.partial).toBe(false);
    expect(answer.proposal).toBe(null);
    expect(answer.answer).toContain("Drain cleaning");
    expect(answer.answer).toContain("Water heaters");
    expect(answer.sourceUrls).toEqual(expect.arrayContaining([SITE_URL, SERVICES_URL]));
    expect(answer.claimClassifications.length).toBeGreaterThan(0);

    // The binding-verifier analogue invariant: every factual claim
    // resolves to authorized graph evidence.
    const targetId = "biz-acme";
    const classified = answer.claimClassifications.map((c) => {
      expect(c.evidenceRefIds.length).toBeGreaterThan(0);
      for (const id of c.evidenceRefIds) {
        // Throws when the id resolves to no authorized record.
        evidenceLine(id, graph);
      }
      return classifyClaim(c.claim, c.classification, c.evidenceRefIds, graph, targetId);
    });

    // The composed "Related offerings:" sentence carries no standalone
    // claim row; account for it explicitly as a DERIVED claim.
    const listingMatch = /Related offerings: ([^\n\[]+)/.exec(answer.answer);
    const derivedListing = listingMatch
      ? {
          text: ("Related offerings: " + listingMatch[1].trim()).replace(/\s+$/, ""),
          evidenceIds: graph.relationships
            .filter((r) => r.subject === targetId && (r.predicate === "provides" || r.predicate === "offers"))
            .flatMap((r) => [r.id, r.object]),
        }
      : null;
    if (derivedListing) {
      for (const id of derivedListing.evidenceIds) evidenceLine(id, graph);
    }

    const inferred = classified.filter((c) => c.epistemic === "INFERRED");
    expect(inferred).toEqual([]);
    const epistemics = new Set(classified.map((c) => c.epistemic));
    expect(epistemics.has("DIRECT")).toBe(true);

    // Every offers claim's grounding edge is in the verified graph.
    for (const c of classified.filter((c) => /^(.+) offers (.+)$/.test(c.claim))) {
      expect(c.note).toMatch(/restates the active (provides|offers) relationship/);
    }

    // Determinism: the composer is a pure function of (context, question).
    const again = composeAskFyd(buildAskFydContext(askContextFor(graph)), QUESTION);
    expect(JSON.stringify(again)).toBe(JSON.stringify(answer));

    // Transcript: the durable evidence trail.
    const transcript = renderTranscript(answer, graph, classified, derivedListing);
    for (const section of [
      "## Answer",
      "## Objects used",
      "## Evidence used",
      "## Source references",
      "## Claim classification (DIRECT / DERIVED / INFERRED)",
    ]) {
      expect(transcript).toContain(section);
    }
    const dir = join(__dirname, "../../../../proof");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "ask-fyd-services-proof.md"), transcript, "utf8");
  });

  test("negative: prose-only services -> explicit insufficient-evidence, nothing invented", () => {
    // The business description PROSE names services, but the graph carries
    // zero service objects: the honest answer refuses and names the gap.
    const graph = proofGraph();
    graph.objects = graph.objects.filter((o) => o.schema !== SVC);
    graph.relationships = [];
    graph.objects[0].description =
      "Family-run plumbing shop: drains, water heaters, and repiping.";
    const verified = verifyObjectGraph({ tenantId: TENANT }, asProjection(graph));
    const answer = composeAskFyd(buildAskFydContext(askContextFor(verified.graph)), QUESTION);

    expect(answer.partial).toBe(true);
    expect(answer.answer).toContain(
      "I do not have evidence for that in the current context, so I will not guess.",
    );
    expect(answer.unknowns).toContain("services offered by this business");
    for (const invented of ["drains", "water heaters", "repiping"]) {
      expect(answer.answer.toLowerCase()).not.toContain(invented);
    }
  });

  test("negative: specific topic with no record -> explicit insufficient-evidence", () => {
    // "financing" matches nothing on record: the topic guard keeps the
    // services branch from firing, so the question falls through to the
    // honest fallback instead of dumping unrelated offerings.
    const verified = verifyObjectGraph({ tenantId: TENANT }, asProjection(proofGraph()));
    const answer = composeAskFyd(
      buildAskFydContext(askContextFor(verified.graph)),
      "Do you offer financing?",
    );
    expect(answer.partial).toBe(true);
    expect(answer.answer).toContain(
      "I do not have evidence for that in the current context, so I will not guess.",
    );
    // The refusal names the consulted evidence (transparency), but never
    // claims financing is offered: no invented answer.
    expect(answer.answer.toLowerCase()).not.toContain("financing is offered");
    expect(answer.answer).not.toMatch(/offer[^.]*financing/i);
  });
});
