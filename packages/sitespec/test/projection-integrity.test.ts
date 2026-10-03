/**
 * P0 #5 (Worker P2): corrupt projections must rebuild or fail TYPED,
 * never silently serve plausible-but-wrong state.
 *
 * buildSemanticRenderModel used to copy projection.provenance verbatim
 * without recomputing it: tampered content rode the honest
 * checkpoint/graphDigest and nothing threw. isVerifiedPublicProjection
 * existed but was called NOWHERE. The consumption boundary now
 * recomputes every digest over the actual content and fails TYPED on
 * any mismatch.
 */

import { generateSiteSpec } from "../src/generator";
import {
  assertProjectionIntegrity,
  buildVerifiedPublicProjection,
  isVerifiedPublicProjection,
  ProjectionIntegrityError,
} from "../src/projection";
import { buildSemanticRenderModel } from "../src/render-model";
import type { ObjectGraph } from "../src/types";
import type { PingObject, PingRelationship } from "../src/ping-types";

const T = "2026-10-02T12:00:00Z";
const GEN_AT = "2026-10-02T12:00:00Z";

function bizObject(): PingObject {
  return {
    id: "obj-biz-a",
    schema: "ping.social.business@1",
    controllerId: "tenant-a",
    visibility: "public",
    title: "Corner Bakery",
    description: "A neighborhood bakery in Grand Junction.",
    fields: {
      name: "Corner Bakery",
      phone: "+13035550101",
      claimKind: "website_statement",
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

function graph(): ObjectGraph {
  const rel: PingRelationship = {
    id: "rel-1",
    subject: "obj-biz-a",
    predicate: "offers",
    object: "obj-biz-a",
    status: "active",
    createdAt: T,
    evidenceRef: "website-ingestion:https://corner-bakery.example/#rel-1",
  };
  return { objects: [bizObject()], relationships: [rel] };
}

describe("P0 #5: corrupt projection fails TYPED at consumption", () => {
  test("an honest projection builds the render model (non-vacuous baseline)", () => {
    const g = graph();
    const spec = generateSiteSpec(g, { generatedAt: GEN_AT });
    const projection = buildVerifiedPublicProjection(g);
    expect(() => assertProjectionIntegrity(projection)).not.toThrow();
    const model = buildSemanticRenderModel(spec, projection);
    expect(model.checkpoint).toBe(projection.provenance.checkpoint);
  });

  test("tampered object content fails TYPED: no model ships", () => {
    const g = graph();
    const spec = generateSiteSpec(g, { generatedAt: GEN_AT });
    const projection = buildVerifiedPublicProjection(g);
    // Attack: rewrite a title after the boundary, keep the provenance.
    projection.graph.objects[0].title = "HACKED Bakery";
    expect(() => assertProjectionIntegrity(projection)).toThrow(
      ProjectionIntegrityError,
    );
    expect(() => buildSemanticRenderModel(spec, projection)).toThrow(
      ProjectionIntegrityError,
    );
  });

  test("tampered decisions fail TYPED", () => {
    const g = graph();
    const spec = generateSiteSpec(g, { generatedAt: GEN_AT });
    const projection = buildVerifiedPublicProjection(g);
    // Attack: smuggle a decision in without updating the digest.
    projection.decisions.push({
      objectId: "obj-biz-a",
      field: "phone",
      policy: "hidden",
    });
    expect(() => buildSemanticRenderModel(spec, projection)).toThrow(
      ProjectionIntegrityError,
    );
  });

  test("a swapped checkpoint fails TYPED", () => {
    const g = graph();
    const spec = generateSiteSpec(g, { generatedAt: GEN_AT });
    const projection = buildVerifiedPublicProjection(g);
    // Attack: transplant an honest-looking checkpoint from elsewhere.
    projection.provenance.checkpoint = "deadbeef:deadbeef";
    expect(() => buildSemanticRenderModel(spec, projection)).toThrow(
      ProjectionIntegrityError,
    );
  });

  test("a forged brand fails TYPED: isVerifiedPublicProjection is wired", () => {
    const g = graph();
    const spec = generateSiteSpec(g, { generatedAt: GEN_AT });
    const projection = buildVerifiedPublicProjection(g);
    const forged = {
      ...projection,
      kind: "piging2-public-projection@0",
    } as unknown as typeof projection;
    expect(isVerifiedPublicProjection(forged)).toBe(false);
    expect(isVerifiedPublicProjection(projection)).toBe(true);
    expect(() => buildSemanticRenderModel(spec, forged)).toThrow(
      ProjectionIntegrityError,
    );
  });
});
