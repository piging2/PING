import {
  answerAskFyd,
  type AnswerAskFydDeps,
} from "../../../../../fyd/ask/visitor-answer";
import { getSiteBundle } from "../../../../../fyd/media/site-bundle";

const DEPS: AnswerAskFydDeps = { loadBundle: getSiteBundle };

test("debug", () => {
  for (const [siteId, objectId, q] of [
    ["happy-place", "website-business-6fa5ebd99d72c4cb", "how do you know?"],
    ["coppersmith-plumbing", "website-business-2f1327c09d622175", "how do you know?"],
    ["happy-place", "website-service-51de038c1defe8bd", "Tell me about this service."],
  ] as const) {
    const out = answerAskFyd({ siteId, objectId, question: q, mode: "visitor" }, DEPS);
    console.log("=== " + siteId + " / " + (objectId ?? "site") + " / " + q);
    if (!out.ok) {
      console.log("NOT OK: " + JSON.stringify(out.error));
      continue;
    }
    console.log("refusal=" + out.refusal);
    console.log("answer=" + JSON.stringify(out.answer));
    console.log("citations=" + JSON.stringify(out.citations.map((c) => c.id)));
  }
});
