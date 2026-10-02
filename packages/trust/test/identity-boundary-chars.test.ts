/**
 * ADVERSARIAL (Worker E, hunt 3): canonicalization at the identity boundary.
 *
 * Coordinate-by-avoidance with Worker C, who owns the Unicode policy
 * (decision C). This file does NOT assert NFC/NFD equivalence policy; it
 * pins the boundary behaviors this worker hunts, as they stand:
 *
 * - zero-width chars: NOT rejected by the identity boundary and NOT
 *   removed by NFC. "cafe" and "cafe\u200b" mint DIFFERENT identities
 *   that render identically. This is the residual spoofing surface:
 *   invisible characters are byte-distinct identities. Flagged as the
 *   open policy question for Worker C (strip Cf-format chars at the
 *   identity boundary, or document the risk).
 * - whitespace: REJECTED (assertIdPart throws). Correct.
 * - case: "Cafe" vs "cafe" mint different ids. Correct: case can be
 *   semantically meaningful, and the contract folds nothing.
 * - URL trailing slash: "https://example.com" vs "https://example.com/"
 *   yield different evidence ids. Correct: the byte distinction can
 *   denote a different resource; normalization would be lossy.
 */
import { deriveObjectId, websiteObjectId } from "../../objects/src/identity";
import { factIdFor } from "../../owner/src/provenance";
import { deriveEvidence } from "../../sitespec/src/evidence";
import type { ObjectGraph } from "../../sitespec/src/types";
import type { PingObject } from "../../sitespec/src/ping-types";

const ZWSP = "caf\u00e9\u200b";
const CLEAN = "caf\u00e9";

function tinyGraph(provenanceRef: string): ObjectGraph {
  const obj: PingObject = {
    id: "web:service:probe",
    schema: "ping.social.service@1",
    controllerId: "identity_test",
    visibility: "public",
    title: "Probe",
    description: "",
    fields: {},
    createdAt: "2026-10-02T00:00:00Z",
    updatedAt: "2026-10-02T00:00:00Z",
    provenance: {
      kind: "website-derived",
      ref: provenanceRef,
      derivedAt: "2026-10-02T00:00:00Z",
    },
  };
  return { objects: [obj], relationships: [] };
}

describe("identity boundary: invisible and confusable characters", () => {
  test("zero-width space mints a distinct, visually-identical identity (OPEN POLICY QUESTION)", () => {
    const clean = deriveObjectId("website", CLEAN);
    const zwsp = deriveObjectId("website", ZWSP);
    // They LOOK the same but they are NOT the same key.
    expect(zwsp).not.toBe(clean);
    expect(ZWSP.normalize("NFC")).not.toBe(CLEAN);
    // Documented, not fixed here: NFC does not strip U+200B, and the
    // identity boundary does not reject it. Worker C owns whether the
    // boundary should strip Cf-format characters.
  });

  test("zero-width chars reach fact ids too", () => {
    expect(factIdFor("web:service:x", "title\u200b")).not.toBe(
      factIdFor("web:service:x", "title"),
    );
  });

  test("whitespace in identity parts is rejected", () => {
    expect(() => deriveObjectId("website", "has space")).toThrow();
    expect(() => deriveObjectId("website", "has\ttab")).toThrow();
    expect(() => websiteObjectId("service", "trailing ")).toThrow();
  });

  test("colons are rejected in web: ids (the scheme splits on ':')", () => {
    expect(() => websiteObjectId("serv:ice", "x")).toThrow();
  });

  test("case is meaningful: 'Cafe' and 'cafe' are different identities", () => {
    expect(deriveObjectId("website", "Cafe")).not.toBe(
      deriveObjectId("website", "cafe"),
    );
  });

  test("URL trailing slash is meaningful: different evidence ids", () => {
    const a = deriveEvidence(tinyGraph("https://example.com"), "live-fetch");
    const b = deriveEvidence(tinyGraph("https://example.com/"), "live-fetch");
    const idsA = a.records.map((r) => r.evidenceId);
    const idsB = b.records.map((r) => r.evidenceId);
    expect(idsA).not.toEqual(idsB);
  });
});
