/**
 * FYD-010 PRIVACY GATE, render path (Worker P2).
 *
 * The presentation adapter renders ONLY from the verified public
 * projection: these tests prove, end to end (graph -> spec ->
 * projection -> render model -> facts -> static HTML), that private
 * content never reaches the HTML.
 *
 * Attack map (render-path half):
 *  1. private object -> never in HTML
 *  3. owner HIDE intent -> hidden field gone from HTML
 *  4. owner-only correction text -> correction internals never surface
 *  5. provider token / secret-like value -> never in HTML or facts
 */

import {
  applyCorrections,
  assertCorrection,
} from "../../owner/src/corrections";
import { demoProvenance } from "../../owner/src/provenance";
import { generateSiteSpec } from "../../sitespec/src/generator";
import {
  buildVerifiedPublicProjection,
  type FieldVisibilityDecision,
} from "../../sitespec/src/projection";
import { buildSemanticRenderModel } from "../../sitespec/src/render-model";
import type { ObjectGraph } from "../../sitespec/src/types";
import type { PingObject, PingRelationship } from "../../sitespec/src/ping-types";
import { factsFromProjection, type FactsById } from "../src/facts";
import { renderModelToStaticHtml } from "../src/render";

const T = "2026-10-02T12:00:00Z";
const GEN_AT = "2026-10-02T12:00:00Z";
const PHONE = "+13035550101";
const OWNER_PHONE = "+13035550999";
const SECRET = "sk_live_abc123XYZ";

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
      email: "hello@corner-bakery.example",
      website: "https://corner-bakery.example/",
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

function baseGraph(): ObjectGraph {
  return {
    objects: [bizObject(), vaultObject()],
    relationships: [offersRel("obj-biz-a", "obj-vault", "rel-offers-vault")],
  };
}

/** Full public path: graph -> spec -> projection -> model -> facts -> HTML. */
function renderPublic(
  graph: ObjectGraph,
  decisions: FieldVisibilityDecision[] = [],
): { html: string; facts: FactsById } {
  const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
  const projection = buildVerifiedPublicProjection(graph, { decisions });
  const model = buildSemanticRenderModel(spec, projection);
  const facts = factsFromProjection(projection);
  return { html: renderModelToStaticHtml(model, facts), facts };
}

describe("FYD-010 render path, attack 1: private object", () => {
  test("private object content never reaches the HTML", () => {
    const { html } = renderPublic(baseGraph());
    expect(html).not.toContain("Secret Recipe Vault");
    expect(html).not.toContain("VAULT-7");
  });
});

describe("FYD-010 render path, attack 3: owner HIDE intent", () => {
  test("the phone renders without a HIDE (non-vacuous baseline)", () => {
    const { html } = renderPublic(baseGraph());
    expect(html).toContain(PHONE);
  });

  test("a HIDE decision removes the phone from the HTML", () => {
    const { html } = renderPublic(baseGraph(), [
      { objectId: "obj-biz-a", field: "phone", policy: "hidden" },
    ]);
    expect(html).not.toContain(PHONE);
  });
});

describe("FYD-010 render path, attack 4: owner-only correction text", () => {
  test("correction internals never surface in HTML or facts", () => {
    const correction = assertCorrection({
      factRef: { objectId: "obj-biz-a", field: "phone" },
      op: "CORRECT",
      value: OWNER_PHONE,
      provenance: demoProvenance(null, () => T),
      sourceValueSeen: PHONE,
    });
    const corrected = applyCorrections(baseGraph(), [correction]);
    const { html, facts } = renderPublic(corrected.graph);
    // The corrected value is public by design (the owner published it).
    expect(facts["obj-biz-a"].fields["phone"]).toBe(OWNER_PHONE);
    // But the correction's internal records never surface publicly.
    expect(html).not.toContain("oa-");
    expect(html).not.toContain("demo-owner");
    expect(html).not.toContain("the owner asserts");
    expect(JSON.stringify(facts)).not.toContain("oa-");
    expect(JSON.stringify(facts)).not.toContain("demo-owner");
  });
});

describe("FYD-010 render path, attack 5: secret-like values", () => {
  function secretGraph(): ObjectGraph {
    return {
      objects: [
        bizObject(
          { stripe_secret_key: SECRET },
          "A neighborhood bakery. Deploy token " + SECRET + " rotates monthly.",
        ),
      ],
      relationships: [],
    };
  }

  test("secret field and secret in description never reach HTML or facts", () => {
    const { html, facts } = renderPublic(secretGraph());
    expect(html).not.toContain("sk_live_");
    expect(html).not.toContain(SECRET);
    const fields = facts["obj-biz-a"].fields;
    expect(fields["stripe_secret_key"]).toBeUndefined();
    expect(JSON.stringify(facts)).not.toContain("sk_live_");
    // Legitimate contact facts still render.
    expect(html).toContain(PHONE);
  });
});
