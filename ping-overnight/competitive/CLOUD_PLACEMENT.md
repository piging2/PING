# PING Cloud Execution Placement — Portability Design

**DESIGN ONLY. No accounts created. No cost incurred. No deployments performed. No credentials touched.**

## The question

Not "how do we deploy all of PING everywhere." The question is: which execution capabilities belong behind PING's worker boundary on each provider, so a worker can run anywhere without fracturing authority.

## Target topology

```
PING authority plane (single, canonical)
  canonical Postgres (exactly one instance, no replicas with write paths)
  ping-gateway (event ingestion, Bearer auth, contract verification)
        |
        v
WorkerRuntime (contract broker)
  assigns jobs to workers by capability label
  verifies worker contract version before dispatch
  collects signed results, ingests them as events via the gateway
  never lets a worker write canonical state directly
        |
        +--> Oracle (persistent) ......... always-on workers, scheduler-adjacent
        +--> Google Cloud (ephemeral) .... burst workers, Cloud Run jobs
        +--> Vast.ai (GPU) ............... embedding / eval workers, interruptible OK
        +--> Colab (ephemeral GPU) ....... one-off research runs, notebook-shaped
        +--> Kaggle (ephemeral GPU) ...... eval harness runs, dataset-backed
        +--> Cloudflare edge ............. ingest validation, webhook front door
```

## Hard rules (non-negotiable)

1. Exactly one canonical PostgreSQL. It is not deployed "independently anywhere." There is one writer, one source of truth. Workers never open a direct database connection. All durable truth flows through gateway event ingestion.
2. No split-brain authority. Authority registries, witness roots, and contract versions live in exactly one place. A worker that cannot reach the authority plane fails closed; it does not improvise.
3. No new accounts, no cost. This design uses only free tiers and existing access. Anything requiring spend is flagged, not executed.
4. ARM64 is a real constraint. Oracle's free compute is Ampere A1 (aarch64). Every container image in this design must be multi-arch (linux/amd64 + linux/arm64) or the placement is invalid. Pure-JS workers are arch-neutral by construction; any native dependency must be audited per arch.
5. Workers are stateless or cache-only. Local disk is scratch. On restart, a worker rehydrates from the event log, never from local files.

## Provider classification

Legend for capability tags: PERSISTENT_EXECUTION, EPHEMERAL_EXECUTION, GPU_EXECUTION, EDGE, STORAGE, QUEUE, MODEL_HOSTING, NOT_APPROPRIATE.

### Oracle Cloud (OCI Always Free)

- Tags: PERSISTENT_EXECUTION, STORAGE
- Why: Always Free includes 4 OCPUs of Ampere A1 ARM compute with 24 GB RAM, 200 GB block volume, 10 GB object storage, 10 TB outbound per month. This is the only provider in the set that gives persistent, always-on VMs at zero cost. Source: Oracle Always Free docs and press coverage.
- ARM64 constraint: the free compute is aarch64. Worker images must be multi-arch. Node.js workers are fine; anything with native modules needs arm64 builds.
- Smallest useful placement: one A1 VM hosting the WorkerRuntime broker plus the always-on worker set (scheduler-adjacent dispatch, witness workers that need persistent presence for attestation continuity). This is also the natural home for the single canonical Postgres (self-hosted on the VM; no managed Postgres in the free tier) and the ping-gateway. That keeps the authority plane on one persistent, zero-cost host.
- NOT_APPROPRIATE for: GPU work (no GPUs in free tier), MODEL_HOSTING at scale.

### Google Cloud

- Tags: PERSISTENT_EXECUTION, EPHEMERAL_EXECUTION, STORAGE, QUEUE, MODEL_HOSTING
- Why: full-service cloud. Compute Engine for persistent VMs, Cloud Run for scale-to-zero ephemeral jobs, Cloud Storage, Pub/Sub for queues, Vertex AI for model hosting. Free tier exists for bounded use.
- Smallest useful placement: Cloud Run jobs as ephemeral burst workers. A ReplayWorker that needs to re-derive a projection from 100k events does not belong on the persistent Oracle VM; it belongs in a Cloud Run job that spins up, pulls its job from the WorkerRuntime, emits signed results back through the gateway, and scales to zero. No local canonical state; the job input is a content-addressed event range, the output is content-addressed artifacts.
- Cost guardrail: Cloud Run free tier is bounded (monthly request and compute allowances). Burst workers must carry a budget declaration (max CPU-seconds per job) and fail closed on overrun. Anything beyond free tier is flagged for Nolan, never auto-spent.
- NOT_APPROPRIATE for: the canonical Postgres (no; single instance rule, and managed Postgres costs money).

### Vast.ai

- Tags: EPHEMERAL_EXECUTION, GPU_EXECUTION
- Why: GPU marketplace with on-demand, interruptible (50%+ cheaper, preemptible), and reserved tiers, per-second billing, API-driven provisioning. Source: vast.ai pricing page.
- Smallest useful placement: interruptible GPU workers for embedding generation and eval harnesses. These workloads are fault-tolerant by design: inputs are content-addressed, outputs are content-addressed, and a preempted job simply gets re-dispatched by the WorkerRuntime. Interruptible pricing fits because the worker contract already requires idempotent, resumable jobs.
- Rules: never place anything requiring uptime here (no witness, no scheduler, no gateway). On-demand tier only if a GPU job has a hard deadline and Nolan approves the spend; default is interruptible or nothing.
- NOT_APPROPRIATE for: PERSISTENT_EXECUTION, STORAGE (storage accrues cost even when stopped), QUEUE, anything authoritative.

### Google Colab

- Tags: EPHEMERAL_EXECUTION, GPU_EXECUTION
- Why: free hosted notebooks with GPU access, but runtimes are hard-capped (free tier: 12 hours max, ~90 minute idle timeout, preemptible, ephemeral filesystem). Source: official Colab FAQ.
- Smallest useful placement: one-off research and eval runs in notebook form. Example: run the constitutional eval suite (EVAL-010 witness honesty and siblings) against a snapshot of the event log, capture results as content-addressed artifacts, emit them back through the gateway. The notebook is a worker with a human-readable UI.
- Rules: nothing persistent, nothing scheduled, nothing that must survive a disconnect. Every Colab job must checkpoint its outputs to content-addressed storage (or push results to the gateway) before the runtime can be reclaimed, because reclamation is a matter of when, not if.
- NOT_APPROPRIATE for: PERSISTENT_EXECUTION, QUEUE, STORAGE, MODEL_HOSTING, anything on a schedule.

### Kaggle

- Tags: EPHEMERAL_EXECUTION, GPU_EXECUTION
- Why: free notebooks and datasets with a weekly GPU quota, ephemeral execution, strong dataset versioning. Public documentation describes the free GPU quota model; exact current quota figures were not re-verified in this pass (see claim classification).
- Smallest useful placement: eval harness runs against versioned datasets. Kaggle's dataset versioning pairs naturally with PING's content addressing: pin the dataset version, record its hash in the job envelope, run the eval, emit content-addressed results.
- Rules: same ephemerality rules as Colab. No schedules, no persistence, checkpoint everything.
- NOT_APPROPRIATE for: PERSISTENT_EXECUTION, QUEUE, STORAGE, MODEL_HOSTING, canonical anything.

### Cloudflare edge (Workers, R2, KV, D1, Queues)

- Tags: EDGE, STORAGE, QUEUE
- Why: Workers are V8 isolates at the edge, ~0ms cold starts, no filesystem, 128 MB memory per isolate, CPU time capped per request (free: 10ms; paid: up to 30s+). R2 for blobs, KV for config, D1 for lightweight relational state, Queues for async decoupling. Sources: Cloudflare docs and platform skill references.
- Smallest useful placement: the webhook front door and ingest validation layer. A Worker receives an inbound event payload, validates its shape and signature, computes its content hash, and enqueues it for the gateway. It never touches canonical state; D1/KV hold only operational scratch (dedupe windows, rate counters), never authority.
- Rules: keep handlers under the CPU budget (validation and hashing are cheap; anything heavier goes to a Queue consumer on a real runtime). No Durable Objects on the free tier. No canonical Postgres here, no witness work here, no replay here. Edge is a bouncer, not a judge.
- NOT_APPROPRIATE for: PERSISTENT_EXECUTION, GPU_EXECUTION, MODEL_HOSTING, canonical Postgres, witness attestation, replay.

## Classification matrix

| Provider      | Persistent | Ephemeral | GPU  | Edge | Storage | Queue | Model hosting | Smallest useful worker placement |
|---------------|------------|-----------|------|------|---------|-------|---------------|----------------------------------|
| Oracle (free) | yes        | no        | no   | no   | yes     | no    | no            | WorkerRuntime broker + always-on workers + single canonical PG + gateway |
| Google Cloud  | yes        | yes       | yes  | no   | yes     | yes   | yes           | Cloud Run burst workers (replay, projection), budget-capped |
| Vast.ai       | no         | yes       | yes  | no   | no      | no    | no            | Interruptible GPU workers (embeddings, evals), idempotent jobs |
| Colab         | no         | yes       | yes  | no   | no      | no    | no            | One-off research/eval notebook runs, checkpoint before reclaim |
| Kaggle        | no         | yes       | yes  | no   | no      | no    | no            | Eval harness on versioned datasets, hash pinned in job envelope |
| Cloudflare    | no         | yes       | no   | yes  | yes     | yes   | no            | Webhook front door + ingest validation, scratch state only |

## Portability checklist: the shared worker contract

For a provider to host a PING worker, ALL of the following must be true. If any item fails, the provider is NOT_APPROPRIATE for that worker.

1. Transport: the worker can receive a job envelope (HTTPS pull or queue subscribe) and return results (HTTPS POST to the gateway). No inbound ports required on the worker; workers always dial out.
2. Auth: the worker authenticates to the gateway with a scoped Bearer token (exterior-agent style). Tokens are short-lived and capability-scoped. No ambient credentials, no shared secrets in images.
3. Result and evidence callback: every job result is returned as a signed event (or batch of events) ingested through POST /events or the canonical ingestion path. The worker never writes to Postgres directly. Results include the job's content hash, the worker contract version, and the input event range.
4. No local canonical state: the worker is stateless or cache-only. Durable truth lives in the event log. A worker restarted from scratch must produce identical results for identical inputs (rehydration from the log, not from disk).
5. Determinism: same inputs produce byte-identical outputs. Canonical JSON serialization, no wall-clock timestamps inside artifacts (timestamps go in event metadata, assigned by the gateway), no random IDs (content-derived IDs only).
6. Architecture portability: images are multi-arch (linux/amd64, linux/arm64) or pure-JS. No arch-specific native binaries without a per-arch build and test.
7. Resource bounds: every job declares max CPU-seconds, max memory, max wall-clock. The WorkerRuntime kills and re-queues jobs that exceed bounds. Ephemeral providers get tighter bounds; a job that cannot fit is split, not stretched.
8. Versioned contract: the worker contract has a version and a hash. The gateway rejects results from unknown contract versions. Contract changes are explicit and replay-safe.
9. Idempotency: job envelopes carry content-addressed IDs. Duplicate delivery is safe; re-execution after preemption resumes from the last checkpointed event, never from scratch against mutated state.
10. Observability: structured logs with correlation_id and causation_id on every line. No secrets, no tokens, no PII in logs. A worker that cannot explain what it did cannot run.

## What this design deliberately excludes

- A second Postgres anywhere, for any reason. One canonical instance. Read replicas are projections, not authority, and are out of scope until the single writer is proven.
- Long-running GPU reservations. Vast.ai reserved tier exists but commits spend; excluded by the no-cost rule.
- Colab Pro / paid tiers. The design assumes free-tier limits (12h cap, preemption) as hard constraints, not problems to pay away.
- Cloudflare Durable Objects for coordination. Paid-only; the WorkerRuntime on Oracle owns coordination.
- Multi-runtime claims in competitive content. This placement design does not imply the workers are built; it is a portability target, and the drafts were written to avoid claiming otherwise.

## Morning-Deliverable: claim classification

Each claim below is classified: VERIFIED (observed live or fetched from a primary source this pass), PARTIAL (supported but not fully audited), BLOCKED (cannot verify without an action that is out of scope), FALSIFIED (evidence contradicts it), UNKNOWN (not checked).

### Competitive work

| # | Claim | Class | Basis |
|---|-------|-------|-------|
| C1 | PING emits SHA-256 content-addressed events; canonical hash is the primary identity | VERIFIED | gateway/content_addressing.js read live at c5f7808b2 |
| C2 | PING deduplicates events structurally by content-derived event_id | PARTIAL | event_id PRIMARY KEY + dedup counter observed in unified_event_runtime.js; full "structural" semantics not audited this pass |
| C3 | PING has 8 canonical JS workers (Claim, Classification, Lineage, Observation, Projection, Recommendation, Replay, Witness) | VERIFIED | class definitions read live in canonical_workers.js |
| C4 | WitnessWorker refuses unverified replays via observable WITNESS_REJECTED, and it is tested | VERIFIED | canonical_workers.js lines 467-485; evals/EVAL-010_witness_failure_honesty.js |
| C5 | Worker emissions inherit causation_id, correlation_id, namespace from the triggering event | VERIFIED | canonical_workers.js trace contract read live |
| C6 | EvidenceAuthority is implemented | VERIFIED | ping-runtime/evidence/evidence_authority.js; registry status implemented |
| C7 | CapabilityAuthority is implemented | FALSIFIED | authorities/registry.yaml status is missing_implementation; drafts do not claim it |
| C8 | Missions are named durable units carrying proofs | VERIFIED | missions/VerifyReplay (mission.yaml, proofs/, results.json) read live |
| C9 | Monday.com automations are trigger-action recipes | VERIFIED | community.monday.com payloads; PageProof custom automation guide |
| C10 | Monday.com activity log retention is tier-gated (Basic 1 week through Enterprise 5 years) | VERIFIED | monday.com Security and Privacy whitepapers V1.3 and V2.2 |
| C11 | Monday.com audit log is Enterprise-only | VERIFIED | same whitepapers |
| C12 | Monday.com permissions are user-role gates on boards and columns | VERIFIED | monday.com tutorials and help center |
| C13 | GoHighLevel workflows are trigger then sequential actions | VERIFIED | GHL workflow fundamentals doc (GitHub) |
| C14 | GoHighLevel audit logs are admin-only | PARTIAL | third-party GHL tutorial index; official help article not fetched this pass |
| C15 | GoHighLevel roles are agency/account admin/user with scopes | PARTIAL | third-party role guides; consistent across two independent sources |
| C16 | Drafts contain zero em dashes | VERIFIED | grep for U+2014 and U+2013 returned zero hits |

### Cloud execution placement

| # | Claim | Class | Basis |
|---|-------|-------|-------|
| P1 | Oracle Always Free provides 4 OCPU Ampere A1 ARM + 24 GB RAM persistently | VERIFIED | Oracle Always Free docs (via archive) and press coverage fetched this pass |
| P2 | Oracle free compute is aarch64, requiring multi-arch worker images | VERIFIED | same sources; Ampere Altra is Arm Neoverse |
| P3 | Colab free runtimes are capped (~12h), idle-timeout (~90min), ephemeral, preemptible | VERIFIED | official Colab FAQ fetched this pass |
| P4 | Kaggle free tier offers GPU quota on ephemeral notebooks | UNKNOWN | not re-verified this pass; design assumes the publicly documented model conservatively |
| P5 | Vast.ai offers on-demand, interruptible, and reserved GPU tiers with per-second billing | VERIFIED | vast.ai pricing page fetched this pass |
| P6 | Cloudflare Workers free: 100k req/day, 10ms CPU/request, no filesystem, 128MB isolates | VERIFIED | platform skill docs summarizing Cloudflare docs; secondary source, limits widely documented |
| P7 | The shared worker contract is implementable on all six providers as classified | PARTIAL | design only; no provider has run a contract worker yet |
| P8 | A contract worker runs correctly on Oracle ARM | BLOCKED | requires building multi-arch images and executing on an A1 VM; deployment is out of scope for this sprint |
| P9 | No placement in this design creates a second canonical Postgres or split-brain authority | VERIFIED | by construction: single-writer rule is stated as a hard constraint in this document |
| P10 | No accounts were created, no cost incurred, no deployments performed | VERIFIED | this task performed research and writing only; no provider consoles touched |
| P11 | ARM64 multi-arch images exist for the JS worker set | BLOCKED | pure-JS workers are arch-neutral by construction, but no image has been built or tested on arm64 |
| P12 | Cloud Run burst workers stay within free tier | PARTIAL | depends on job budgets that do not exist yet; the design requires budget declarations per job |

## Recommended next steps (for Nolan's call, not auto-executed)

1. Build one multi-arch container image for the JS worker set and run the contract handshake against the gateway on an Oracle A1 VM (unblocks P8, P11).
2. Write the WorkerRuntime job envelope spec with budget declarations (unblocks P12, hardens P7).
3. Run EVAL-010 and the witness honesty suite from a Colab notebook against an event-log snapshot as the first real ephemeral worker (proves the Colab placement row).
4. Competitive drafts stay DRAFT ONLY until Nolan reviews and approves each piece individually.
