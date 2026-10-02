/**
 * Employment re-run: per-candidate edge outcomes over a synthetic
 * employment graph.
 *
 * The verified graph holds one public business (biz-1), one public person
 * (person-1), one private person (person-2), one post (post-1), and one
 * attested employment relationship (person-1 works_for biz-1). Candidate
 * edges are intake proposals evaluated against that verified context.
 *
 * Every test answers the CEO's four questions for its edge: never
 * observed? observed but unresolved? resolved but filtered? projected but
 * not rendered? Each test also asserts the compiler emitted exactly one
 * outcome per candidate: nothing silently dropped, nothing invented.
 */
import {
  compileEdgeOutcomes,
  EdgeOutcomesError,
  type EdgeBinding,
  type EdgeCandidate,
  type EdgeOutcome,
} from "../index";
import { verifyObjectGraph } from "../../builder/object-builder";
import { deriveEligibility } from "../../builder/eligibility";
import type { PingObject, PingRelationship } from "@/lib/ping/types";
import type { ObjectGraph } from "../../sitespec/types";
import type { PingProjection } from "@/fyd/data/ping-object-source";

const TS = "2026-09-21T00:00:00.000Z";
const BIZ = "ping.social.business@1";
const PERSON = "ping.social.person@1";
const POST = "ping.social.post@1";
const EVIDENCE = "website-ingestion:https://example.com/team";

function makeObject(id: string, schema: string, opts?: Partial<PingObject>): PingObject {
  return {
    id,
    schema,
    controllerId: "employment-test",
    visibility: "public",
    title: id,
    description: "",
    fields: {},
    createdAt: TS,
    updatedAt: TS,
    provenance: { kind: "website-derived", ref: EVIDENCE, derivedAt: TS },
    ...(opts ?? {}),
  };
}

function makeRelationship(
  id: string,
  subject: string,
  predicate: string,
  object: string,
): PingRelationship {
  return {
    id,
    subject,
    predicate,
    object,
    status: "active",
    createdAt: TS,
    evidenceRef: EVIDENCE,
  };
}

/** Synthetic employment graph: public business, public person, private person, post. */
function employmentGraph(): ObjectGraph {
  return {
    objects: [
      makeObject("biz-1", BIZ, { title: "Acme Plumbing" }),
      makeObject("person-1", PERSON, { title: "Jo Rivera" }),
      makeObject("person-2", PERSON, { title: "Sam Lee", visibility: "private" }),
      makeObject("post-1", POST, { title: "Winterizing tips" }),
    ],
    relationships: [makeRelationship("rel-works", "person-1", "works_for", "biz-1")],
  };
}

const CTX = { tenantId: "employment-tenant" };

function proj(graph: ObjectGraph): PingProjection {
  return { graph, meta: { siteId: "employment-tenant" } } as unknown as PingProjection;
}

const BINDINGS: EdgeBinding[] = [
  {
    bindingId: "home:People:0",
    component: "People",
    predicates: ["employs", "works_for", "has_member", "member_of"],
  },
];

function cand(
  id: string,
  subject: string,
  predicate: string,
  object: string,
  evidenceRef: string | null = EVIDENCE,
  observationRef: string | null = "obs:team-page",
): EdgeCandidate {
  return { id, subject, predicate, object, evidenceRef, observationRef };
}

function byId(outcomes: EdgeOutcome[]): Map<string, EdgeOutcome> {
  return new Map(outcomes.map((o) => [o.candidateId, o]));
}

describe("employment re-run: every candidate edge gets an outcome", () => {
  const verified = verifyObjectGraph(CTX, proj(employmentGraph()));
  const eligibility = deriveEligibility(verified.graph);

  const compile = (
    candidates: EdgeCandidate[],
    ownerOperatingConstraints?: string[],
  ): EdgeOutcome[] =>
    compileEdgeOutcomes(candidates, verified.graph, eligibility, BINDINGS, {
      ownerOperatingConstraints,
    });

  test("(0) the fixture graph verifies and People is eligible", () => {
    expect(verified.attestation.checks).toContain("relationship-legality");
    expect(eligibility.eligible["People"]).toBe(true);
    expect(eligibility.counts.team).toBe(1);
  });

  test("(a) person works_for business: ACCEPTED at rendered. Projected and rendered; NOT never-observed, NOT observed-but-unresolved, NOT resolved-but-filtered, NOT projected-but-not-rendered", () => {
    const candidates = [cand("cand-a", "person-1", "works_for", "biz-1")];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-a")!;
    expect(o.outcome).toBe("accepted");
    expect(o.stage).toBe("rendered");
    expect(o.reason).toContain('bound into "People"');
    expect(o.reason).toContain("renders");
    expect(o.via).toBe("home:People:0");
  });

  test("(b) business employs person: ACCEPTED at rendered. Projected and rendered; NOT never-observed, NOT observed-but-unresolved, NOT resolved-but-filtered, NOT projected-but-not-rendered", () => {
    const candidates = [cand("cand-b", "biz-1", "employs", "person-1")];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-b")!;
    expect(o.outcome).toBe("accepted");
    expect(o.stage).toBe("rendered");
    expect(o.via).toBe("home:People:0");
  });

  test("(c) both directions present: employs ACCEPTED, works_for DUPLICATE at resolved, no double-count", () => {
    const candidates = [
      cand("cand-c1", "person-1", "works_for", "biz-1"),
      cand("cand-c2", "biz-1", "employs", "person-1"),
    ];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(2);
    const m = byId(outcomes);
    // The canonical forward form (employs) wins deterministically.
    expect(m.get("cand-c2")!.outcome).toBe("accepted");
    expect(m.get("cand-c2")!.stage).toBe("rendered");
    const dup = m.get("cand-c1")!;
    expect(dup.outcome).toBe("duplicate");
    expect(dup.stage).toBe("resolved");
    expect(dup.reason).toContain('same fact as accepted candidate "cand-c2"');
    expect(dup.reason).toContain("no double-count");
    expect(dup.via).toBe("cand-c2");
    // No double-count: exactly one accepted edge for the fact.
    expect(outcomes.filter((o) => o.outcome === "accepted")).toHaveLength(1);
  });

  test("(d) edge to a missing endpoint: SCHEMA-REJECTED at resolved. Observed but unresolved", () => {
    const candidates = [cand("cand-d", "person-1", "works_for", "biz-gone")];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-d")!;
    expect(o.outcome).toBe("schema-rejected");
    expect(o.stage).toBe("resolved");
    expect(o.reason).toContain('dangling object "biz-gone"');
  });

  test("(e) illegal predicate: SCHEMA-REJECTED at resolved. Observed but unresolved", () => {
    const candidates = [cand("cand-e", "person-1", "manages", "biz-1")];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-e")!;
    expect(o.outcome).toBe("schema-rejected");
    expect(o.stage).toBe("resolved");
    expect(o.reason).toContain('illegal predicate "manages"');
  });

  test("(f) owner operating constraint no-people: POLICY-SUPPRESSED at projected. Projected but not rendered", () => {
    const candidates = [cand("cand-f", "person-1", "works_for", "biz-1")];
    const outcomes = compile(candidates, ["no-people"]);
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-f")!;
    expect(o.outcome).toBe("policy-suppressed");
    expect(o.stage).toBe("projected");
    expect(o.reason).toContain('bound into "People"');
    expect(o.reason).toContain('"no-people"');
    expect(o.reason).toContain("projected, never rendered");
    expect(o.via).toBe("home:People:0");
  });

  test("(g) edge whose object is private: UNSUPPORTED at filtered. Resolved but filtered", () => {
    const candidates = [cand("cand-g", "biz-1", "employs", "person-2")];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-g")!;
    expect(o.outcome).toBe("unsupported");
    expect(o.stage).toBe("filtered");
    expect(o.reason).toContain('object "person-2" is private');
  });

  test("(h) two candidate predicates for the same fact: AMBIGUOUS at observed. Observed but unresolved, needs evidence", () => {
    const candidates = [
      cand("cand-h1", "person-1", "works_for", "biz-1"),
      cand("cand-h2", "person-1", "member_of", "biz-1"),
    ];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(2);
    const m = byId(outcomes);
    for (const id of ["cand-h1", "cand-h2"]) {
      const o = m.get(id)!;
      expect(o.outcome).toBe("ambiguous");
      expect(o.stage).toBe("observed");
      expect(o.reason).toContain('"works_for"');
      expect(o.reason).toContain('"member_of"');
      expect(o.reason).toContain("more evidence needed");
    }
  });

  test("(i) candidate with no evidence or observation ref: UNRESOLVED at observed. Observed but unresolved", () => {
    const candidates = [cand("cand-i", "person-1", "works_for", "biz-1", null, null)];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-i")!;
    expect(o.outcome).toBe("unresolved");
    expect(o.stage).toBe("observed");
    expect(o.reason).toContain("cannot be traced to evidence");
  });

  test("(j) legal predicate with no planner binding: UNSUPPORTED at projected. Schema-legal, no presentation path", () => {
    const candidates = [cand("cand-j", "biz-1", "publishes", "post-1")];
    const outcomes = compile(candidates);
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-j")!;
    expect(o.outcome).toBe("unsupported");
    expect(o.stage).toBe("projected");
    expect(o.reason).toContain('no planner binding consumes predicate "publishes"');
  });

  test("(k) bound component not eligible: UNSUPPORTED at filtered. Resolved but filtered", () => {
    const ineligible = {
      ...eligibility,
      eligible: { ...eligibility.eligible, People: false },
      reasons: { ...eligibility.reasons, People: "team count 0" },
    };
    const candidates = [cand("cand-k", "person-1", "works_for", "biz-1")];
    const outcomes = compileEdgeOutcomes(
      candidates,
      verified.graph,
      ineligible,
      BINDINGS,
      {},
    );
    expect(outcomes).toHaveLength(1);
    const o = byId(outcomes).get("cand-k")!;
    expect(o.outcome).toBe("unsupported");
    expect(o.stage).toBe("filtered");
    expect(o.reason).toContain('component "People" is not eligible');
  });

  test("never observed: a fact with no candidate gets no outcome; the compiler invents nothing", () => {
    const outcomes = compile([]);
    expect(outcomes).toEqual([]);
    // person-2 has no candidate in the accepted run: no outcome mentions them.
    const accepted = compile([cand("cand-a", "person-1", "works_for", "biz-1")]);
    expect(accepted).toHaveLength(1);
    expect(JSON.stringify(accepted)).not.toContain("person-2");
  });

  test("unknown shapes fail closed: empty id throws, duplicate candidate ids throw", () => {
    expect(() =>
      compile([
        { id: "", subject: "person-1", predicate: "works_for", object: "biz-1", evidenceRef: EVIDENCE, observationRef: "obs:1" },
      ]),
    ).toThrow(expect.objectContaining({ code: "EDGE_OUTCOMES_SHAPE" }));
    expect(() =>
      compile([
        cand("cand-x", "person-1", "works_for", "biz-1"),
        cand("cand-x", "biz-1", "employs", "person-1"),
      ]),
    ).toThrow(expect.objectContaining({ code: "EDGE_OUTCOMES_SHAPE" }));
  });

  test("deterministic: same inputs produce identical outcomes", () => {
    const candidates = [
      cand("cand-c1", "person-1", "works_for", "biz-1"),
      cand("cand-c2", "biz-1", "employs", "person-1"),
      cand("cand-d", "person-1", "works_for", "biz-gone"),
    ];
    const a = compile(candidates);
    const b = compile([...candidates].reverse());
    expect(a).toEqual(b);
  });
});
