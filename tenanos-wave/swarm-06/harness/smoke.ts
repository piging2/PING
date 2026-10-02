/**
 * SWARM-06 memory adversary harness (READ-ONLY).
 * Exercises the REAL deterministic answer composer used by the TenantOS
 * memory read path: src/lib/ping/ask-composer.ts (buildAskContext +
 * composeAnswer), with synthetic fixtures only. Never touches real memory
 * stores, never writes, never exfiltrates.
 *
 * Run on the Pig: node_modules/.bin/tsx --tsconfig <repo>/tsconfig.json harness/attack.ts
 */
import {
  buildAskContext,
  composeAnswer,
} from "/home/nolan/projects/ping/src/lib/ping/ask-composer";
import type { PingObject, AskContext } from "/home/nolan/projects/ping/src/lib/ping/types";

export function makeObject(over: Partial<PingObject> = {}): PingObject {
  return {
    id: "obj:synthetic-1",
    schema: "ping.social.business@1",
    controllerId: "id:synthetic-owner",
    visibility: "public",
    title: "Synthetic Plumbing Co",
    description: "Synthetic fixture business.",
    fields: {},
    createdAt: "2024-01-05T10:00:00.000Z",
    updatedAt: "2024-01-05T10:00:00.000Z",
    provenance: { kind: "canonical-journal", ref: "evt:synthetic-1", derivedAt: "2024-01-05T10:00:00.000Z" },
    ...over,
  };
}

export function askFixture(target: PingObject | null, related: PingObject[] = [], question: string) {
  const ctx: AskContext = buildAskContext({
    viewer: { id: "id:viewer", displayName: "Viewer" },
    target,
    relatedObjects: related,
    relationships: [],
    plan: null,
  });
  const answer = composeAnswer(ctx, question);
  return { answer, ctx };
}

function verdictOf(answerText: string): string {
  const t = answerText.toLowerCase();
  if (/conflict|contradict|disagree|source says|owner says/i.test(answerText)) return "CONFLICTED";
  if (/i do not have evidence|no .* on record|will not guess|unknown/i.test(answerText)) return "UNKNOWN";
  if (/outdated|stale|old record|as of /i.test(answerText)) return "STALE";
  return "KNOWN";
}

export function runCase(name: string, target: PingObject | null, related: PingObject[], question: string) {
  const { answer } = askFixture(target, related, question);
  console.log(`\n===== ${name} =====`);
  console.log(`Q: ${question}`);
  console.log(`OBSERVED VERDICT: ${verdictOf(answer.answer)}`);
  console.log(`ANSWER:\n${answer.answer}`);
  console.log(`CLASSIFICATIONS: ${JSON.stringify(answer.claimClassifications.map((c) => c.classification))}`);
  console.log(`PARTIAL: ${answer.partial}`);
}

// Smoke: one known-good case to prove the real composer is under test.
runCase(
  "SMOKE profile",
  makeObject({ fields: { services: "drain cleaning" } }),
  [],
  "What services do you offer?",
);
