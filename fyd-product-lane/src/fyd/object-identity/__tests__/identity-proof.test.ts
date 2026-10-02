/**
 * G2 identity proof: same source semantics produce the same business id
 * across six conditions, and an owner correction keyed by the stable id
 * survives every one of them.
 *
 * Every assertion below is concrete: exact id equality, exact journal
 * sizes, exact correction resolution. No vibes.
 */

import {
  businessIdForSource,
  canonicalSourceKey,
  createIdentityJournal,
  idDomain,
  mintObservation,
  OBJECT_IDENTITY_DOMAIN,
} from "../identity";

const SOURCE =
  "https://www.coppersmith.example/?utm_source=newsletter&fbclid=IwAR0abc";
const ROLE = "business";
const EXPECTED_KEY = "https://www.coppersmith.example";
const EXPECTED_ID = businessIdForSource(EXPECTED_KEY, ROLE);

const OWNER_TITLE = "Coppersmith Taproom (owner verified)";
const FALLBACK_TITLE = "Coppersmith Taproom";

interface Correction {
  title: string;
}

function createCorrectionStore() {
  const overrides = new Map<string, Correction>();
  return {
    apply(objectId: string, correction: Correction): void {
      overrides.set(objectId, correction);
    },
    resolve(objectId: string, fallback: Correction): Correction {
      return overrides.get(objectId) ?? fallback;
    },
  };
}

describe("G2 identity proof: one source, one id, six conditions", () => {
  // One correction store for the whole proof. The correction is applied
  // ONCE, before any condition runs. Every condition then re-mints the id
  // from scratch and the correction must still resolve by that id.
  const corrections = createCorrectionStore();

  beforeAll(() => {
    corrections.apply(EXPECTED_ID, { title: OWNER_TITLE });
  });

  function expectCorrectionSurvives(condition: string, remintedId: string): void {
    expect(remintedId).toBe(EXPECTED_ID);
    const resolved = corrections.resolve(remintedId, { title: FALLBACK_TITLE });
    expect(resolved.title).toBe(OWNER_TITLE);
  }

  test("canonicalization: URL variants converge to one source key", () => {
    const variants = [
      "https://www.coppersmith.example",
      "https://www.coppersmith.example/",
      "HTTPS://WWW.COPPERSMITH.EXAMPLE/",
      "https://www.coppersmith.example:443/",
      "https://www.coppersmith.example#menu",
      "https://www.coppersmith.example/?utm_source=x&utm_medium=y&fbclid=z",
    ];
    for (const v of variants) {
      expect(canonicalSourceKey(v)).toBe(EXPECTED_KEY);
    }
    // Kept query params are sorted: both orderings converge to one key.
    expect(canonicalSourceKey("https://www.coppersmith.example/?b=2&a=1")).toBe(
      "https://www.coppersmith.example?a=1&b=2"
    );
    expect(canonicalSourceKey("https://www.coppersmith.example/?a=1&b=2")).toBe(
      "https://www.coppersmith.example?a=1&b=2"
    );
    // A non-default port is a different deployment: kept distinct.
    expect(canonicalSourceKey("https://www.coppersmith.example:8443/")).not.toBe(
      EXPECTED_KEY
    );
    // A different host is a different business: distinct key, distinct id.
    const otherKey = canonicalSourceKey("https://www.other-shop.example/");
    expect(otherKey).not.toBe(EXPECTED_KEY);
    expect(businessIdForSource(otherKey, ROLE)).not.toBe(EXPECTED_ID);
  });

  test("condition (a): runner A vs runner B mint the same id", () => {
    const runnerA = mintObservation({
      sourceUrl: SOURCE,
      schemaRole: ROLE,
      runnerLabel: "website",
      runId: "run-a",
    });
    const runnerB = mintObservation({
      sourceUrl: SOURCE,
      schemaRole: ROLE,
      runnerLabel: "facebook",
      runId: "run-b",
    });
    expect(runnerA.objectId).toBe(EXPECTED_ID);
    expect(runnerB.objectId).toBe(EXPECTED_ID);
    expect(runnerA.objectId).toBe(runnerB.objectId);
    // The runner label lives in provenance only, and differs per runner.
    expect(runnerA.provenance.runnerLabel).toBe("website");
    expect(runnerB.provenance.runnerLabel).toBe("facebook");
    // The runner label never leaks into the id string.
    expect(runnerA.objectId).not.toContain("website");
    expect(runnerA.objectId).not.toContain("facebook");
    expect(runnerB.objectId).not.toContain("website");
    expect(runnerB.objectId).not.toContain("facebook");
    expect(runnerA.provenance.domain).toBe(OBJECT_IDENTITY_DOMAIN);
    expect(runnerB.provenance.domain).toBe(OBJECT_IDENTITY_DOMAIN);

    expectCorrectionSurvives("a/runner-A-vs-B", runnerA.objectId);
    expectCorrectionSurvives("a/runner-A-vs-B", runnerB.objectId);
  });

  test("condition (b): different process (fresh module state) mints the same id", async () => {
    jest.resetModules();
    const fresh = await import("../identity");
    const remintedId = fresh.businessIdForSource(
      fresh.canonicalSourceKey(SOURCE),
      ROLE
    );
    expect(remintedId).toBe(EXPECTED_ID);
    expectCorrectionSurvives("b/fresh-module-state", remintedId);
  });

  test("condition (c): different input ordering mints the same id set", () => {
    const observations = [
      { sourceUrl: SOURCE, schemaRole: ROLE, runnerLabel: "website", runId: "run-c1" },
      {
        sourceUrl: SOURCE,
        schemaRole: "service:drain-cleaning",
        runnerLabel: "website",
        runId: "run-c1",
      },
      {
        sourceUrl: SOURCE,
        schemaRole: "service:water-heaters",
        runnerLabel: "website",
        runId: "run-c1",
      },
    ];
    // Deterministic shuffle: reverse. No randomness anywhere in minting.
    const reversed = [...observations].reverse();
    const forwardIds = observations.map((o) => mintObservation(o).objectId);
    const reversedIds = reversed.map((o) => mintObservation(o).objectId);
    // Order changes sequence, not the set of ids.
    expect(new Set(reversedIds)).toEqual(new Set(forwardIds));
    // Sorted, the two runs agree exactly.
    expect([...reversedIds].sort()).toEqual([...forwardIds].sort());
    // The business root id is the same regardless of where it appeared.
    expect(forwardIds).toContain(EXPECTED_ID);
    expect(reversedIds).toContain(EXPECTED_ID);
    // Distinct schema roles from one source get distinct ids.
    expect(new Set(forwardIds).size).toBe(3);

    for (const id of reversedIds) {
      expect(typeof id).toBe("string");
    }
    expectCorrectionSurvives("c/shuffled-ordering", EXPECTED_ID);
  });

  test("condition (d): restart (all state cleared) mints the same id", () => {
    let journal = createIdentityJournal();
    const firstMint = journal.mint({
      sourceUrl: SOURCE,
      schemaRole: ROLE,
      runnerLabel: "website",
      runId: "run-d1",
    });
    expect(firstMint.observation.objectId).toBe(EXPECTED_ID);
    expect(firstMint.duplicate).toBe(false);

    // Restart: drop every trace of state, mint again from identical bytes.
    journal = createIdentityJournal();
    const secondMint = journal.mint({
      sourceUrl: SOURCE,
      schemaRole: ROLE,
      runnerLabel: "website",
      runId: "run-d2",
    });
    expect(secondMint.observation.objectId).toBe(EXPECTED_ID);
    expect(secondMint.duplicate).toBe(false);
    expect(journal.size()).toBe(1);

    expectCorrectionSurvives("d/restart", secondMint.observation.objectId);
  });

  test("condition (e): batch replay produces one id, zero duplicate records", () => {
    const journal = createIdentityJournal();
    const batch = [
      { sourceUrl: SOURCE, schemaRole: ROLE, runnerLabel: "website", runId: "run-e1" },
      { sourceUrl: SOURCE, schemaRole: ROLE, runnerLabel: "website", runId: "run-e1" },
    ];
    const firstMint = journal.mint(batch[0]);
    const replayMint = journal.mint(batch[1]);
    expect(firstMint.observation.objectId).toBe(EXPECTED_ID);
    expect(firstMint.duplicate).toBe(false);
    expect(replayMint.observation.objectId).toBe(EXPECTED_ID);
    expect(replayMint.duplicate).toBe(true);
    // One record stored, zero duplicate records.
    expect(journal.size()).toBe(1);
    expect(journal.objectIds()).toEqual([EXPECTED_ID]);

    expectCorrectionSurvives("e/batch-replay", replayMint.observation.objectId);
  });

  test("condition (f): regeneration from pinned source bytes yields the identical id", () => {
    // Pin the canonical source bytes, exactly as a journal would persist them.
    const pinnedSourceKey = canonicalSourceKey(SOURCE);
    expect(pinnedSourceKey).toBe(EXPECTED_KEY);

    // Regenerate later, from the pinned bytes alone: no journal, no runner.
    const regenerated = businessIdForSource(pinnedSourceKey, ROLE);
    expect(regenerated).toBe(EXPECTED_ID);

    // Regenerate from the raw source URL bytes: canonicalization converges.
    const regeneratedFromRaw = businessIdForSource(canonicalSourceKey(SOURCE), ROLE);
    expect(regeneratedFromRaw).toBe(EXPECTED_ID);

    expectCorrectionSurvives("f/regeneration", regenerated);
  });

  test("era separation: old-era ids are read-only fixtures, never reminted", () => {
    // Old-era fixture from the lane (fyd-build era): runner label baked in.
    const legacyId = "website-business-2f1327c09d622175";
    expect(idDomain(legacyId)).toBe("legacy:website-business");

    // New domain never emits the legacy prefix.
    expect(EXPECTED_ID.startsWith("biz-")).toBe(true);
    expect(EXPECTED_ID.startsWith("website-business-")).toBe(false);
    expect(idDomain(EXPECTED_ID)).toBe(OBJECT_IDENTITY_DOMAIN);

    // The legacy id is not reachable from new minting: same raw URL under
    // the new domain produces a different string, so eras never collide.
    expect(businessIdForSource(canonicalSourceKey(SOURCE), ROLE)).not.toBe(legacyId);
  });
});
