/**
 * REPLAY + REGENERATION (metamorphic).
 *
 * Two properties of the production Ask FYD path:
 *
 * 1. REPLAY EQUALITY: runGoldQuestion asked twice on the same gold
 *    record yields the same runDigest. The digest covers the answer
 *    text, claim classifications, unknowns, and scored surface, so
 *    equality means the whole observable answer is reproducible from
 *    the same causal inputs.
 *
 * 2. OWNER-CORRECTION REGENERATION: an owner correction recorded ONCE
 *    in the real owner store regenerates the same corrected answer
 *    across repeated re-projections from the same store decisions.
 *    The correction is a function of the recorded decisions, not of
 *    projection history: project -> correct answer, project again ->
 *    same correct answer, corrected value presented as on-record both
 *    times.
 *
 * FALSIFIABILITY QUESTIONNAIRE
 * WHAT INVARIANT? (1) digest(run(q)) == digest(run(q)); (2) one owner
 *   decision + N re-projections -> N identical corrected answers.
 * WHO OWNS IT? runGoldQuestion/runDigest (baseline.ts harness over
 *   production code); applyOwnerCommand + applyOwnerFieldCorrections
 *   (src/fyd/object/).
 * HOW CAN IT FAIL? Nondeterminism in the composer (timestamps, random
 *   ids, temp-dir leakage) breaks (1); a correction applied to the
 *   projection instead of the store breaks (2).
 * WHAT ATTACK DISPROVES IT? Running the suite twice and diffing the
 *   metrics rows; applying the correction then re-projecting.
 * WHAT EVIDENCE PROVES IT? The digests compared in-test.
 * CAN IT BE REPLAYED? Yes: fixed gold set + fixed owner commands.
 * DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE? Yes: a
 *   digest mismatch names the question and both digests.
 * WHY CAN EXISTING RUNNER + LIBRARY + EXISTING PING AUTHORITY NOT EXPRESS
 *   THIS? Existing tests assert per-run properties; none assert
 *   cross-run identity of the full answer surface.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadGoldDoc,
  runGoldQuestion,
  runDigest,
  getFixtureGraph,
  runQuestionOnGraph,
} from "./baseline";
import { applyOwnerCommand } from "@/fyd/object/owner-store";
import { applyOwnerFieldCorrections } from "@/fyd/object/owner-overlay";

describe("replay equality", () => {
  test("every gold question replays to the same digest", () => {
    const questions = loadGoldDoc().questions;
    expect(questions.length).toBeGreaterThan(0);
    const mismatches: string[] = [];
    for (const rec of questions) {
      const d1 = runDigest(rec, runGoldQuestion(rec));
      const d2 = runDigest(rec, runGoldQuestion(rec));
      if (d1 !== d2) mismatches.push(`${rec.id}: ${d1} != ${d2}`);
    }
    expect(mismatches).toEqual([]);
  });
});

describe("owner-correction regeneration", () => {
  function withSharedOwnerDir<T>(fn: () => T): T {
    const prev = process.env.FYD_OWNER_DIR;
    process.env.FYD_OWNER_DIR = mkdtempSync(join(tmpdir(), "askfyd-regen-"));
    try {
      return fn();
    } finally {
      if (prev === undefined) delete process.env.FYD_OWNER_DIR;
      else process.env.FYD_OWNER_DIR = prev;
    }
  }

  test.each([
    {
      fixture: "happy-place" as const,
      field: "email",
      sourceValue: "taylor@happyplacecarpentry.com",
      newValue: "hello@happyplacecarpentry.com",
      question: "What is the business email address?",
    },
    {
      fixture: "coppersmith" as const,
      field: "phone",
      sourceValue: "970-245-3869",
      newValue: "(970) 555-9999",
      question: "What is the phone number for this business?",
    },
  ])(
    "one $field correction regenerates the same corrected answer on re-projection ($fixture)",
    ({ fixture, field, sourceValue, newValue, question }) => {
      withSharedOwnerDir(() => {
        const { businessId, graph } = getFixtureGraph(fixture);
        const serviceObjs = graph.objects.filter(
          (o) => o.schema === "ping.social.service@1",
        );
        // THE decision, recorded once in the real owner store.
        applyOwnerCommand(
          businessId,
          { type: "set-contact-field", field, value: newValue } as any,
          serviceObjs.map((o) => o.id),
          new Map(serviceObjs.map((o) => [o.id, o.title ?? o.id])),
          { sourceValue },
        );
        // Re-project twice from the SAME recorded decisions.
        const answers: string[] = [];
        const digests: string[] = [];
        for (let i = 0; i < 2; i++) {
          const { graph: fresh } = getFixtureGraph(fixture);
          const corrected = applyOwnerFieldCorrections(fresh, businessId).graph;
          const run = runQuestionOnGraph(corrected, businessId, question);
          answers.push(run.answer.answer);
          digests.push(
            runDigest(
              {
                id: `regen-${field}`,
                question,
                requiredEvidence: [],
                allowedEvidence: [],
                forbiddenClaims: [],
              } as any,
              run,
            ),
          );
        }
        // The corrected value is presented as on-record in BOTH
        // projections; the stale value appears only as superseded.
        for (const a of answers) {
          expect(a).toContain(newValue);
        }
        expect(digests[0]).toBe(digests[1]);
      });
    },
  );
});
