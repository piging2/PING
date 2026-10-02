// SUITE 5 — route reduction (hostile).
// Attacks answerClassFor (the 5-class answer-level reduction) with REAL
// composer output -> REAL buildCitations -> REAL answerClassFor.
// The headline attack: demo content + website statement behind the SAME
// factual claim must not reduce to "SUPPORTED BY MULTIPLE EVIDENCE".
import { check, report, biz, svc } from "./harness.mts";
import * as C from "/tmp/fyd-attacker/composer.bundle.mjs";
import { buildCitations } from "/tmp/fyd-attacker-citations.mts";
import { answerClassFor } from "/tmp/fyd-attacker-extract-answerClassFor.mts";

const Q = "What services does this business offer, and how do you know?";

// Make parseConflictObservationRefId visible to the extracted buildCitations
// module scope (it references the bare identifier).

function ask(target: any, related: any[], fieldClasses: any = {}) {
  const ctx = (C as any).buildAskContext({
    viewer: { id: null, displayName: null },
    target, relatedObjects: related, relationships: [], plan: null, fieldClasses,
  });
  const ans = (C as any).composeAnswer(ctx, Q);
  const citations = (buildCitations as any)(
    ans.answer, ans.evidenceRefs, ans.claimClassifications, target, related, [],
  );
  const refusal = ans.partial && citations.length === 0;
  const answerClass = (answerClassFor as any)(refusal, citations, ans.claimClassifications);
  return { ans, citations, refusal, answerClass };
}

// R1 (THE ATTACK): website statement + DEMO content behind "Acme offers these
// services" must NOT reduce to SUPPORTED BY MULTIPLE EVIDENCE. One citation
// evidences "the site says so"; the other evidences "the operator demo-added
// it". Treating both as direct support for the business fact is an overclaim.
{
  const sWeb = svc("s1", "Drain cleaning", "website-ingestion", "website-ingestion:https://acme.example/");
  const sDemo = svc("s2", "Demo Deluxe Package", "overlay-authored", "overlay:demo-1");
  const t = biz("b1", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/");
  const { answerClass, citations } = ask(t, [sWeb, sDemo]);
  check(
    "R1-no-multiple-evidence-overclaim",
    answerClass !== "SUPPORTED BY MULTIPLE EVIDENCE",
    `answerClass="${answerClass}" with cites=${JSON.stringify(citations.map((c: any) => ({ n: c.n, claimClass: c.claimClass, basis: c.basis })))}`,
  );
}

// R2: two website-statement services behind the same claim -> multiple evidence OK.
{
  const s1 = svc("s1", "Drain cleaning", "website-ingestion", "website-ingestion:https://acme.example/");
  const s2 = svc("s2", "Water heaters", "website-ingestion", "website-ingestion:https://acme.example/");
  const t = biz("b2", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/");
  const { answerClass } = ask(t, [s1, s2]);
  check(
    "R2-homogeneous-multiple-evidence",
    answerClass === "SUPPORTED BY MULTIPLE EVIDENCE",
    `answerClass="${answerClass}" (two website-statement cites, same claim)`,
  );
}

// R3: refusal -> UNSUPPORTED, never a guessed class.
{
  const t = biz("b3", "Acme Plumbing", { phone: "555-0100" }, "website-ingestion", "website-ingestion:https://acme.example/");
  const { answerClass, refusal } = ask(t, []);
  check(
    "R3-refusal-unsupported",
    refusal === true && answerClass === "UNSUPPORTED",
    `refusal=${refusal} answerClass="${answerClass}"`,
  );
}

// R4: any DERIVED cite (generated copy) forces the whole answer DERIVED.
{
  const hero = svc("s9", "Lightning drain wizards!", "website-ingestion", "website-ingestion:https://acme.example/", {
    fields: { name: "Lightning drain wizards!", claimKind: "GENERATED_COPY" },
  });
  const sWeb = svc("s1", "Drain cleaning", "website-ingestion", "website-ingestion:https://acme.example/");
  const t = biz("b4", "Acme Plumbing", {}, "website-ingestion", "website-ingestion:https://acme.example/");
  const { answerClass, citations } = ask(t, [sWeb, hero]);
  const derived = citations.filter((c: any) => c.claimClass === "DERIVED").length;
  check(
    "R4-derived-poisons-answer",
    derived > 0 && answerClass === "DERIVED",
    `derived cites=${derived} answerClass="${answerClass}"`,
  );
}

// R5: conflict observation cite -> whole answer CONFLICTED (never resolved by picking).
{
  const t = biz("b5", "Acme Plumbing", { phone: "555-0100" }, "website-ingestion", "website-ingestion:https://acme.example/");
  const citations = [
    { id: "conflict-obs-1", claimClass: "SUPPORTED DIRECTLY" },
    { id: "x#phone", claimClass: "CONFLICTED" },
  ];
  const answerClass = (answerClassFor as any)(false, citations, []);
  check(
    "R5-conflict-wins",
    answerClass === "CONFLICTED",
    `answerClass="${answerClass}" with one CONFLICTED cite`,
  );
}

const fails = report("suite-route-reduction");
process.exit(fails > 0 ? 1 : 0);
