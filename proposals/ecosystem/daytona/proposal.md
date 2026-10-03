# Harvest Proposal: Daytona — the sandbox lifecycle/isolation contract

- **VERDICT: ADAPT** (take the mechanism, clean-room re-derive to PING semantics; do not adopt code)
- **AUTHORITY_OWNER:** capability-kernel (secondary: object-kernel)
- **LICENSE:** AGPL-3.0-only — FLAGGED for Nolan (see License finding)
- **proof_ids:** 9, 10, 11, 12, 13, 14

## What I read (official docs + source only)

- https://www.daytona.io/docs/sandboxes/ — 1635-line Sandboxes reference (provision model, classes, resources, full lifecycle state and transition tables, operations, automated lifecycle: auto-stop/pause/archive/delete, wall-clock TTL, refresh_activity, ephemeral, linked sandboxes, spot GPU preemption)
- https://www.daytona.io/docs/snapshots/ — 977-line Snapshots reference (default snapshots, create-from-image, VM snapshots, GPU snapshots, create-from-sandbox cold/hot, private registries)
- https://www.daytona.io/docs/network-limits/ — 661-line Network Limits (firewall) reference (networkAllowList IPv4 CIDR max 10, domainAllowList max 100 with wildcards, networkBlockAll, outboundProxyUrl create-time-only encrypted-at-rest, tier-based policy dominance, running-update requires WRITE_SANDBOXES)
- https://github.com/daytonaio/daytona/blob/v0.190.0/LICENSE — verified GNU Affero General Public License v3 header
- https://github.com/daytonaio/daytona — frozen June 2026, "core development has moved to a private codebase"; current client SDKs live at github.com/daytona/clients (layout confirmed via a client-repo AGENTS.md: sdk-typescript, sdk-python, cli, openapi-specs, examples)
- https://github.com/daytonaio/daytona/issues/4642 — consumer-authored getOrCreate: API state strings `destroyed, destroying, stopped, archived, archiving, started`
- https://github.com/daytonaio/daytona/issues/5141 — error payload `{state, errorReason, recoverable, daemonVersion, desiredState, runnerId, sandboxClass}`; fixed ~60s boot deadline → `state=error`, `recoverable=false`
- Generated SDK reference (mirror of frozen repo typescript-sdk/sandbox.mdx): Sandbox fields `id` (string, unique), `name`, `state`, `labels`, `cpu/memory/disk/gpu`, `env`, `errorReason`, `backupCreatedAt`, `backupState` (SandboxBackupStateEnum), `networkAllowList`, `lastActivityAt`, `createdAt`
- Full input list with fetch notes: `~/workspace/harvest-staging/daytona/sources.txt`; SOURCE_SHA = sha256 over that file.

No marketing copy was used. No proprietary code was copied; the live core is private, so everything below is re-derived from public contract documentation.

## The object model (as documented)

A **Sandbox** is a governed execution unit, not a process:

- **Identity:** `id` — server-assigned opaque string; `name` — user-assigned alias; lookup by either (`daytona.get(id-or-name)`). `createdAt`, `lastActivityAt` timestamps.
- **Class** (`sandboxClass`): `container` (Linux container, default) | `linux-vm` | `windows` | `gpu` | (macOS via a partner platform). Class gates which lifecycle features exist.
- **Resources:** `cpu`, `memory`, `disk` (defaults 1/1GiB/3GiB, org max 4/8GiB/10GiB), plus `gpu` count + ordered `gpuType` preference list. Resize rules are state-aware: increase CPU/RAM on a running sandbox is live; decrease CPU/RAM or increase disk requires `stopped`; disk only ever grows.
- **Source:** created from a **Snapshot** (named, pinned base: mutable tags `latest`/`lts`/`stable` are rejected — pin or digest only), an **Image** (OCI/Docker, public or private registry with per-provider credential flows), or declaratively via Dockerfile build.
- **Policy bundle:** `envVars`; `secrets` (API keys/tokens — docs instruct: never in env); labels (`map[string]string`); **volumes** (`VolumeMount` — persistent storage shared across sandboxes); network policy (see below); lifecycle timers (see below); `linkedSandbox` parent id (1:N, cascade delete); `ephemeral` flag (deleted on stop; mandatory for linked children); `spot` flag (preemptible GPU).
- **Backup/receipt fields:** `backupCreatedAt`, `backupState` (SandboxBackupStateEnum), `spotEvictedAt`, `errorReason`, `recoverable`, `daemonVersion` (toolbox daemon registration = liveness evidence), `runnerId` (placement), `target`/`regionId` (`us`/`eu`; `earth` for shared GPU), `outboundProxyUrl` (returned on single reads; stored encrypted at rest).

## State transitions (verbatim from official docs)

States: Unknown → Pulling Snapshot / Building Snapshot → Pending Build → Building Snapshot → Creating → Starting → Started ⇄ (Stopping → Stopped ⇄ Starting/Restoring) ; VM/Windows only: Started → Pausing → Paused → Resuming → Started (or Paused → Stopping); Container only: Stopped → Archiving → Archived → (start → Restoring → Started; or → Deleted directly); Snapshotting; Forking; Resizing; Deleting → Deleted; Error (→ Restoring on recover, or → Archiving if a backup completed).

Transition triggers documented, notable ones:

| Initial | Target | Trigger |
|---|---|---|
| Started | Stopping | stop requested **or auto-stop interval exceeded** |
| Stopped | Archiving | archive requested **or auto-archive exceeded** (container only) |
| Started | Deleting | delete requested **or auto-delete exceeded** |
| — | Deleted | **wall-clock TTL elapsed — destroys in ANY state** (started/stopped/paused/archived) |
| Started | Error | operation fails or times out |
| Error | Restoring | recover requested **iff recoverable** |
| — | — | spot GPU preemption: destroyed without warning, `spotEvictedAt` recorded, retrievable 24h |

Key design facts extracted:

1. **Timers are policy, not convention.** `autoStopInterval` (default 15 min, 0 = disabled), `autoPauseInterval` (VM only, mutually exclusive with auto-stop, default 60 min), `autoArchiveInterval` (container only, default 7 days, 0 = max 30 days), `autoDeleteInterval` (default disabled, -1 = disabled, 0 = delete on stop), `ttlMinutes` (wall-clock hard bound; `set_ttl` resets the deadline from now). Inactivity is defined as *external interaction* (state changes, preview requests, SSH, toolbox API calls) — background scripts do not reset the timer. `refresh_activity()` is an explicit heartbeat primitive.
2. **Persistence is tiered by class and state, not assumed.** Started = compute + fs live. Stopped = fs kept (container: on runner; VM: offloaded to nearby storage), memory cleared. Paused (VM/Windows) = fs **and memory** offloaded. Archived (container) = fs moved to object storage, disk quota freed. Ephemeral/linked = destroyed on stop. Volumes = cross-sandbox persistent storage.
3. **Snapshots are content-addressed lifecycle objects with two temperatures.** From-image snapshots are built artifacts (declarative Dockerfile). From-sandbox: container → **cold** (filesystem only, requires stopped); VM/Windows → **hot** (filesystem + memory). Warm pools: pre-created running sandboxes claimed instantly on create. Snapshots are class-locked (VM snapshots cannot build container sandboxes).
4. **Fork** (VM/Windows) clones a running sandbox into an independent one — cheap parallelism primitive.

## Authority boundary

- **The control plane is the only authority for lifecycle state.** Agent code inside a sandbox cannot start/stop/archive itself; it must call outward through the Daytona API with an API key that, per documented credential model, "stays on the worker, never enters the sandbox."
- **Network policy is tiered and dominant at the org level.** Tier 1/2 orgs get restricted egress to an essential-services list and *cannot override it per sandbox*. Tier 3/4 default to full egress but a per-sandbox allow list or block-all *replaces* the default strictly (essential services are not auto-allowed). Updating network settings on a running sandbox requires the `WRITE_SANDBOXES` permission. Proxy URL is create-time-only and encrypted at rest; proxy host may not be localhost/private/loopback/link-local.
- **The sandbox never holds owner authority.** Secrets, registry credentials, and the API key live server-side; the sandbox holds only what it needs to execute.

## Evidence / receipts

Every lifecycle-relevant fact is a readable field, not an inference: `state`, `desiredState`, `errorReason`, `recoverable`, `daemonVersion`, `backupCreatedAt`, `backupState`, `spotEvictedAt`, `lastActivityAt`, `createdAt`, `runnerId`, labels. Daytona documents **audit logs** as a platform concept. Preemption, error, and build-failure are first-class recorded events with timestamps.

## Retries / failures

- `Error` is a state, not a throwaway: `errorReason` + `recoverable` bool decide whether `recover()` (Error → Restoring) is legal; an errored sandbox with a completed backup can be archived to preserve state.
- `BuildFailed` is explicit — the consumer must retry the build (no silent auto-retry in the documented contract).
- Third-party issue #5141 documents a hard fixed deadline: a VM boot that never registers its daemon flips to `state=error, recoverable=false` after ~60s — evidence that unknown liveness becomes a typed failure, not an indefinite hang.
- Issue #4142's automated repro proves the failure surface consumers must code against: requests during transitions get 400/502 (their proposal: 409 + `currentState` + `retryable`) — i.e., **the contract expects consumers to reconcile on state, not on RPC success**.
- Spot GPU: preemption is immediate, warning-free, but *recorded* (`spotEvictedAt`) and the sandbox remains retrievable for 24h.

## Revocation model

Delete (manual, auto-delete interval, or wall-clock TTL — the latter fires in any state), spot eviction, linked-cascade delete (deleting a parent deletes all children), and archived-direct-delete without restore. Every revocation path is a transition in the state machine, so it is observable and auditable.

## Tests (what I verified vs what I did not)

- I did **not** run any Daytona code or tests; the live core is private and I did not touch any repo.
- Test evidence actually observed: (a) the issue #4142 automated reproduction table (1000 stable requests vs 300 during stop-transition: 116 ok, 4×502, 180×400 "failed to resolve container IP") — proves the documented transition-state failure surface; (b) issue #5141's n=53 production signature with identical 60.2–65.0s timing — proves deterministic failure deadlines; (c) third-party fleet-rlm PR adding a Daytona session-prewarm manager with unit tests (`test_session_prewarm.py`, `test_prewarm_session_manager.py`) — proves the contract is implementable against by independent consumers.
- For piging2, the contract itself (enum + transition table + timer semantics) is the testable surface: any re-derivation must reproduce the state machine and the timer behaviors, which are fully specified in the docs I read.

## Verdict: ADAPT

**Take the mechanism; rewrite to PING semantics; clean-room.** The isolation/lifecycle *contract* is the most valuable primitive class in this entire harvest space for proofs 9–14, but the implementation cannot be adopted: the frozen repo is AGPL-3.0 (network copyleft — see License finding) and the live core is private/closed-source. Re-deriving the contract is clean: it is specified in public documentation as state machines and field semantics, and those are facts, not proprietary code.

## SMALLEST MISSING PRIMITIVE: the Execution Lease

PING has missions, workers, verification, and an event journal — but no **bounded execution unit** that sits between a mission dispatch and a worker's effects. Daytona proves the value of exactly one thing PING lacks:

**`ExecutionLease`** — a single object with:

- **bounded resources** (class, cpu/mem/disk; state-aware resize rules),
- **declared egress policy** (allow-list / domain allow-list / block-all; org policy dominates sandbox policy; changeable at runtime only by a held capability),
- **declared timers** (inactivity auto-stop, wall-clock TTL hard bound, explicit `refresh_activity` heartbeat — inactivity defined as external interaction, never internal busyness),
- **explicit state machine** (`unknown → creating → started → stopping → stopped → archiving → archived → restoring → started`, plus `error/recoverable`, `deleting → deleted`; every transition a journal event),
- **preemption receipts** (`evictedAt`, `errorReason`, `recoverable` — UNKNOWN liveness becomes a typed failure by deadline),
- **content-addressed snapshot reference** (cold vs hot; class-locked; warm-pool claim),
- **revocation paths** (all TTL/interval/preemption/cascade deletes as observable transitions).

Why this is the smallest thing: PING's proofs 9–14 (mission → worker result → bad-result rejection → fallback → independent verification → replay) currently execute workers with no contract about *where and under what bounds* they run. The Execution Lease gives every worker attempt (a) a killable, time-bounded container for its effects, (b) an egress firewall the worker cannot self-escalate, (c) receipts that bind attempts to the event journal so replay can distinguish `NOT_ATTEMPTED / COMMITTED / FAILED / EVICTED` per attempt, and (d) snapshot references that make "same environment" a checkable claim instead of a hope. Everything else (VM classes, GPU spot, macOS, warm pools, linked DNS networks) is product surface on top of this one primitive — reject all of it.

**Maps to proofs 9–14** (worker execution needs the bounded environment; independent verification and replay need the receipts). Does not map to 1–8; no other proof_id claimed.

## Dependency analysis

- **DEPENDENCIES: [] — zero.** The harvest is a contract specification (enum, state machine, timer/policy semantics), re-derived clean-room. Any future implementation would run on whatever runtime PING already owns (the lease contract does not require Daytona, Firecracker, or any vendor).
- Rejected by the dependency rule if proposed: any client SDK (`daytona` PyPI / `@daytona/sdk` npm — license of the new clients repo unverified), the frozen AGPL repo itself, and any Daytona-hosted control plane (closed core, vendor lock-in).

## License finding — FLAG FOR NOLAN

**AGPL-3.0-only**, verified from the official source (https://github.com/daytonaio/daytona/blob/v0.190.0/LICENSE, "GNU AFFERO GENERAL PUBLIC LICENSE, Version 3, 19 November 2007"). This is the strong network copyleft license: running a modified version on a server obligates source disclosure to users of that server. The current Daytona product core moved to a **private codebase** (June 2026); the public repo is frozen and unsupported. The current client SDKs live at github.com/daytona/clients — **I did not verify that repo's license**; treat it as unverified until checked. **Decision for Nolan:** do not adopt any Daytona code into piging2/PING (AGPL contamination risk); the ADAPT verdict's clean-room re-derivation from the public contract is the only safe path.

## Contrast with E2B (differences only)

| Dimension | Daytona | E2B (per cited sources) |
|---|---|---|
| Execution classes | Container + Linux VM + Windows + GPU (+ macOS via partner) | Single Linux microVM class; LTS 6.1 kernel fixed at template-build time (docs.e2b.dev/template/how-it-works) |
| Cold persistence tier | **Archive**: fs → object storage, zero quota impact, restore on start (container only) | No archive tier; pause holds fs+memory (~4s/GiB to pause, ~1s to resume), indefinite and unbilled |
| Timer model | Five independent timers (auto-stop/pause/archive/delete + wall-clock TTL that destroys in *any* state) | Single `timeout` with `onTimeout: kill\|pause` + `autoResume` on traffic |
| Fast start | Sub-90ms creation claim + **warm pools** (pre-created running sandboxes claimed on create) | Template snapshot spawn (layered builds, memory-page prefetch hints) |
| Parallelism | Fork (VM/Windows); **linked sandboxes** (1:N, shared link network, DNS aliases by name/id, cascade delete) | Fork up to 100 from a single checkpoint |
| Preemption | Spot GPU: no warning, `spotEvictedAt` receipt, 24h retrievability | No GPU/spot analogue in material read |
| Egress | Tier-based defaults with org-dominance; per-sandbox replace on higher tiers | Per-team egress rules replaceable on a running sandbox; BYO proxy |
| Hot snapshots | VM/Windows: fs + memory | Pause covers fs + memory (beta); filesystem-only mode exists |

(E2B lifecycle facts above are from third-party references of E2B's SDK docs, not re-verified against docs.e2b.dev directly, except the kernel/template page. The contrast is scoped to naming differences only, per the assignment.)
