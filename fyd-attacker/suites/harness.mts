// FYD customer-journey attacker lane: shared hostile harness.
// Each check returns { id, verdict: "PASS"|"FAIL", evidence }.
// Exit code = number of FAILs. No worker chatter: verdicts + evidence only.

export interface Check {
  id: string;
  verdict: "PASS" | "FAIL";
  evidence: string;
}

const checks: Check[] = [];

export function check(id: string, cond: boolean, evidence: string): void {
  checks.push({ id, verdict: cond ? "PASS" : "FAIL", evidence });
}

export function markers(answer: string): number[] {
  const out: number[] = [];
  const re = /\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    const n = Number(m[1]);
    if (!out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

export function report(suiteName: string): number {
  console.log(`\n### ${suiteName}`);
  let fails = 0;
  for (const c of checks) {
    if (c.verdict === "FAIL") fails++;
    console.log(`[${c.verdict}] ${c.id}`);
    console.log(`    evidence: ${c.evidence}`);
  }
  console.log(`-- ${suiteName}: ${checks.length - fails}/${checks.length} PASS`);
  return fails;
}

export function biz(
  id: string,
  title: string,
  fields: Record<string, string | string[]>,
  provKind: string,
  provRef: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    schema: "ping.social.business@1",
    title,
    description: "",
    fields,
    provenance: { kind: provKind, ref: provRef, derivedAt: "2026-09-27" },
    updatedAt: "2026-09-27",
    ...extra,
  };
}

export function svc(
  id: string,
  title: string,
  provKind: string,
  provRef: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    schema: "ping.social.service@1",
    title,
    description: "",
    fields: { name: title },
    provenance: { kind: provKind, ref: provRef, derivedAt: "2026-09-27" },
    updatedAt: "2026-09-27",
    ...extra,
  };
}
