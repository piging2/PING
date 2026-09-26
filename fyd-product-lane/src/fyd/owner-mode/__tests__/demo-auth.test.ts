/**
 * Owner-mode demo-auth tests: the demo toggle is honestly labeled, is not
 * ownership proof, and consequential external capabilities stay disabled.
 *
 * Run with: npx jest --config src/fyd/owner-mode/jest.config.cjs
 */

import {
  DEMO_OWNER_ACTOR,
  evaluateAllCapabilities,
  evaluateCapability,
  listOwnerCapabilities,
  resolveDemoRelationship,
} from "../capability";
import { attest, preconditionsFor } from "../attestation-gate";
import { isDemoOwnerModeEnabled, isPrivateHost } from "../gate";

describe("demo actor honesty", () => {
  test("the seeded actor is labeled unverified, never an identity", () => {
    expect(DEMO_OWNER_ACTOR.id).toBe("demo-owner");
    expect(DEMO_OWNER_ACTOR.label).toMatch(/unverified/i);
  });

  test("the demo relationship states plainly that nothing was verified", () => {
    const rel = resolveDemoRelationship("happy-place", DEMO_OWNER_ACTOR);
    expect(rel.kind).toBe("controller");
    expect(rel.basis).toMatch(/No identity was verified/);
  });

  test("any other actor holds no demo relationship: a toggle is not ownership proof", () => {
    const rel = resolveDemoRelationship("happy-place", {
      id: "mallory",
      label: "Mallory",
    });
    expect(rel.kind).toBe("none");
    for (const c of listOwnerCapabilities()) {
      const v = evaluateCapability({ id: "mallory", label: "Mallory" }, rel, c);
      expect(v.allowed).toBe(false);
    }
  });
});

describe("capability boundaries", () => {
  test("publish stays denied even for the demo controller: no real-world effects", () => {
    const rel = resolveDemoRelationship("happy-place", DEMO_OWNER_ACTOR);
    const v = evaluateCapability(DEMO_OWNER_ACTOR, rel, "owner.publish");
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/no publish path|real-world effect/i);
  });

  test("customize approval carries the not-real-authentication marker in its reason", () => {
    const rel = resolveDemoRelationship("happy-place", DEMO_OWNER_ACTOR);
    const v = evaluateCapability(DEMO_OWNER_ACTOR, rel, "owner.customize-approve");
    expect(v.allowed).toBe(true);
    expect(v.reason).toContain("DEMO OWNER MODE - not real authentication");
  });

  test("deny is the default: every verdict names the rule that fired", () => {
    const rel = resolveDemoRelationship("happy-place", DEMO_OWNER_ACTOR);
    for (const v of evaluateAllCapabilities(DEMO_OWNER_ACTOR, rel)) {
      expect(v.reason.length).toBeGreaterThan(0);
      expect(v.reason).toMatch(/^demo: (allow|deny)/);
    }
  });
});

describe("demo gate", () => {
  const ENV = "NEXT_PUBLIC_FYD_DEMO_OWNER_MODE";
  const prev = process.env[ENV];

  afterEach(() => {
    if (prev === undefined) delete process.env[ENV];
    else process.env[ENV] = prev;
  });

  test("demo owner mode is opt-in only", () => {
    delete process.env[ENV];
    expect(isDemoOwnerModeEnabled()).toBe(false);
    process.env[ENV] = "1";
    expect(isDemoOwnerModeEnabled()).toBe(true);
    process.env[ENV] = "0";
    expect(isDemoOwnerModeEnabled()).toBe(false);
  });

  test("the demo network gate refuses public hosts", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("127.0.0.1:3000")).toBe(true);
    expect(isPrivateHost("192.168.1.10")).toBe(true);
    expect(isPrivateHost("100.79.154.43")).toBe(true);
    expect(isPrivateHost("example.com")).toBe(false);
    expect(isPrivateHost("8.8.8.8")).toBe(false);
  });
});

describe("attestation gate", () => {
  test("attestation rejects when evidence preconditions are missing", () => {
    const kind = "regen-complete";
    expect(preconditionsFor(kind).length).toBeGreaterThan(0);
    const r = attest(kind, {});
    expect(r.status).toBe("ATTESTATION_REJECTED");
    expect(r.reason).toMatch(/^missing_evidence:/);
    expect(r.attestation).toBeNull();
  });

  test("attestation succeeds only through verified preconditions", () => {
    const kind = "regen-complete";
    const evidence: Record<string, unknown> = {};
    for (const name of preconditionsFor(kind)) evidence[name] = "proof";
    let emitted = 0;
    const r = attest(kind, evidence, () => {
      emitted++;
    });
    expect(r.status).toBe("ATTESTED");
    expect(r.reason).toBeNull();
    expect(emitted).toBe(1);
  });
});
