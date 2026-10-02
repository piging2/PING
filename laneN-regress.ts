import {
  assertSpecBindingsVerified,
  buildVerifiedRenderModel,
  classifyRenderAtom,
  ownerAssertionsFromGraph,
  verifyBinding,
  verifySpecBindings,
  type OwnerAssertion,
} from "./src/fyd/sitespec/binding-verifier";
import type { PresentationBinding } from "./src/fyd/sitespec/graph";
import type { ObjectGraph } from "./src/fyd/sitespec/types";
import type { PingObject } from "./src/lib/ping/types";
import { makeObject, tradeGraph } from "./src/fyd/builder/__tests__/fixtures";

const GRAPH = tradeGraph();
const NOW = "2026-09-25T16:30:00.000Z";
const OPTS = { now: NOW };

function bind(
  objectId: string,
  field: string,
  classification: PresentationBinding["classification"],
  extra?: Partial<PresentationBinding>,
): PresentationBinding {
  return { objectId, field, classification, ...(extra ?? {}) };
}

function graphWithOwnerCorrection(): ObjectGraph {
  const owner = GRAPH.objects.find((o) => o.id === "biz-trade");
  if (!owner) throw new Error("fixture has no owner object");
  const corrected: PingObject = {
    ...owner,
    fields: { ...owner.fields, phone: "555-0199" },
    ownerFieldCorrections: [
      {
        field: "phone",
        label: "Phone",
        sourceValue: "555-0100",
        ownerValue: "555-0199",
        correctedAt: "2026-09-20T00:00:00.000Z",
        actorLabel: "Demo Owner (seeded, unverified)",
        basis: "Owner correction: the owner says this is the main number.",
        sourceDrifted: false,
      },
    ],
  };
  return {
    objects: GRAPH.objects.map((o) => (o.id === "biz-trade" ? corrected : o)),
    relationships: GRAPH.relationships,
  };
}

// R1: the existing (a)-case still fully binds
{
  const corrected = graphWithOwnerCorrection();
  const assertions = ownerAssertionsFromGraph(corrected);
  const bindings: PresentationBinding[] = [
    bind("biz-trade", "title", "direct"),
    bind("biz-trade", "phone", "direct"),
    bind("svc-drains", "description", "derived"),
    bind("biz-trade", "title", "generated", { generatorRef: "tagline-writer@1" }),
    bind("biz-trade", "phone", "owner_authored"),
  ];
  const report = verifySpecBindings(bindings, corrected, assertions, OPTS);
  const sources = report.bound.map((v) => v.source).sort();
  const want = ["evidence-ref", "generated-presentation", "object-field", "owner-assertion", "owner-assertion"];
  console.log("R1 allBound:", report.allBound, "sources:", JSON.stringify(sources), "match:", JSON.stringify(sources) === JSON.stringify(want));
}

// R2: fabrications still UNBOUND
{
  const ghost = makeObject("ghost-biz", "ping.social.business@1", {
    title: "Ghost Co",
    provenance: { kind: "website-derived", ref: "", derivedAt: "2026-09-21T00:00:00.000Z" },
  });
  const graph: ObjectGraph = { objects: [...GRAPH.objects, ghost], relationships: GRAPH.relationships };
  const assertions = ownerAssertionsFromGraph(graph);
  const fabricated: PresentationBinding[] = [
    bind("biz-trade", "founded", "direct"),
    bind("does-not-exist", "title", "direct"),
    bind("ghost-biz", "title", "direct"),
    bind("biz-trade", "phone", "owner_authored"),
    bind("biz-trade", "title", "generated"),
  ];
  const reasons = fabricated.map((b) => verifyBinding(b, graph, assertions, OPTS));
  console.log("R2 all UNBOUND:", reasons.every((v) => v.status === "UNBOUND"));
}

// R3: fresh direct atom carries kind, still DIRECT_EVIDENCE
{
  const a = classifyRenderAtom(bind("biz-trade", "title", "direct"), GRAPH, [], OPTS);
  console.log("R3:", a.classification, "kind:", (a as any).provenanceKind, "ref:", a.evidenceRef);
}

// R4: determinism with pinned now
{
  const bindings = [bind("biz-trade", "title", "direct"), bind("svc-drains", "description", "derived")];
  const m1 = buildVerifiedRenderModel(bindings, GRAPH, [], { rendererVersion: "test@1", now: NOW });
  const m2 = buildVerifiedRenderModel(bindings, GRAPH, [], { rendererVersion: "test@1", now: NOW });
  console.log("R4 digest stable:", m1.digest === m2.digest, "atoms:", m1.atoms.length);
}

// R5: D2 seam - suppressConflictedFields still withholds; constant exported
async function main() {
  {
    const { suppressConflictedFields, CONFLICT_BEING_VERIFIED_COPY, isUnresolvedConflict } =
      await import("./src/fyd/ask/field-conflicts");
    const conflict = {
      objectId: "biz-trade",
      field: "phone",
      status: "unresolved" as const,
      observations: [
        { value: "555-0100", provenanceKind: "website-ingestion", provenanceRef: "website-ingestion:https://example.com/" },
        { value: "555-0199", provenanceKind: "owner-correction", provenanceRef: "ping-event:ev-1" },
      ],
    };
    const suppressed = suppressConflictedFields(GRAPH, [conflict]);
    const biz = suppressed.objects.find((o) => o.id === "biz-trade");
    const phoneWithheld = biz && !("phone" in (biz.fields as Record<string, unknown>));
    console.log("R5 phone withheld:", phoneWithheld, "copy:", JSON.stringify(CONFLICT_BEING_VERIFIED_COPY), "isUnresolved:", isUnresolvedConflict(conflict));
  }

  // R6: compilePublicSite integration (real projection + bundle reads)
  {
    const { compilePublicSite } = await import("./src/app/sites/_shared/spec-pipeline");
    const compiled = await compilePublicSite("happy-place");
    console.log(
      "R6 compiled: renderable=",
      compiled.renderable,
      "withheld=",
      JSON.stringify(compiled.withheldConflictedFields),
      "specPages=",
      compiled.spec.pages.length,
    );
  }
}

main().catch((e) => { console.error("REGRESS FAIL:", e); process.exit(1); });
