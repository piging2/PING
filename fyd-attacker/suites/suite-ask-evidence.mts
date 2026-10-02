// SUITE 1 — ask-fyd-evidence (hostile).
// Target: the proof question "What services does this business offer, and how do you know?"
// Invariants under attack:
//   - refusal when ungrounded (no invented services)
//   - every factual sentence cited AND classified (no orphan citations)
//   - per-service epistemic basis preserved (no basis laundering)
//   - "how do you know" provenance branch cites the target's own record
// Source under test: vendored lane-p01/tree (STALE RISK: re-run vs Pig HEAD on restore).
import { check, markers, report, biz, svc } from "./harness.mts";
import * as C from "/tmp/fyd-attacker/composer.bundle.mjs";

const Q = "What services does this business offer, and how do you know?";

function ctxFor(target: any, related: any[] = [], fieldClasses: any = {}) {
  return (C as any).buildAskContext({
    viewer: { id: null, displayName: null },
    target,
    relatedObjects: related,
    relationships: [],
    plan: null,
    fieldClasses,
  });
}

// F1: no services anywhere -> honest refusal, no citations, unknowns recorded.
{
  const ctx = ctxFor(biz("b1", "Acme Plumbing", { phone: "555-0100" }, "website-ingestion", "website-ingestion:https://acme.example/"));
  const ans = (C as any).composeAnswer(ctx, Q);
  check(
    "F1-refusal-ungrounded",
    ans.partial === true &&
      /I do not have evidence for that in the current context, so I will not guess/.test(ans.answer) &&
      markers(ans.answer).length === 0 &&
      ans.unknowns.includes("services offered by this business"),
    `partial=${ans.partial} markers=${JSON.stringify(markers(ans.answer))} unknowns=${JSON.stringify(ans.unknowns)}`,
  );
}

// F2: services FIELD as raw string, website provenance -> cited, website_statement basis.
{
  const ctx = ctxFor(
    biz("b2", "Acme Plumbing", { services: "drains, water heaters" }, "website-ingestion", "website-ingestion:https://acme.example/"),
  );
  const ans = (C as any).composeAnswer(ctx, Q);
  const ms = markers(ans.answer);
  const cls = ans.claimClassifications;
  check(
    "F2-services-field-cited-classified",
    ms.length > 0 &&
      cls.length > 0 &&
      cls.every((c: any) => typeof c.classification === "string" && c.classification.length > 0) &&
      cls.some((c: any) => c.classification === "website_statement"),
    `markers=${JSON.stringify(ms)} classifications=${JSON.stringify(cls.map((c: any) => c.classification))} answer=${JSON.stringify(ans.answer.slice(0, 120))}`,
  );
  check(
    "F2-no-invention",
    /drains, water heaters/.test(ans.answer) && !/remodel/.test(ans.answer),
    `answer contains only the recorded value: ${JSON.stringify(ans.answer.slice(0, 160))}`,
  );
}

// F3: mixed-provenance service objects -> each keeps its own epistemic basis.
{
  const sWeb = svc("s1", "Drain cleaning", "website-ingestion", "website-ingestion:https://acme.example/");
  const sJrnl = svc("s2", "Water heater install", "canonical-journal", "journal:evt-99");
  const sDemo = svc("s3", "Demo Deluxe Package", "overlay-authored", "overlay:demo-1");
  const ctx = ctxFor(
    biz("b3", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/"),
    [sWeb, sJrnl, sDemo],
  );
  const ans = (C as any).composeAnswer(ctx, Q);
  const byService = new Map<string, string>();
  for (const c of ans.claimClassifications as any[]) {
    for (const id of c.evidenceRefIds as string[]) byService.set(id, c.classification);
  }
  check(
    "F3-basis-not-laundered",
    byService.get("s1") === "website_statement" &&
      byService.get("s2") === "DIRECT_FACT" &&
      byService.get("s3") === "DEMO_SYNTHETIC",
    `per-service classes=${JSON.stringify([...byService.entries()])}`,
  );
  check(
    "F3-demo-not-recorded-fact",
    ![...byService.values()].includes("DIRECT_FACT") || byService.get("s3") !== "DIRECT_FACT",
    `demo service s3 classified as ${byService.get("s3")}, never DIRECT_FACT`,
  );
}

// F4: named topic with no match ("financing") must NOT dump unrelated offerings.
{
  const sWeb = svc("s1", "Drain cleaning", "website-ingestion", "website-ingestion:https://acme.example/");
  const ctx = ctxFor(
    biz("b4", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/"),
    [sWeb],
  );
  const ans = (C as any).composeAnswer(ctx, "Do you offer financing?");
  check(
    "F4-ungrounded-topic-no-dump",
    !/Services on record/.test(ans.answer) &&
      !/Related offerings/.test(ans.answer) &&
      ans.partial === true &&
      /I do not have evidence/.test(ans.answer),
    `partial=${ans.partial} no services listing dumped; consulted-refs list may name the service object: ${JSON.stringify(ans.answer.slice(0, 200))}`,
  );
}

// F5: business name in the question is identity, not a service topic.
{
  const ctx = ctxFor(biz("b5", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/"));
  const ans = (C as any).composeAnswer(ctx, "What services does Acme Plumbing offer?");
  check(
    "F5-name-not-topic",
    /I do not have evidence/.test(ans.answer) && ans.partial === true,
    `no service invented from the business name: partial=${ans.partial}`,
  );
}

// F6: every [n] marker resolves to an evidenceRef AND a classification entry.
{
  const sWeb = svc("s1", "Drain cleaning", "website-ingestion", "website-ingestion:https://acme.example/");
  const ctx = ctxFor(
    biz("b6", "Acme Plumbing", { phone: "555-0100" }, "website-ingestion", "website-ingestion:https://acme.example/"),
    [sWeb],
  );
  const ans = (C as any).composeAnswer(ctx, Q);
  const ms = markers(ans.answer);
  let orphan = false;
  for (const n of ms) {
    const ref = (ans.evidenceRefs as any[])[n - 1];
    const cls = (ans.claimClassifications as any[]).find((c) => (c.evidenceRefIds as string[]).includes(ref?.id));
    if (!ref || !cls) orphan = true;
  }
  check(
    "F6-no-orphan-citations",
    ms.length > 0 && !orphan,
    `markers=${JSON.stringify(ms)} all resolve to a ref with a classification`,
  );
}

// F7: "how do you know" provenance branch states basis from the target's own record.
{
  const ctx = ctxFor(
    biz("b7", "Acme Plumbing", {}, "overlay-authored", "overlay:demo-9"),
  );
  const ans = (C as any).composeAnswer(ctx, "How do you know this?");
  check(
    "F7-provenance-branch-honest",
    /demo content added by the site operator/.test(ans.answer),
    `basis sentence: ${JSON.stringify(ans.answer.slice(0, 220))}`,
  );
}

// F8: description prose is NEVER parsed as a services claim.
{
  const ctx = ctxFor(
    biz("b8", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/",
      { description: "We do drains, water heaters, and remodels." } as any),
  );
  const t = ctx.target as any;
  t.description = "We do drains, water heaters, and remodels.";
  const ans = (C as any).composeAnswer(ctx, "What services does this business offer?");
  check(
    "F8-description-not-services",
    /I do not have evidence/.test(ans.answer),
    `description prose not treated as service facts: partial=${ans.partial}`,
  );
}

const fails = report("suite-ask-evidence");
process.exit(fails > 0 ? 1 : 0);
