# HARVEST PROPOSAL — E2B (sandbox authority / execution boundary)

**Target:** E2B — ephemeral execution environments (Firecracker microVMs), lifecycle (create, pause, resume, kill), filesystem/process boundaries, code execution without leaking secrets out.
**Assigned scope:** sandbox object model, lifecycle state machine, isolation boundary, result/artifact return path. Relevant to proofs 9–12 (worker execution isolation).
**Worker type:** leaf harvest worker. No subagents spawned. No git repos touched. Nothing committed.

---

## 1. What I read (verbatim sources, OFFICIAL only except where noted)

### Official docs (e2b.dev/docs), fetched 2026-10-02:

1. `https://e2b.dev/docs/sandbox` — Sandbox lifecycle (create, connect, setTimeout, kill; timeout reset semantics).
2. `https://e2b.dev/docs/sandbox/persistence` — Pause/resume semantics: states Running / Paused / Snapshotting / Killed; pause refused → HTTP 503, sandbox keeps running (ServiceBusyError); auto-pause retry ~2 min then filesystem-only fallback; paused sandboxes kept indefinitely; pause ~4s/1GiB RAM; resume ~1s; continuous runtime limits 1h Hobby / 24h Pro, reset after pause/resume; connect() extends lifetime to max(now, now+timeout), never shortens; setTimeout() can shorten.
3. `https://e2b.dev/docs/network/internet-access` — Egress boundary: default outbound internet ON; `allowInternetAccess` switch; `allowOut`/`denyOut` IP/CIDR/domain lists, **allow beats deny**; domain filtering requires `0.0.0.0/0` in deny list (else 400); blocked TCP connections may *appear* to succeed from inside the sandbox (firewall accepts before deciding, no packets reach destination — application-level response is the only truth); `network.rules` per-host transforms inject headers at the egress proxy (TLS only); secret injection via `Secret.fill` replaced **outside** the sandbox; workload identity tokens minted per-request at egress (`${e2b.identity.tokens.<name>}` placeholder); `updateNetwork` replaces config on running sandbox without restart (create-only options cannot change after create).
4. `https://e2b.dev/docs/sandbox/lifecycle-events-webhooks` — Receipts: lifecycle event types `sandbox.lifecycle.created/killed/updated/paused/resumed/checkpointed`; `event_data.kill_reason` enum (`request | timeout | admin | orphaned | base_template_missing | unknown`); `event_data.execution` (started_at, vcpu_count, memory_mb, execution_time); `events_ttl_days` retention; webhook auth via project API key; `e2b-signature` (v1) HMAC verification with per-webhook secret; delivery **up to 3 attempts**, failed on 4xx/5xx/timeout/network error; `e2b-delivery-id` unique per attempt; **handler must be idempotent, dedupe on event `id`** (same event may be delivered more than once).
5. `https://e2b.dev/docs/secrets` — Credential authority: secrets are metadata-only on control plane, **write-only through management API** (create/update accept value; responses/reads/lists/errors never return it); sandbox config holds only a reference; egress proxy injects real value into outbound HTTPS **outside** the sandbox; workload identity = short-lived tokens minted per sandbox without the API ever minting a credential.

### Official source repos (github.com/e2b-dev), fetched 2026-10-02:

6. `https://github.com/e2b-dev/e2b` (redirects to **e2b-dev/E2B**) — SDK/CLI monorepo (JS + Python SDKs). HEAD at read: `a9e893bcb9b44cc53778a45975c58fdfa0f0da7e`. License: **Apache-2.0** (LICENSE file in repo root). Claim in README: "Open-source, secure environment with real-world tools for enterprise-grade agents."
7. `https://github.com/e2b-dev/infra` (renders as **e2b-dev/runtime**) — full runtime: control-plane API (Gin, OpenAPI), per-node Firecracker orchestrator, **envd** in-VM agent (Connect RPC, process + filesystem APIs, port 49983), client proxy edge router, template builder. HEAD at read: `92197909dce5a1bef33e764ae4af76f0732fd7a8`. License: **Apache-2.0** (LICENSE file in repo root). README key mechanisms: sandbox = resumed snapshot (templates are pre-booted VMs; memory lazily restored via userfaultfd; rootfs is COW overlay on read-only image); **control plane and data plane never mix** (API decides *where*, orchestrator owns *how*); pause = diff memory+disk vs template, ship diff to object storage; fork = checkpoint live sandbox, spawn up to 100 new ones from the snapshot; envd speaks processes/PTYs/filesystem/watchers/port-forwarding; sandbox URLs `https://<port>-<sandbox>.<domain>` with per-sandbox access tokens; volumes outlive sandboxes; secrets metadata-only; OpenTelemetry everywhere; lifecycle events/metrics → ClickHouse. Local self-host via `embed/compose/{compose.yaml,.env}` ("E2B Embed").

### Corroborating third-party notes (used only to cross-check protocol facts, not as authority):

- `wimmboo2/ai-wrapper` commit `8a4daca27105d6d6a240c4421b8d710861136a77` — verified against `e2b-dev/infra@767ceb4`: `POST /sandboxes` takes `{templateID, timeout}`; response carries `sandboxID`, nullable `domain`, `envdAccessToken`; control plane auth = `X-API-Key` header; `DELETE /sandboxes/{id}` kills; `POST /sandboxes/{id}/timeout` takes `{timeout}`; envd on **port 49983** at `{port}-{sandboxID}.{domain}`; envd `WithAuthorization` checks exactly one header: `X-Access-Token` (signature query params only apply to /files paths).
- `kvcache-ai/agentenv` auth docs — secure mode: `secure: true` at create returns `envdAccessToken`; secure-mode credentials survive pause/server restart/resume; forked sandboxes get independent credentials.
- `rethink-paradigms/mesh` research notes — state transitions Running → Paused → Running, Running → Snapshotting → Running, Any → Killed (terminal).

---

## 2. Object model

| Object | Fields / shape (from official docs + verified notes) |
|---|---|
| **Sandbox** | `sandboxID` (opaque, e.g. `ig6f1yt6idvxkxl562scj-419ff533`), `template_id` (e.g. `u7nqkmpn3jjf1tvftlsu`), `name`, `metadata` (arbitrary key/value), `started_at`, `end_at`, `domain` (nullable), `envdAccessToken` (returned only at create), `state` (running/paused), `network` config, `lifecycle` config, `secure` flag |
| **Template** | built from Docker image + build steps; layered, each layer hashed and cached; optimized by recording boot-touched pages; sandboxes resume *from* templates — template and paused-sandbox snapshot share the same artifact shape |
| **Snapshot / checkpoint** | FS + memory (default) or FS-only (`keepMemory: false`); explicit `createSnapshot` keeps sandbox running; fork produces up to 100 sandboxes from one snapshot |
| **Execution** | process started inside via envd; `CommandResult` / execution object: `stdout`, `stderr`, `text`, `logs`, `results` (rich: charts/tables), `error` (runtime errors), exit code, streaming callbacks (`on_stdout`, `on_stderr`, `on_error`), background handles with pid, `sendStdin`, `waitForExit`, `kill` |
| **Lifecycle event** | `id` (dedupe key), `type` ∈ the six `sandbox.lifecycle.*`, `event_data` (execution details + kill_reason), `events_ttl_days` |
| **Secret** | metadata-only object; value write-only at create/update, never returned |
| **Webhook** | registration per project; `e2b-webhook-id`, `e2b-delivery-id` (per attempt), `e2b-signature` (v1), `e2b-signature-version` |

## 3. ID scheme

- Sandbox IDs: opaque random, hyphenated multi-segment (example `ig6f1yt6idvxkxl562scj-419ff533`). No content embedded.
- Template IDs: opaque random (example `u7nqkmpn3jjf1tvftlsu`); human aliases allowed at create.
- API key: `e2b_` prefix, scoped to exactly one project; no documented expiry.
- envd access token: opaque bearer for the in-VM daemon (`X-Access-Token`), returned once at create; independent per fork; survives pause/resume.
- Event IDs: opaque; the dedupe key for idempotent webhook handlers.
- Metadata: arbitrary caller key/value (e.g. `owner`, `userId`) — the attribution/association mechanism.

## 4. State transitions (lifecycle state machine)

```
create ──▶ Running ──pause──▶ Paused ──resume/connect──▶ Running
               │                 │
               ├─snapshot──▶ Snapshotting ──▶ Running (automatic return)
               ├─timeout──▶ [onTimeout=kill] → Killed
               │           └─[onTimeout=pause] → Paused (auto-pause; persistent: re-pauses on next timeout too)
               └─kill / fork / checkpoint
Any ──kill──▶ Killed  (TERMINAL; resources released; cannot be resumed)
```

- Create cold-starts in ~150ms because it *restores a pre-booted template snapshot*, never boots a kernel.
- `connect()` extends lifetime to the *later* of current expiry and now+timeout (default 5 min) — monotonic extension only, never shortens. `setTimeout()` sets an absolute new timeout and *can* shorten.
- Continuous-running limits: 1h Hobby / 24h Pro; **pause + resume resets the clock** (so the machine-readable rule is "one continuous run", not "one sandbox").
- Paused sandboxes: **retained indefinitely**, no TTL, no auto-delete; removed only by explicit kill.
- Kill is immediate and irreversible; `kill()` returns false if not found (no error on double-kill).
- `Sandbox.list()` paginated, filterable by `state` and `metadata`.

## 5. Authority boundary (isolation)

Five layers, each enforceable and observable from the outside:

1. **Compute isolation** — one Firecracker microVM per sandbox; own kernel, own memory, own filesystem, own network namespace, own cgroup. Rootfs is a copy-on-write overlay on a read-only template image. Escape requires a hypervisor exploit.
2. **Process/filesystem boundary** — everything inside runs through **envd**, an in-VM daemon (Connect RPC, port 49983) exposing typed process/filesystem APIs. The host never sees untrusted code; untrusted code never sees the host (no host filesystem, no host process visibility, no host link-local/IMDS addresses).
3. **Network boundary** — per-sandbox nftables egress firewall + SNI/Host-inspecting domain allow/deny. Default: outbound internet ON; `allowInternetAccess: false` = full egress off. **Allow always beats deny**. Private/link-local ranges always blocked. Firewall accepts-then-decides TCP (a blocked connection can *look* open from inside; only application-level response proves reachability).
4. **Credential boundary** — secrets are **metadata-only** on the control plane; values are write-only at create/update and never returned in any response/read/list/error. At egress, the proxy injects the real secret value into matching outbound HTTPS **outside** the sandbox. Workload-identity tokens are minted per-request at egress as `${e2b.identity.tokens.<name>}` placeholders — the token value never passes through tenant code or the sandbox. Rule: **code inside the boundary never holds a credential; the boundary injects credentials on the way out.**
5. **Public-ingress boundary** — any port a sandbox process opens can be reached at `https://<port>-<sandbox>.<domain>` via the edge router, gated by per-sandbox access tokens; paused sandboxes are unreachable (clients disconnected; reconnect after resume).

What the sandbox can reach: its own processes/files/ports; public internet (default) or a policy-constrained subset; egress-proxy-injected secrets it can never read directly.
What it cannot reach: host files/processes/network metadata; other sandboxes; credential values; anything denied by egress policy (packets dropped, though TCP may fake-open); its own `end_at` (no self-termination API — kill is caller-side).

## 6. Persistence semantics

- Paused = durable artifact: memory + disk diffs vs template shipped to **object storage**; resume prefers the node that still has it cached (locality).
- Paused snapshot and template are the **same artifact shape** — resume, create, and fork all take the same restore path (canonical-by-construction).
- Filesystem-only pause (`keepMemory: false`) → cold boot on resume (processes/variables lost, disk kept).
- **Persistent volumes** outlive sandboxes (explicit durability independent of sandbox lifetime).
- Killed = resources released; no recovery path; terminal.
- `events_ttl_days`: lifecycle events retained and queryable for days (evidence retention is explicit and bounded).

## 7. Evidence / receipts

- **Lifecycle events API + webhooks** with typed payloads (`event_data.execution`: started_at, vcpu_count, memory_mb, execution_time; `kill_reason` enum). This is the tamper-observable receipt stream: every state transition has an event.
- Webhooks are **authenticated** (`e2b-signature` v1, per-webhook signing secret) and **at-least-once** (up to 3 attempts, `e2b-delivery-id` per attempt) — receivers must dedupe on event `id`. Classic at-least-once delivery contract, spelled out in docs.
- **Metrics**: `getMetrics()` CPU/memory/disk (one live sample; observing never wakes a frozen sandbox — observation is side-effect-free by contract).
- **Logs**: stdout/stderr streaming with structured `logs.stdout` / `logs.stderr`, rich `results` (charts, tables), `error` objects; chunks must be decoded as raw bytes accumulated once (UTF-8 split across chunks corrupts — boundary encoding rule).
- Signed file upload/download URLs with enforced expiry (401 on tampered signature) — artifact egress with capability-token semantics.

## 8. Retries / failures

- **Pause refusal**: node still finishing a previous snapshot → API returns **HTTP 503**, sandbox **keeps running with state intact** (fail-open on transient, never fail-closed; `ServiceBusyError`, retry after short wait).
- **Auto-pause under snapshot backlog**: retries pause for ~2 min past timeout; if the node still refuses, falls back to **filesystem-only pause** (disk preserved, memory dropped) rather than losing the sandbox. Under normal conditions this never happens.
- **Timeout default**: `onTimeout: "kill"`; opt-in `onTimeout: "pause"`.
- **Webhook delivery**: up to 3 attempts, then give up (event still queryable via the events API for `events_ttl_days` — delivery is best-effort, the event log is the source of truth).
- **No server-side idle-stop or auto-delete**: the provider never silently removes state; only explicit kill ends a sandbox. (Notably this contradicts "cleanup" intuition — E2B is explicit: `unknown` is a valid kill_reason when the reason wasn't recorded, i.e. UNKNOWN is preserved, not papered over.)

## 9. Revocation model

- **Sandbox-level**: `kill()` terminates immediately and irreversibly; returns false if already gone (idempotent revoke). Paused sandboxes require explicit kill to delete.
- **Credential-level**: API key (`e2b_` prefix) scoped to one project; envd access tokens per sandbox (independent per fork, survive pause/resume); `secure: true` mode makes envd token mandatory for all control operations.
- **Secret-level**: rotate without restarting sandboxes (injection happens at egress, so rotation is immediate and server-side); delete secret → future egress injections fail, no in-sandbox residue (the sandbox never held the value).
- **Token-level**: workload identity tokens are short-lived and minted per-request at the boundary — revocation = stop minting; nothing inside holds a long-lived credential.

## 10. Tests (upstream)

- `e2b-dev/runtime` (infra): `make test` (unit tests across packages), `make test-integration` (against a live deployment). Env-daemon has explicit versioning discipline (`pkg/version.go` bumped on every behavioral change).
- `e2b-dev/e2b` (SDKs): PR evidence cites 336 unit tests, 92 sync + 89 async integration tests against production for commands/pty/files modules, plus `make lint` and `make typecheck`.
- Behavior is documented as the contract (docs describe refusal/fallback/retry behavior explicitly) — the docs are written as a spec, not marketing.

## 11. Verdict: ADAPT

**Do not ADOPT the service, do not REJECT the mechanisms.** ADAPT the execution-boundary contract to PING semantics, clean-room, zero dependencies.

Reasoning:

- E2B-the-product is a hosted fleet (Firecracker hosts, control plane, billing, `e2b_` API keys, a third-party account). piging2 cannot take a hard dependency on an external SaaS as an execution primitive — it violates zero-dependency preference, cannot run offline, and puts proof 9–14's determinism in someone else's cloud. ADOPT would also import the entire runtime, not a primitive.
- The *mechanisms* are proven valuable and map directly onto PING's existing primitives (missions, capabilities, events, evidence) with no invention required:
  1. **Lifecycle as a typed state machine** (Running/Paused/Snapshotting/Killed) with explicit transitions, terminal kill, and refusal-without-loss (503 = keep running, never corrupt).
  2. **Capability envelope at create**: network allow/deny with allow-beats-deny, TTL with monotonic-extend vs absolute-set semantics, arbitrary metadata for attribution.
  3. **Credential injection at the boundary, never inside**: secrets metadata-only, injected by the egress proxy outside the sandbox; workload tokens minted per-request. This is the exact pattern PING needs for proofs 10–11 (a worker that returns results must never exfiltrate a tenant secret; an injected bad result must be attributable).
  4. **At-least-once typed receipts with dedupe keys**: lifecycle events with IDs, signed webhooks with per-attempt delivery IDs, kill_reason enums including `unknown`. This is how proof 13 (VERIFIED only after independent verification) and proof 14 (replay) get their evidence stream.
  5. **UNKNOWN preserved**: `kill_reason: unknown` when the reason wasn't recorded — never silently convert missing evidence into a success story.
- None of this requires Firecracker. For proofs 9–12 piging2 needs the *contract*, executed locally by a stub runner with the same shape. The sandbox fleet is an execution detail; the contract is the primitive.

## 12. SMALLEST MISSING PRIMITIVE

**A sealed execution-receipt contract at the worker boundary.** PING has missions, capabilities, and evidence, but it does not have a typed, independently-verifiable record that binds an execution attempt to its outcome *at the boundary where untrusted work runs* — the thing that lets a verifier (proof 13) trust a result it did not itself produce.

Minimal shape (clean-room, re-derived from E2B's evidence model, no E2B code):

```ts
// ExecutionReceipt — produced by the execution boundary, consumed by the verifier.
// Authority owner: capability-kernel (the boundary is a capability: WHO may run WHAT, under WHAT constraints)
ExecutionAttempt {
  execution_id:    opaque        // one attempt, not one mission (attempt ≠ mission)
  mission_id:      opaque        // parent mission this attempt serves
  capability_envelope: {
    allowed_egress: string[]     // allow list; empty = no network
    denied_egress:  string[]     // deny list; allow beats deny on conflict
    max_wall_ms:    number       // TTL; absolute deadline
    on_timeout:     "kill" | "checkpoint"   // E2B's kill|pause, PING vocabulary
  }
  secrets:         "metadata-only"  // references, never values; injected at boundary on egress
  started_at:      timestamp
}
ExecutionReceipt {
  execution_id:    opaque        // binds to the attempt
  exit_code:       number | null // null = killed / did not exit on its own
  stdout_digest:   sha256        // digest, not raw bytes, for the canonical record
  stderr_digest:   sha256
  kill_reason:     "request" | "timeout" | "admin" | "orphaned" | "unknown"
  execution_time_ms: number
  ended_at:        timestamp
}
```

What it proves valuable: proof 10 (worker returns result) is an `ExecutionReceipt` with `kill_reason` absent and exit_code 0; proof 11 (injected bad result rejected) is the verifier checking the receipt's digests/binding rather than trusting the worker's claim — E2B's "TCP looks open but no packets arrived" rule is the analogy: **never trust the in-band claim, verify at the boundary**; proof 12 (fallback attempt succeeds) is a second `ExecutionAttempt` with the same `mission_id` and a new `execution_id`; proof 13 (VERIFIED only after independent verification) is the verifier consuming the receipt, not the worker's assertion. And E2B's refusal discipline (`503 → keep running, nothing lost`) plus `kill_reason: unknown` give the failure semantics: never fail-closed on a transient, never invent a reason.

This is one small typed contract in the capability-kernel — not the sandbox, not the fleet, not Firecracker. Everything else (microVM, envd, templates) is implementation detail piging2 does not need.

## 13. Dependency analysis

- **Dependencies: none.** All mechanisms re-derived clean-room from public documentation and repository structure. No E2B SDK, no E2B API, no vendored code, no generated clients.
- **DEPENDENCY_COST: zero.**
- Anything downstream that needs actual code execution uses a local stub runner with the same receipt shape; a real sandbox fleet is an adapter choice, never a primitive.

## 14. License finding

- `e2b-dev/e2b` (SDK/CLI monorepo): **Apache-2.0** — LICENSE file in repo root, GitHub license metadata "Apache License 2.0", README "## License".
- `e2b-dev/infra` (runtime; renders as e2b-dev/runtime): **Apache-2.0** — LICENSE file in repo root, GitHub license metadata "Apache License 2.0", README "It is written in Go, licensed under Apache-2.0".
- **No GPL/copyleft/SSPL/BSL found.** Nothing to flag to Nolan. Since the verdict is ADAPT with clean-room re-derivation, no E2B-licensed code enters piging2 regardless.

## 15. Mapping to the 14 proofs

| proof_id | How this harvest serves it |
|---|---|
| 9 (create one mission) | Mission → `ExecutionAttempt` binding (`mission_id` on every attempt); capability envelope is the machine-readable "what is authorized" attached to the mission's execution |
| 10 (worker returns result) | Typed `ExecutionReceipt` (exit_code + output digests + timing) as the result object, produced at the boundary, not asserted by the worker |
| 11 (injected bad result is rejected) | Verifier checks receipt binding (execution_id ↔ mission_id ↔ digests); boundary-verification rule: never trust the in-band claim (E2B's fake-open-TCP precedent); secrets-metadata-only means an injected worker cannot exfiltrate credentials to make its lie convincing |
| 12 (fallback attempt succeeds) | Second `ExecutionAttempt`, same `mission_id`, new `execution_id`; refusal discipline (503 → keep running) means fallback is safe to retry |
| 13 (mission VERIFIED only after independent verification) | Verifier consumes the receipt stream (lifecycle events with dedupe IDs, signed webhooks), never the worker's word; `kill_reason: unknown` preserves UNKNOWN instead of upgrading it |
| 14 (replay reconstructs relevant state) | Event-sourced receipts (`event_data.execution`: started_at, vcpu/memory, execution_time) + bounded retention (`events_ttl_days`) = the replayable record |

Proofs 1–8 (ingest/render/Ask FYD/owner loop) are not served by this harvest — correctly so; this is proofs 9–14 territory.

## 16. Things piging2 must NOT copy from E2B

- The hosted-fleet dependency (API keys, billing, cloud account). The contract works with a local stub.
- Pause-with-memory semantics as a requirement: piging2 workers should be stateless-per-attempt; the *checkpoint* primitive (FS snapshot as resumable artifact) is worth keeping conceptually, memory-pause is not needed.
- E2B's fake-open-TCP firewall quirk: document it as a cautionary tale about boundary verification, not a behavior to replicate.
- Indefinite paused retention: piging2 receipts should have explicit bounded retention (`events_ttl_days`-style), not "kept forever."

---

*Worker: harvest worker (leaf). Date: 2026-10-02. No proprietary code copied. All mechanisms re-derived from official public sources listed in §1.*
