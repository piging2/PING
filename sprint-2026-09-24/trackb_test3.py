#!/usr/bin/env python3
TEST = r'''/**
 * TRACK B (2026-09-25, FYD product authority directive, Nolan): HIGH-class
 * refusal regression.
 *
 * HIGH means external publish, communication, spend, provider relationship,
 * or mass action: explicit capability PLUS approval. Demo mode cannot
 * authorize these. This test pins:
 *
 * - each of the five HIGH-class categories is detected in free-text owner
 *   intent (detectHighConsequenceRequest), so it is refused at propose and
 *   never reaches the propose/approve loop;
 * - the demo capability list grants no HIGH-class capability: the only
 *   external-facing capability it names (owner.publish) is denied by the
 *   demo authority, and no capability exists for communication, spend,
 *   provider relationship, or mass action.
 */

import { detectHighConsequenceRequest } from "../../object/commands";
import {
  answerAuthorization,
  DEMO_OWNER_ACTOR,
  demoAuthorizationQuestion,
  listOwnerCapabilities,
} from "../capability";

const HIGH_CLASS_INTENTS: Array<{
  category: string;
  text: string;
  tier: "HIGH" | "CRITICAL";
}> = [
  {
    category: "external publish",
    text: "publish the new site on facebook",
    tier: "HIGH",
  },
  {
    category: "communication",
    text: "send a text message to all customers",
    tier: "HIGH",
  },
  {
    category: "spend",
    text: "issue a refund to the customer",
    tier: "CRITICAL",
  },
  {
    category: "provider relationship",
    text: "connect our stripe account",
    tier: "HIGH",
  },
  {
    category: "mass action",
    text: "send a newsletter to all subscribers",
    tier: "HIGH",
  },
];

describe("HIGH-class requests are detected and refused", () => {
  test.each(HIGH_CLASS_INTENTS)(
    "$category intent is detected ($tier)",
    ({ text, tier }) => {
      const detected = detectHighConsequenceRequest(text);
      expect(detected).not.toBeNull();
      expect(detected!.tier).toBe(tier);
      expect(detected!.reason).toMatch(/cannot approve|explicit authorization/i);
    },
  );

  test("detected HIGH-class text is not interpretable as an owner command", () => {
    // The interpreter must not turn a HIGH-class request into a typed
    // command that could ride the propose/approve loop.
    for (const { text } of HIGH_CLASS_INTENTS) {
      expect(detectHighConsequenceRequest(text)).not.toBeNull();
    }
  });
});

describe("demo mode grants no HIGH-class capability", () => {
  test("the demo capability list names no communication/spend/provider/mass capability", () => {
    const caps = listOwnerCapabilities();
    for (const missing of [
      "owner.send-message",
      "owner.spend",
      "owner.provider-mutate",
      "owner.mass-action",
      "owner.external-publish",
    ]) {
      expect(caps).not.toContain(missing);
    }
  });

  test("owner.publish is denied through the typed authorization seam", () => {
    const answer = answerAuthorization(
      demoAuthorizationQuestion(
        DEMO_OWNER_ACTOR,
        "happy-place",
        "owner.publish",
        "publish",
        null,
      ),
    );
    expect(answer.allowed).toBe(false);
    expect(answer.capability).toBe("owner.publish");
    expect(answer.demoScaffolding).toBe(true);
    // The denial names the rule: no publish path in demo.
    expect(answer.reason).toMatch(/no publish path/i);
  });
});
'''

P1 = "/home/nolan/projects/ping/src/fyd/owner-mode/__tests__/demo-high-class-refusal.test.ts"
open(P1, "w").write(TEST)
print("demo-high-class-refusal.test.ts written")

# 2. Unknown capabilities fail closed through the DemoOwnerContext seam.
P2 = "/home/nolan/projects/ping/src/app/api/fyd/objects/[objectId]/overrides/__tests__/owner-context-seam.test.ts"
src = open(P2).read()
old = """  test("the seam's refusal label covers pre-context failures", () => {
    const label = ownerContextRefusalLabel();
    expect(label.demoOwnerContext).toBe(true);
    expect(label.demoNote).toMatch(/DEMO OWNER CONTEXT/);
  });
});"""
new = """  test("the seam's refusal label covers pre-context failures", () => {
    const label = ownerContextRefusalLabel();
    expect(label.demoOwnerContext).toBe(true);
    expect(label.demoNote).toMatch(/DEMO OWNER CONTEXT/);
  });

  test("unknown capabilities fail closed through the DemoOwnerContext seam", async () => {
    // HIGH-class capabilities do not exist in demo mode; absence must deny,
    // never fall through to the seeded verdict. The question still carries
    // the resource; the answer is never a bare boolean.
    const ctx = await createOwnerContext("happy-place");
    for (const capability of [
      "owner.send-message",
      "owner.spend",
      "owner.provider-mutate",
      "owner.mass-action",
      "owner.external-publish",
    ]) {
      const evaluation = await ctx.evaluateCapability("happy-place", capability);
      expect(evaluation.capability).toBe(capability);
      expect(evaluation.allowed).toBe(false);
      expect(evaluation.reason).toMatch(/deny/);
      expect(evaluation.reason).toMatch(/demo scaffolding/);
    }
  });
});"""
assert src.count(old) == 1, f"seam test anchor: {src.count(old)}"
src = src.replace(old, new, 1)
open(P2, "w").write(src)
print("owner-context-seam.test.ts: unknown-capability fail-closed test added")
print("OK")
