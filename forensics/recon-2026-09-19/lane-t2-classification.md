# LANE-T (second pass) - Temporal Classification

**Date:** 2026-09-18 MDT (files land in recon-2026-09-19 dir) · **Mode:** strictly read-only, no mutations performed.
**Basis:** re-verified key claims of lane-t-temporal-audit.md live on the Pig WSL (no blind trust). Git observational only.

## Classification: DORMANT

Temporal is declared infrastructure plus non-executable code. It is not in the effective runtime. It was never in the effective runtime (zero executed workflows, no workers ever observed, SDK never installed).

| Dimension | Evidence (re-verified 2026-09-18) |
|---|---|
| Server reachable | `ping-temporal-dev` container (temporalio/temporal, server 1.32.0), up ~26h since 2026-09-17 17:48 MDT, listening 127.0.0.1:7233. Reachable. |
| Workflows registered / executed | `temporal workflow count --namespace default` = **Total: 0**. Only namespace is `default`. Zero workflows of any type have ever executed on this server instance. |
| Polling workers running | None. No node/temporal worker processes on the Pig. No task-queue pollers observed. No task queue identity exists anywhere (nothing ever registered a queue). |
| SDK installed | Declared in `gateway/package.json` lines 26-28 (`@temporalio/{activity,client,worker} ^1.8.0`). `find /home/nolan/ping` for `@temporalio` install: **absent everywhere**. Every `require('@temporalio/...')` throws MODULE_NOT_FOUND today. |
| Code refs in live runtime | `docker logs ping-gateway` grep for "temporal": **0 matches**. The deployed gateway never touches Temporal. |
| Effective durability engine | The PING-side `MissionScheduler` 5s polling loop is LIVE (gateway logs: "Mission Scheduler started" twice). It owns lease renewal, lease reaping, retry/backoff, dead-letter routing. |

Supporting code facts (re-verified): `gateway/temporal_workflows.js` (referenced by the dead worker config) **does not exist**; `'ConstitutionalWorkflow'` is scheduled by `gateway/temporal_scheduler_provider.js:45` but **defined nowhere**; the only files requiring `@temporalio` are `ping-runtime/temporal/workflows/mission_workflow.js` (workflow source, no runner) and `gateway/temporal_runtime.js` (+ one stale worktree copy).

Why not the other options: **REQUIRED** fails because removing the container changes nothing in the live path. **OPTIONAL** fails because nothing is usable today (no SDK, no workers, no queue, no definitions); there is no working capability to opt into. **LEGACY** fails because it was never live (zero executions, no earlier-instance evidence). **CONFLICTING** fails as a classification of Temporal itself, but the conflict hazard is real on the PING side: MissionScheduler is the live durability authority and would double-dispatch against a Temporal path unless converged. BullMQ adapter remains declared but unreferenced: a second dormant scheduler, not a live one.

## Crash questions

1. **If Temporal disappears:** nothing breaks. No live process, no live code path, no live data depends on it. Only developer experimentation capability (the dev server) is lost.

2. **If PING dies after schedule but before ack:** no such path exists today; no schedules have ever been issued. Under the designed-but-unbuilt integration, Temporal history would hold the scheduled workflow; PING-side ack semantics are an open design question (approval-effect-identity lane), not implemented.

3. **Worker completes but PING dies before result persistence:** no workers exist, so this is N/A today. The drill design (D3 in the prior audit) prescribes effect-identity-guarded idempotent activities: a retried activity short-circuits on the already-emitted canonical event. Not built yet.

4. **Are activities idempotent?** Integration A activities are explicit stubs returning hardcoded results (safe but fake). Integration B activities delegate to authorities; idempotency is then authority-dependent, not guaranteed by the activity. Idempotent effect-identity wiring is designed, not implemented.

5. **Could duplicate delivery create duplicate canonical events?** Not via Temporal today (no delivery exists). The real hazard: wiring Temporal against the live MissionScheduler without converging it would create double-dispatch on `ping_missions` (two durability engines, same table). The drill D5 / duplicate-start semantics are also unbuilt.

6. **Is there a second mission authority hiding behind the scheduler?** No live second authority. The live authority is the MissionScheduler itself. Two dormant candidates exist, both unreferenced in the live path: the Temporal stack (this lane) and the BullMQ adapter. Neither issues, schedules, or dispatches anything.

## Terminal state: PROVEN

The DORMANT classification is proven by live evidence: reachable dev server with zero executed workflows, declared-but-absent SDK, zero live code-path references, zero workers, no task queue identity. Crash answers are exact for the current state: everything is N/A because no Temporal execution path exists, and the single future hazard (double-dispatch against MissionScheduler) is identified with its convergence requirement. No write work is needed from this lane; the drill design from the prior audit remains valid pending a writer unit (SDK install + replay-safety fix + real activities), which is out of scope for this read-only pass.

**Repo state observed:** `/home/nolan/ping` at `88c9651be` (feature/approval-effect-identity). No edits, commits, or infra touches made.
