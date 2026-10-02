/**
 * Evidence stage tests.
 *
 * The evidence stage makes the captured record's claims explicit and
 * digested. Every record must carry a provenance ref (the binding
 * verifier's "direct" gate depends on it) and a deterministic evidence
 * id (same claim -> same id across runs).
 */
import { deriveEvidence } from "../src/evidence";
import { HAPPY_PLACE_GRAPH } from "../fixtures/happy-place-graph";

const GRAPH = HAPPY_PLACE_GRAPH;

test("derives a non-empty, fully-referenced evidence set", () => {
  const d = deriveEvidence(GRAPH);
  expect(d.records.length).toBeGreaterThan(0);
  expect(d.inputKind).toBe("captured-record");
  for (const r of d.records) {
    expect(r.evidenceId).toMatch(/^[0-9a-f]{64}$/);
    expect(r.provenanceRef).not.toBe("");
    expect(r.claimKind).toBe("website_statement");
  }
});

test("derivation is deterministic: same graph -> same records and digest", () => {
  const a = deriveEvidence(GRAPH);
  const b = deriveEvidence(GRAPH);
  expect(b.derivationDigest).toBe(a.derivationDigest);
  expect(b.records).toEqual(a.records);
});

test("derivation digest is order-sensitive only to content, not input order", () => {
  const shuffled = {
    objects: GRAPH.objects.slice().reverse(),
    relationships: GRAPH.relationships.slice().reverse(),
  };
  const a = deriveEvidence(GRAPH);
  const b = deriveEvidence(shuffled);
  // Evidence ids are content digests: the SET of ids is identical.
  expect(new Set(b.records.map((r) => r.evidenceId))).toEqual(
    new Set(a.records.map((r) => r.evidenceId)),
  );
  expect(b.derivationDigest).toBe(a.derivationDigest);
});

test("relationship records reference real objects", () => {
  const d = deriveEvidence(GRAPH);
  const ids = new Set(GRAPH.objects.map((o) => o.id));
  for (const r of d.records.filter((x) => x.field.startsWith("relationship:"))) {
    expect(ids.has(r.objectId)).toBe(true);
    expect(ids.has(r.value)).toBe(true);
  }
});

test("every object with provenance contributes title/description claims", () => {
  const d = deriveEvidence(GRAPH);
  const byObj = new Map<string, Set<string>>();
  for (const r of d.records) {
    const s = byObj.get(r.objectId) ?? new Set<string>();
    s.add(r.field);
    byObj.set(r.objectId, s);
  }
  for (const o of GRAPH.objects) {
    const fields = byObj.get(o.id) ?? new Set<string>();
    if (o.title !== "") expect(fields.has("title")).toBe(true);
    if (o.description !== "") expect(fields.has("description")).toBe(true);
  }
});
