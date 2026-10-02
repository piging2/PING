/**
 * failure-classes — the real failure classes harvested from PING history,
 * each bound to the primitive that gates it permanently.
 *
 * Pipeline every class travels: FAILURE -> EVIDENCE -> CLASSIFICATION ->
 * REPRODUCTION -> FIX -> REGRESSION TEST -> FAILURE LIBRARY (this file).
 * A class is only "in the library" when a regression test in __tests__/
 * exercises the gate and the record below names that test.
 */

export type PipelineStage =
  | 'FAILURE'
  | 'EVIDENCE'
  | 'CLASSIFICATION'
  | 'REPRODUCTION'
  | 'FIX'
  | 'REGRESSION_TEST'
  | 'FAILURE_LIBRARY';

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  'FAILURE',
  'EVIDENCE',
  'CLASSIFICATION',
  'REPRODUCTION',
  'FIX',
  'REGRESSION_TEST',
  'FAILURE_LIBRARY',
] as const;

export interface FailureClassRecord {
  id: string;
  /** One-line statement of the failure. */
  failure: string;
  /** Where the evidence lives (files, pass ids, ledger entries). */
  evidence: string[];
  /** FAILURE_LEDGER.md classification vocabulary. */
  classification: string;
  /** How to reproduce: commands/files/inputs. */
  reproduction: string[];
  /** The fix shape (mechanism, not just code). */
  fix: string;
  /** The regression test in this library that gates it, permanently. */
  regressionTest: string;
  /** Which primitive enforces the gate. */
  gatedBy: 'kill-mid-effect' | 'checkpoint-resume' | 'claim-race' | 'lease' | 'idempotency' | 'outcome-taxonomy';
}

export function recordFailureClass(r: FailureClassRecord): FailureClassRecord {
  const required: (keyof FailureClassRecord)[] = [
    'id',
    'failure',
    'evidence',
    'classification',
    'reproduction',
    'fix',
    'regressionTest',
    'gatedBy',
  ];
  for (const k of required) {
    const v = r[k];
    if (v === undefined || v === null || (Array.isArray(v) && v.length === 0) || v === '') {
      throw new Error(`recordFailureClass: field ${k} is required (record ${r.id || '<no id>'})`);
    }
  }
  return Object.freeze({ ...r, evidence: Object.freeze([...r.evidence]), reproduction: Object.freeze([...r.reproduction]) }) as FailureClassRecord;
}

/** FAILURE_LEDGER.md-compatible markdown for one record. */
export function toLedgerMarkdown(r: FailureClassRecord): string {
  return [
    `### ${r.id}: ${r.failure}`,
    '',
    `- classification: ${r.classification}`,
    `- evidence:`,
    ...r.evidence.map((e) => `  - ${e}`),
    `- reproduction:`,
    ...r.reproduction.map((x) => `  - ${x}`),
    `- fix: ${r.fix}`,
    `- regression test: ${r.regressionTest} (gate: ${r.gatedBy})`,
    `- pipeline: ${PIPELINE_STAGES.join(' -> ')}`,
    `- status: GATED (regression test must stay green)`,
    '',
  ].join('\n');
}

export const FAILURE_CLASSES: readonly FailureClassRecord[] = [
  recordFailureClass({
    id: 'FC-20260923-001',
    failure: 'Tool performs effect, then the connection dies before the response arrives: outcome UNKNOWN, not failure',
    evidence: [
      'PING production history: worker effect landed, ack lost, retry double-executed',
      'lane_c_failure_injection.js P4: emit returns ok while mission derivation died mid-create',
      '~/workspace/FAILURE_LEDGER.md doctrine: never auto-retry UNKNOWN_EXECUTION',
    ],
    classification: 'TEMPORARY_FAILURE with UNKNOWN outcome (never SUCCESS_EMPTY, never TERMINAL_FAILURE)',
    reproduction: [
      'kill-mid-effect: fork child, kill with SIGKILL inside the uninterruptible commit window',
      'probe returns UNVERIFIABLE (no durable receipt readable)',
      'assert verdict.outcome === OUTCOME_UNKNOWN',
    ],
    fix: 'Idempotency key survives the death (IN_FLIGHT on disk); reconcile with a real probe before any retry; never re-run blindly, never claim success.',
    regressionTest: '__tests__/kill-mid-effect.test.ts > kill inside the commit window yields OUTCOME_UNKNOWN',
    gatedBy: 'kill-mid-effect',
  }),
  recordFailureClass({
    id: 'FC-20260923-002',
    failure: 'Host sleep destroys a live browser/automation target mid-effect',
    evidence: [
      'Pig host sleep destroyed browser targets mid-run (AGENTS.md antifragile directive history)',
      'Pig power policy 2026-09-23: sleep on AC disabled while acting as automation host',
    ],
    classification: 'DEPENDENCY_FAILURE (host) surfacing as UNKNOWN work outcome',
    reproduction: [
      'kill-mid-effect with SIGKILL at a random point (afterMs trigger)',
      're-probe external state; classify honestly; never fabricate the outcome',
    ],
    fix: 'Treat host death as a kill: re-probe, classify SUCCEEDED/FAILED/OUTCOME_UNKNOWN, resume from checkpoint only after revalidation.',
    regressionTest: '__tests__/kill-mid-effect.test.ts > SIGKILL at arbitrary point never fabricates an outcome',
    gatedBy: 'kill-mid-effect',
  }),
  recordFailureClass({
    id: 'FC-20260923-003',
    failure: 'Stale narrative overrides canonical state on resume',
    evidence: [
      '~/workspace/lane-c-event-mission-recovery-gap.md: no cursor/receipt on event->mission path; restart replays nothing, orphans persist',
      'AGENTS.md send-eligibility precedence: structured state > notes; notes never resurrect completed sequences',
    ],
    classification: 'ENUMERATION_FAILURE (stale read presented as current)',
    reproduction: [
      'checkpoint-resume: save seq 1, save seq 2, call resumeFrom(1)',
      'assert StaleCheckpointError with requestedSeq=1, latestSeq=2',
    ],
    fix: 'Monotonic seq on every checkpoint; resume of a non-latest seq throws; only latest() after revalidate() may restore state.',
    regressionTest: '__tests__/checkpoint-resume.test.ts > resumeFrom(stale seq) throws StaleCheckpointError',
    gatedBy: 'checkpoint-resume',
  }),
  recordFailureClass({
    id: 'FC-20260923-004',
    failure: 'Checkpoint acked but not durable: restart sees nothing, work silently skipped',
    evidence: [
      'lane-c gap P1/P3: commit visible, derivation invisible after restart; no durable receipt anywhere',
      'EventToMissionBridge stats are session-scoped (in-memory only)',
    ],
    classification: 'DEPENDENCY_FAILURE (durability)',
    reproduction: [
      'checkpoint-resume: hold state in memory only (never call save), construct a new store (restart)',
      'assert latest() === null and resume() === null: the consumer must re-execute',
    ],
    fix: 'Durability = atomic rename completed (tmp + fsync + rename). A checkpoint exists only after save() returns. Restart-visibility is the proof.',
    regressionTest: '__tests__/checkpoint-resume.test.ts > ack-before-durable is invisible after restart',
    gatedBy: 'checkpoint-resume',
  }),
  recordFailureClass({
    id: 'FC-20260923-005',
    failure: 'Result lost after effect: work completed but the result never recorded',
    evidence: [
      'lane_c_failure_injection.js P4: effect attempted, mission absent, emit still returned ok',
      'ORCA recovery decisions: result verification failed -> escalate, never fabricate',
    ],
    classification: 'TEMPORARY_FAILURE (result path) / UNKNOWN outcome',
    reproduction: [
      'idempotency: execute key, kill before COMPLETED write is durable',
      'new store instance sees IN_FLIGHT; reconcile with probe',
    ],
    fix: 'Idempotency record carries the result once COMPLETED; IN_FLIGHT keys reconcile via probe; resumed work replays the recorded result instead of re-executing.',
    regressionTest: '__tests__/idempotency.test.ts > completed key replays recorded result without re-executing',
    gatedBy: 'idempotency',
  }),
  recordFailureClass({
    id: 'FC-20260923-006',
    failure: 'Two workers claim the same packet',
    evidence: [
      'TenantOS wave swarm 09 (task claiming) and swarm 20 (autonomy gauntlet) need exactly-one-winner semantics',
      'ORCA work_order_id idempotency: re-issue same taskId with attempt+1',
    ],
    classification: 'ENUMERATION_FAILURE (duplicate ownership)',
    reproduction: [
      'claim-race: fork 8 real processes racing one unit via O_EXCL',
      'assert exactly one winner; all losers get ClaimDenied naming the holder',
    ],
    fix: 'Atomic O_EXCL claim; holder recorded in the claim file; same-worker re-claim idempotent.',
    regressionTest: '__tests__/claim-race.test.ts > 8 real processes race one unit: exactly one winner',
    gatedBy: 'claim-race',
  }),
  recordFailureClass({
    id: 'FC-20260923-007',
    failure: 'Lease expires mid-work: a second worker reclaims while the first still believes it holds the unit',
    evidence: [
      'ORCA recovery_decisions.js: mission leases, reapExpiredLeases, renewLease are the existing mechanisms',
      'PING history: lease expiry without preemption record -> double execution',
    ],
    classification: 'TEMPORARY_FAILURE (lease) with double-execution risk',
    reproduction: [
      'lease: acquire with 200ms TTL, sleep past expiry, reclaim as second worker',
      'assert reclaim succeeds only after provable expiry; preemption recorded',
    ],
    fix: 'Reclaim allowed only when now() >= expiresAt; preemption recorded for the displaced worker; active leases never stolen (LeaseActiveError).',
    regressionTest: '__tests__/lease.test.ts > reclaim before expiry throws LeaseActiveError; after expiry succeeds',
    gatedBy: 'lease',
  }),
  recordFailureClass({
    id: 'FC-20260923-008',
    failure: 'Approval reused for different arguments',
    evidence: [
      'Task brief: approval reused for different arguments is a known failure class',
      'AGENTS.md credential rules: a [credential:<uuid>] reference may be passed unchanged only for the intended step; never reused across steps',
    ],
    classification: 'AUTH_FAILURE (scope violation)',
    reproduction: [
      'idempotency: deriveKey(namespace, argsA) vs deriveKey(namespace, argsB)',
      'assert different keys; executing under keyA never satisfies keyB',
    ],
    fix: 'Idempotency key = sha256(namespace + canonical args). An approval binds its exact arguments; different args are a different key, never a replay.',
    regressionTest: '__tests__/idempotency.test.ts > different arguments derive different keys',
    gatedBy: 'idempotency',
  }),
  recordFailureClass({
    id: 'FC-20260923-009',
    failure: 'Fixture drift creates misleading tests: the harness passes against a world that no longer exists',
    evidence: [
      'Task brief: fixture drift is a known failure class',
      'lane-c gap: /events/unprocessed reads the retired repository_events table — a drifted fixture that looks like a recovery path',
    ],
    classification: 'ENUMERATION_FAILURE (stale fixture)',
    reproduction: [
      'checkpoint-resume with revalidate(): external marker deleted after checkpoint saved',
      'assert resume() throws RevalidationFailedError instead of restoring the drifted state',
    ],
    fix: 'Every resume revalidates against the live external world; revalidation failure is loud, never silent. Tests assert against live probes, never canned fixtures alone.',
    regressionTest: '__tests__/checkpoint-resume.test.ts > resume fails loudly when external state diverged',
    gatedBy: 'checkpoint-resume',
  }),
  recordFailureClass({
    id: 'FC-20260923-010',
    failure: 'Dirty worktree contaminates browser proof: evidence captured against the wrong tree state',
    evidence: [
      'lane-c gap: worktree was verified clean at test time before failure injection',
      'FYD mobile static-scroll fix: wrong surface (local candidate vs Pig-hosted site) misdiagnosed as unchanged',
    ],
    classification: 'SURFACE_DRIFT (proof contamination)',
    reproduction: [
      'kill-lib tests record childPath, exitSignal, and ipc trail in every verdict evidence list',
      'verdicts are only valid for the exact run they describe; evidence is never reused across runs',
    ],
    fix: 'Every verdict carries its own evidence (kill delivery, signal, ipc seen). Proofs are per-run and non-transferable; the library never caches a verdict.',
    regressionTest: '__tests__/outcome-taxonomy.test.ts > every verdict carries non-empty per-run evidence',
    gatedBy: 'outcome-taxonomy',
  }),
];
