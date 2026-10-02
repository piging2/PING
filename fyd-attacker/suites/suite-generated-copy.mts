// SUITE 4 — generated-copy end-to-end (hostile).
// Invariant: FACTUAL CLAIM != GENERATED COPY.
// Generated marketing copy must stay classified as GENERATED COPY (via honest
// basis text + DERIVED class), never silently becoming evidence, and per-citation
// epistemic bases must survive the composer -> citation reduction.
// Uses the composer bundle + the verbatim pure functions from visitor-answer.ts.
import { check, markers, report, biz, svc } from "./harness.mts";
import * as C from "/tmp/fyd-attacker/composer.bundle.mjs";
import {
  claimClassFor,
  basisForClassification,
} from "/tmp/fyd-attacker-extract-claimClassFor-answerStateFor-basisForClassification.mts";

const Q = "What services does this business offer, and how do you know?";

// G1: overlay-authored (demo) service -> DEMO_SYNTHETIC in composer, honest
// basis at the customer layer, never "recorded fact".
{
  const sDemo = svc("s9", "Demo Deluxe Package", "overlay-authored", "overlay:demo-1");
  const ctx = (C as any).buildAskContext({
    viewer: { id: null, displayName: null },
    target: biz("b9", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/"),
    relatedObjects: [sDemo], relationships: [], plan: null, fieldClasses: {},
  });
  const ans = (C as any).composeAnswer(ctx, Q);
  const demoCls = (ans.claimClassifications as any[]).find((c) =>
    (c.evidenceRefIds as string[]).includes("s9"),
  );
  const customerClass = (claimClassFor as any)(demoCls?.classification);
  const basis = (basisForClassification as any)(demoCls?.classification);
  check(
    "G1-demo-keeps-demo-basis",
    demoCls?.classification === "DEMO_SYNTHETIC" &&
      /not the website's own words/.test(basis) &&
      !/recorded fact/i.test(basis.replace("not a recorded fact", "").replace("not the website's own words, not a recorded fact", "")),
    `composer=${demoCls?.classification} customer=${customerClass} basis="${basis}"`,
  );
}

// G2: a field carrying claimKind GENERATED_COPY -> DERIVED at customer layer,
// basis says "not verified fact", never SUPPORTED DIRECTLY.
{
  const hero = svc("s10", "Lightning-fast drain wizards!", "website-ingestion", "website-ingestion:https://acme.example/", {
    fields: { name: "Lightning-fast drain wizards!", claimKind: "GENERATED_COPY" },
  });
  const ctx = (C as any).buildAskContext({
    viewer: { id: null, displayName: null },
    target: biz("b10", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/"),
    relatedObjects: [hero], relationships: [], plan: null, fieldClasses: {},
  });
  const ans = (C as any).composeAnswer(ctx, Q);
  const genCls = (ans.claimClassifications as any[]).find((c) =>
    (c.evidenceRefIds as string[]).includes("s10"),
  );
  const customerClass = (claimClassFor as any)(genCls?.classification);
  check(
    "G2-generated-copy-never-evidence",
    genCls?.classification === "GENERATED_COPY" &&
      customerClass === "DERIVED" &&
      customerClass !== "SUPPORTED DIRECTLY" &&
      /not verified fact/.test((basisForClassification as any)("GENERATED_COPY")),
    `composer=${genCls?.classification} customer=${customerClass}`,
  );
}

// G3: mixed website_statement + DEMO_SYNTHETIC behind the SAME claim — each
// citation must keep its own class through the reduction (no basis laundering).
{
  const sWeb = svc("s11", "Drain cleaning", "website-ingestion", "website-ingestion:https://acme.example/");
  const sDemo = svc("s12", "Demo Deluxe Package", "overlay-authored", "overlay:demo-2");
  const ctx = (C as any).buildAskContext({
    viewer: { id: null, displayName: null },
    target: biz("b11", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/"),
    relatedObjects: [sWeb, sDemo], relationships: [], plan: null, fieldClasses: {},
  });
  const ans = (C as any).composeAnswer(ctx, Q);
  const classes = new Map<string, string>();
  for (const c of ans.claimClassifications as any[])
    for (const id of c.evidenceRefIds as string[]) classes.set(id, c.classification);
  const customerClasses = [...classes.entries()].map(([id, cl]) => `${id}:${(claimClassFor as any)(cl)}`);
  check(
    "G3-mixed-bases-survive",
    classes.get("s11") === "website_statement" && classes.get("s12") === "DEMO_SYNTHETIC",
    `composer classes=${JSON.stringify([...classes.entries()])}; customer classes=${JSON.stringify(customerClasses)} ` +
      `(route-layer risk: both map to SUPPORTED DIRECTLY -> "SUPPORTED BY MULTIPLE EVIDENCE" overclaim needs live test)`,
  );
}

// G4: fieldClasses (pipeline FactClass vocabulary) override provenance —
// a pipeline-marked INFERENCE must surface as DERIVED, not direct.
{
  const sWeb = svc("s13", "Drain cleaning", "canonical-journal", "journal:evt-1");
  const ctx = (C as any).buildAskContext({
    viewer: { id: null, displayName: null },
    target: biz("b12", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/"),
    relatedObjects: [sWeb], relationships: [], plan: null,
    fieldClasses: { s13: { name: "INFERENCE" } },
  });
  const ans = (C as any).composeAnswer(ctx, Q);
  const infCls = (ans.claimClassifications as any[]).find((c) =>
    (c.evidenceRefIds as string[]).includes("s13"),
  );
  check(
    "G4-pipeline-inference-surfaces",
    infCls?.classification === "INFERENCE" && (claimClassFor as any)("INFERENCE") === "DERIVED",
    `fieldClasses INFERENCE -> composer=${infCls?.classification} -> customer=${(claimClassFor as any)(infCls?.classification)}`,
  );
}

const fails = report("suite-generated-copy");
process.exit(fails > 0 ? 1 : 0);
