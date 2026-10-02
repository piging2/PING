/**
 * FYD-010 PRIVACY GATE (Worker P2): adversarial attacks on the
 * customer-facing projection path.
 *
 * Each attack targets one way private data could reach a public
 * render/response. Attacks that already hold are proven here with no
 * code change; attacks that leak were fixed falsify-first, one atomic
 * commit per invariant (see git log for the fix commits).
 *
 * Attack map:
 *  1. private object through the public projection -> must be excluded
 *  2. private evidence at the emission gate -> typed refusal
 *  3. owner HIDE intent -> enforced per-field at the boundary
 *     (pipeline wiring + decision converter live in
 *     privacy-gate-wiring.test.ts)
 *  4. owner-only correction text -> render-path file
 *     (react-renderer/test/privacy-gate-render.test.ts)
 *  5. provider token / secret-like value -> redacted/dropped at boundary
 *  6. cross-tenant reference -> privacy-gate-wiring.test.ts
 *  7. private Ask FYD context -> anonymous answers stay public-only
 */

import { askFyd } from "../../ask/src/answer";
import type { AskInput } from "../../ask/src/types";
import {
  BindingVerificationError,
  buildVerifiedRenderModel,
  verifyBinding,
} from "../src/binding-verifier";
import { generateSiteSpec } from "../src/generator";
import type { PresentationBinding } from "../src/graph";
import {
  buildVerifiedPublicProjection,
  type FieldVisibilityDecision,
} from "../src/projection";
import { buildSemanticRenderModel } from "../src/render-model";
import type { ObjectGraph } from "../src/types";
import type { PingObject, PingRelationship } from "../src/ping-types";

const T = "2026-10-02T12:00:00Z";
const NOW = "2026-10-02T13:00:00Z";
const GEN_AT = "2026-10-02T12:00:00Z";

const PHONE = "+13035550101";
const SECRET = "sk_live_abc123XYZ";
const GH_TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCD";

function bizObject(
  extraFields: Record<string, string | string[]> = {},
  description?: string,
): PingObject {
  return {
    id: "obj-biz-a",
    schema: "ping.social.business@1",
    controllerId: "tenant-a",
    visibility: "public",
    title: "Corner Bakery",
    description: description ?? "A neighborhood bakery in Grand Junction.",
    fields: {
      name: "Corner Bakery",
      phone: PHONE,
      address: "100 Main St, Grand Junction, CO",
      claimKind: "website_statement",
      ...extraFields,
    },
    createdAt: T,
    updatedAt: T,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://corner-bakery.example/",
      derivedAt: T,
    },
  };
}

function serviceObject(): PingObject {
  return {
    id: "obj-svc-sourdough",
    schema: "ping.social.service@1",
    controllerId: "tenant-a",
    visibility: "public",
    title: "Sourdough Loaves",
    description: "Baked fresh every morning.",
    fields: { name: "Sourdough Loaves", claimKind: "website_statement" },
    createdAt: T,
    updatedAt: T,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://corner-bakery.example/services",
      derivedAt: T,
    },
  };
}

function vaultObject(): PingObject {
  return {
    id: "obj-vault",
    schema: "ping.social.service@1",
    controllerId: "tenant-a",
    visibility: "private",
    title: "Secret Recipe Vault",
    description: "Internal recipe development, not for the public site.",
    fields: {
      name: "Secret Recipe Vault",
      internal_code: "VAULT-7",
      claimKind: "website_statement",
    },
    createdAt: T,
    updatedAt: T,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://corner-bakery.example/vault",
      derivedAt: T,
    },
  };
}

function offersRel(
  subject: string,
  object: string,
  id: string,
): PingRelationship {
  return {
    id,
    subject,
    predicate: "offers",
    object,
    status: "active",
    createdAt: T,
    evidenceRef: "website-ingestion:https://corner-bakery.example/#" + id,
  };
}

/** Public business + public service + private vault. */
function baseGraph(): ObjectGraph {
  return {
    objects: [bizObject(), serviceObject(), vaultObject()],
    relationships: [
      offersRel("obj-biz-a", "obj-svc-sourdough", "rel-offers-svc"),
      offersRel("obj-biz-a", "obj-vault", "rel-offers-vault"),
    ],
  };
}

describe("FYD-010 attack 1: private object through the public projection", () => {
  test("private objects are excluded from the verified public projection", () => {
    const p = buildVerifiedPublicProjection(baseGraph());
    const ids = p.graph.objects.map((o) => o.id);
    expect(ids).toContain("obj-biz-a");
    expect(ids).toContain("obj-svc-sourdough");
    expect(ids).not.toContain("obj-vault");
    const s = JSON.stringify(p.graph);
    expect(s).not.toContain("Secret Recipe Vault");
    expect(s).not.toContain("VAULT-7");
  });

  test("relationships touching a private object do not survive", () => {
    const p = buildVerifiedPublicProjection(baseGraph());
    const relIds = p.graph.relationships.map((r) => r.id);
    expect(relIds).toContain("rel-offers-svc");
    expect(relIds).not.toContain("rel-offers-vault");
  });

  test("private objects never reach the semantic render model", () => {
    const graph = baseGraph();
    const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
    const projection = buildVerifiedPublicProjection(graph);
    const model = buildSemanticRenderModel(spec, projection);
    const allIds = model.pages.flatMap((p) =>
      p.sections.flatMap((s) => s.objectIds),
    );
    expect(allIds).not.toContain("obj-vault");
  });
});

describe("FYD-010 attack 2: private evidence at the emission gate", () => {
  const vaultBinding: PresentationBinding = {
    objectId: "obj-vault",
    field: "title",
    classification: "direct",
  };

  test("verifyBinding refuses a binding for a private object", () => {
    const verdict = verifyBinding(vaultBinding, baseGraph(), [], { now: NOW });
    expect(verdict.status).toBe("UNBOUND");
    if (verdict.status === "UNBOUND") {
      expect(verdict.reason).toMatch(/non-public/i);
    }
  });

  test("verifyBinding refuses a binding for an internal object", () => {
    const graph = baseGraph();
    const internal = {
      ...vaultObject(),
      id: "obj-internal",
      visibility: "internal" as const,
    };
    graph.objects.push(internal);
    const verdict = verifyBinding(
      { objectId: "obj-internal", field: "title", classification: "direct" },
      graph,
      [],
      { now: NOW },
    );
    expect(verdict.status).toBe("UNBOUND");
  });

  test("the emission gate throws TYPED on private bindings: no atoms ship", () => {
    expect(() =>
      buildVerifiedRenderModel([vaultBinding], baseGraph(), [], {
        rendererVersion: "test@1",
        now: NOW,
      }),
    ).toThrow(BindingVerificationError);
  });

  test("atoms built over the public projection carry no private values", () => {
    const projection = buildVerifiedPublicProjection(baseGraph());
    const bindings: PresentationBinding[] = [
      { objectId: "obj-biz-a", field: "title", classification: "direct" },
    ];
    const m = buildVerifiedRenderModel(bindings, projection.graph, [], {
      rendererVersion: "test@1",
      now: NOW,
    });
    const s = JSON.stringify(m);
    expect(s).not.toContain("Secret Recipe Vault");
    expect(s).not.toContain("VAULT-7");
  });
});

describe("FYD-010 attack 3: owner HIDE intent at the boundary", () => {
  test("the projection enforces field-hiding decisions", () => {
    const graph = baseGraph();
    const decisions: FieldVisibilityDecision[] = [
      { objectId: "obj-biz-a", field: "phone", policy: "hidden" },
    ];
    const p = buildVerifiedPublicProjection(graph, { decisions });
    const biz = p.graph.objects.find((o) => o.id === "obj-biz-a");
    expect(biz).toBeDefined();
    expect(biz?.fields["phone"]).toBeUndefined();
    // Untouched fields survive.
    expect(biz?.fields["address"]).toBe("100 Main St, Grand Junction, CO");
    // The caller's graph is never mutated.
    expect(
      graph.objects.find((o) => o.id === "obj-biz-a")?.fields["phone"],
    ).toBe(PHONE);
  });

  test("an unknown decision policy fails closed (hidden)", () => {
    const decisions: FieldVisibilityDecision[] = [
      { objectId: "obj-biz-a", field: "phone", policy: "some-future-policy" },
    ];
    const p = buildVerifiedPublicProjection(baseGraph(), { decisions });
    expect(
      p.graph.objects.find((o) => o.id === "obj-biz-a")?.fields["phone"],
    ).toBeUndefined();
  });

  test("an explicit public decision leaves the field visible", () => {
    const decisions: FieldVisibilityDecision[] = [
      { objectId: "obj-biz-a", field: "phone", policy: "public" },
    ];
    const p = buildVerifiedPublicProjection(baseGraph(), { decisions });
    expect(
      p.graph.objects.find((o) => o.id === "obj-biz-a")?.fields["phone"],
    ).toBe(PHONE);
  });

  test("title and description hide to empty, never to a missing key", () => {
    const decisions: FieldVisibilityDecision[] = [
      { objectId: "obj-biz-a", field: "title", policy: "hidden" },
      { objectId: "obj-biz-a", field: "description", policy: "hidden" },
    ];
    const p = buildVerifiedPublicProjection(baseGraph(), { decisions });
    const biz = p.graph.objects.find((o) => o.id === "obj-biz-a");
    expect(biz?.title).toBe("");
    expect(biz?.description).toBe("");
  });

  test("decisions for unknown objects are ignored, never fatal", () => {
    const decisions: FieldVisibilityDecision[] = [
      { objectId: "obj-nope", field: "phone", policy: "hidden" },
    ];
    const p = buildVerifiedPublicProjection(baseGraph(), { decisions });
    expect(
      p.graph.objects.find((o) => o.id === "obj-biz-a")?.fields["phone"],
    ).toBe(PHONE);
  });

  test("hidden fields stay hidden through the render model path", () => {
    const graph = baseGraph();
    const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
    const decisions: FieldVisibilityDecision[] = [
      { objectId: "obj-biz-a", field: "phone", policy: "hidden" },
    ];
    const p = buildVerifiedPublicProjection(graph, { decisions });
    // The query seam resolves against the projected graph: the phone is
    // gone before any section can bind it.
    const s = JSON.stringify(p.graph);
    expect(s).not.toContain(PHONE);
    const model = buildSemanticRenderModel(spec, p);
    expect(model.checkpoint).toBe(p.provenance.checkpoint);
  });
});

describe("FYD-010 attack 5: provider token / secret-like values", () => {
  function secretGraph(): ObjectGraph {
    const b = bizObject(
      { stripe_secret_key: SECRET, api_token: GH_TOKEN },
      "A neighborhood bakery. Deploy token " + SECRET + " rotates monthly.",
    );
    return {
      objects: [b, serviceObject()],
      relationships: [offersRel("obj-biz-a", "obj-svc-sourdough", "rel-svc")],
    };
  }

  test("secret-named fields are dropped at the boundary", () => {
    const p = buildVerifiedPublicProjection(secretGraph());
    const fields =
      p.graph.objects.find((o) => o.id === "obj-biz-a")?.fields ?? {};
    expect(fields["stripe_secret_key"]).toBeUndefined();
    expect(fields["api_token"]).toBeUndefined();
    // Legitimate fields survive.
    expect(fields["phone"]).toBe(PHONE);
    expect(fields["address"]).toBe("100 Main St, Grand Junction, CO");
  });

  test("secret-shaped values in text are redacted, never rendered", () => {
    const p = buildVerifiedPublicProjection(secretGraph());
    const s = JSON.stringify(p.graph);
    expect(s).not.toContain("sk_live_");
    expect(s).not.toContain("ghp_");
    expect(s).toContain("[redacted]");
    const biz = p.graph.objects.find((o) => o.id === "obj-biz-a");
    expect(biz?.description).toContain("[redacted]");
  });

  test("the caller's graph is never mutated by sanitization", () => {
    const g = secretGraph();
    buildVerifiedPublicProjection(g);
    const fields =
      g.objects.find((o) => o.id === "obj-biz-a")?.fields ?? {};
    expect(fields["stripe_secret_key"]).toBe(SECRET);
  });
});

describe("FYD-010 attack 7: private Ask FYD context, anonymous viewer", () => {
  // packages/ask is read-only for this worker: this test PROVES the
  // boundary Worker A owns, it does not modify it.
  function askInput(): AskInput {
    return {
      targetObjectId: "obj-biz-a",
      graph: baseGraph() as unknown as AskInput["graph"],
      viewerContext: { viewerClass: "visitor", viewerId: null },
      question: "What services does Corner Bakery offer?",
    };
  }

  test("an anonymous answer never names private objects or their fields", () => {
    const answer = askFyd(askInput());
    // Sanity: the question is answerable, so this is not a vacuous refusal.
    expect(answer.refusal).toBe(false);
    const s = JSON.stringify(answer);
    expect(s).toContain("Sourdough Loaves");
    expect(s).not.toContain("Secret Recipe Vault");
    expect(s).not.toContain("VAULT-7");
  });

  test("asking about the private object itself fails closed", () => {
    const input = askInput();
    input.targetObjectId = "obj-vault";
    const answer = askFyd(input);
    expect(answer.refusal).toBe(true);
    expect(JSON.stringify(answer)).not.toContain("Secret Recipe Vault");
  });
});
