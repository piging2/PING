// Supplemental probes. Run on the Pig with: npx tsx /home/nolan/fyd-preview-staging/eval-supplement.ts
import { readFileSync } from "node:fs";
import {
  answerConciergeQuestion,
  conciergeInputFor,
  matchConciergeQuestion,
} from "/home/nolan/projects/ping/src/fyd/ask/concierge.ts";
import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts";

interface Obj { id: string; schema: string; visibility: string; title: string; fields: Record<string, unknown>; description?: string }
interface Rel { id: string; subject: string; object: string; predicate: string }
interface Graph { objects: Obj[]; relationships: Rel[] }

const hp = HAPPY_PLACE_GRAPH as unknown as Graph;
const target = hp.objects.find((o) => o.schema === "ping.social.business@1")!;

// Probe C: a PRIVATE service linked by a provides relationship. Does the
// concierge surface it when asked the canonical services question?
const privateSvc: Obj = {
  id: "private-svc-secret",
  schema: "ping.social.service@1",
  visibility: "private",
  title: "Secret Owner-Only Tuneup",
  fields: { name: "Secret Owner-Only Tuneup", description: "Not for the public site." },
};
const rel: Rel = { id: "rel-private-provides", subject: target.id, object: privateSvc.id, predicate: "provides" };
const mixed: Graph = {
  objects: [...hp.objects, privateSvc],
  relationships: [...hp.relationships, rel],
};
const q1 = "What services do they offer?";
console.log("PROBE C: private service + provides relationship, Q:", q1);
console.log("MATCH:", matchConciergeQuestion(q1));
const a1 = answerConciergeQuestion(conciergeInputFor("happy-place", target as never, mixed.objects as never, mixed.relationships as never, q1));
console.log("--- answer text ---");
console.log(a1!.text);
console.log("LEAKED_PRIVATE_SERVICE:", a1!.text.includes("Secret Owner-Only Tuneup") ? "YES" : "NO");

// Probe D: canonical services question on the plain public graph (control)
const pub = { objects: hp.objects.filter((o) => o.visibility === "public"), relationships: hp.relationships };
const a2 = answerConciergeQuestion(conciergeInputFor("happy-place", target as never, pub.objects as never, pub.relationships as never, q1));
console.log("\nPROBE D: control, canonical services question on public graph");
console.log("--- answer text ---");
console.log(a2!.text);

// Probe E: coppersmith who question (INFERRED username reading per the patch doc)
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts";
const cs = COPPERSMITH_GRAPH as unknown as Graph;
const csTarget = cs.objects.find((o) => o.schema === "ping.social.business@1")!;
const q3 = "Who works here?";
console.log("\nPROBE E: coppersmith, Q:", q3, " MATCH:", matchConciergeQuestion(q3));
const a3 = answerConciergeQuestion(conciergeInputFor("coppersmith-plumbing", csTarget as never, cs.objects as never, cs.relationships as never, q3));
console.log("--- answer text ---");
console.log(a3!.text);
