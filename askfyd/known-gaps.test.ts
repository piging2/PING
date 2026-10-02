/**
 * KNOWN PRODUCT GAPS — FALSIFICATION LEDGER.
 *
 * Convention: every test in this file documents ONE verified product gap.
 * Each gap has a stable AG-ID, a precise statement of current vs required
 * behavior, and the code location of the defect. The "required behavior"
 * assertions FAIL until the product is fixed; the "current behavior"
 * assertions PASS and lock in what the product does today so a change is
 * detected. A red run here is INFORMATION, not noise: it names the first
 * broken product boundary on the ASK FYD -> EVIDENCE path.
 *
 * FALSIFIABILITY QUESTIONNAIRE
 * WHAT INVARIANT? Per-gap required behavior (see each AG-ID).
 * WHO OWNS IT? The product modules named per gap; this file owns only the
 *   documentation and the repro.
 * HOW CAN IT FAIL? The gap gets fixed (required assertions go green ->
 *   move the gap to the green suite and close the AG-ID) or the current
 *   behavior changes silently (current-behavior assertions catch it).
 * WHAT ATTACK DISPROVES IT? The gold-set question + variant named per gap,
 *   run through the production deterministic path (baseline harness).
 * WHAT EVIDENCE PROVES IT? The failing assertion output plus the code
 *   reference; metrics/baseline-metrics.json rows for the question ids.
 * CAN IT BE REPLAYED? Yes: deterministic composer + fixed fixtures.
 * DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE? Yes: the AG-ID
 *   stays in the ledger even after the fix, with the fix SHA recorded.
 * WHY CAN EXISTING RUNNER + LIBRARY + EXISTING PING AUTHORITY NOT EXPRESS
 *   THIS? No existing suite drives the full production ask path against
 *   adversarial epistemic questions; the composer unit tests assert branch
 *   behavior, not the end-to-end epistemic contract.
 */
import { loadGoldSet, runGoldQuestion, scoreRun } from "./baseline";

function rec(id: string) {
  const r = loadGoldSet().find((x) => x.id === id);
  if (!r) throw new Error(`gold set record ${id} missing`);
  return r;
}

describe("KNOWN GAP AG-001: coverage-branch lexical gap", () => {
  // The asksCoverage branch (src/lib/ping/ask-composer.ts) is the
  // product's evidence-bound limitations answer for "what don't you know?"
  // questions. Its trigger regex requires the CONTIGUOUS string "do not":
  //   /don't|dont|do not|cannot|can't|will not/
  // "What do you NOT know about this business?" lowercases to
  // "what do you not know about this business?" -- "do you not know"
  // contains no contiguous "do not", so the branch never fires and the
  // question falls through to the profile branch, which answers with a
  // business blurb. The user asked for limitations; they got marketing copy.
  const record = rec("ASK-014");

  test("AG-001 current behavior: profile blurb, no limitations answer", () => {
    const run = runGoldQuestion(record);
    expect(run.answer.answer.startsWith("I cannot answer that")).toBe(false);
    // The answer is a profile dump (business name + description), not a
    // limitations answer: it names no covered/missing facet.
    expect(run.answer.answer).toMatch(/^Happy Place Carpentry LLC:/);
    expect(run.answer.answer).not.toMatch(/do not know|not (?:on|in) (?:the )?record|missing|coverage/i);
  });

  test("AG-001 REQUIRED: 'what do you NOT know' yields an evidence-bound limitations answer", () => {
    const run = runGoldQuestion(record);
    const score = scoreRun(record, run);
    // The answer must enumerate which facets the record covers and which
    // are absent (the asksCoverage contract), never a profile blurb.
    expect(run.answer.answer).toMatch(/do not know|not (?:on|in) (?:the )?record|missing/i);
    expect(score.forbiddenHits).toEqual([]);
  });
});

describe("KNOWN GAP AG-002: owner object-hide does not reach the Ask FYD answer path", () => {
  // applyFieldVisibility (src/fyd/sitespec/field-visibility.ts) drops
  // entries in object.fields[] only. The composer's services branch lists
  // services by the TOP-LEVEL object title, which no field decision
  // touches. The customize lane's hide_object intent
  // (src/fyd/customize/intent.ts) is presentation-layer: it toggles
  // sections/spec rendering, never the ask context. Net: an owner who
  // hides the Ventilation service still sees it listed by Ask FYD.
  // The only ask-layer object removal today is visibility="private"
  // (FYD-010), which conflates owner-hide with privacy-hide.
  const record = rec("ASK-030");

  test("AG-002 current behavior: hidden service still listed", () => {
    const run = runGoldQuestion(record);
    expect(run.answer.answer).toMatch(/Ventilation/);
  });

  test("AG-002 REQUIRED: owner-hidden service is absent from the services answer", () => {
    const run = runGoldQuestion(record);
    const score = scoreRun(record, run);
    expect(run.answer.answer).not.toMatch(/Ventilation/);
    expect(score.forbiddenHits).toEqual([]);
  });
});

describe("KNOWN GAP AG-003: branch-inconsistent conflict acknowledgment", () => {
  // FYD-Q1's locked copy ("Contact information is being verified.") fires
  // only for contact fields. For a conflicted NON-contact field the
  // behavior depends on which composer branch answers:
  //   - the asksCoverage branch (src/lib/ping/ask-composer.ts, coverage
  //     intents) describes conflicted facets as "being verified", never
  //     merely absent;
  //   - the direct hours branch answers "No hours are on record" -- absence
  //     stated as fact while the value is DISPUTED, not absent.
  // The user gets two different epistemic contracts for the same conflict
  // depending on question phrasing.
  const record = rec("ASK-018");

  test("AG-003 current behavior: conflicted hours reported as absent", () => {
    const run = runGoldQuestion(record);
    expect(run.answer.answer).toMatch(/no hours are on record/i);
    expect(run.answer.answer).not.toMatch(/being verified|unresolved|conflict/i);
  });

  test("AG-003 REQUIRED: conflicted facet described as being verified, never merely absent", () => {
    const run = runGoldQuestion(record);
    const score = scoreRun(record, run);
    expect(run.answer.answer).toMatch(/being verified|unresolved|conflict/i);
    expect(run.answer.answer).not.toMatch(/no hours are on record/i);
    expect(score.forbiddenHits).toEqual([]);
  });
});

describe("KNOWN GAP AG-004: conflict suppression is field-literal, not semantic-fact-wide", () => {
  // suppressConflictedFields (src/fyd/ask/field-conflicts.ts) drops the
  // named field on the named object. The address fact lives in two places:
  // the location object's address_locality AND the business object's
  // locality field ("Grand Junction, Colorado, 81501, United States").
  // The conflict names only the location field, so the composer states
  // the disputed fact from the business field. FYD-Q2's hide path has the
  // address-family treatment (isAddressFamilyField); the FYD-Q1 conflict
  // path does not. Detection (which spellings a disagreement covers)
  // belongs to the observing lane, but suppression has no defense in depth.
  const record = rec("ASK-020");

  test("AG-004 current behavior: disputed address stated via the business locality field", () => {
    const run = runGoldQuestion(record);
    expect(run.answer.answer).toMatch(/Grand Junction, Colorado, 81501, United States/);
    expect(run.answer.answer).not.toMatch(/being verified|unresolved|conflict/i);
  });

  test("AG-004 REQUIRED: address fact withheld while any spelling is under unresolved conflict", () => {
    const run = runGoldQuestion(record);
    const score = scoreRun(record, run);
    expect(run.answer.answer).not.toMatch(/Grand Junction/);
    expect(score.forbiddenHits).toEqual([]);
  });
});
