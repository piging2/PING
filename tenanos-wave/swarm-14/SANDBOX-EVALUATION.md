# SANDBOX EVALUATION — SWARM 14 (resumed)

**Swarm:** 14 · **Wave:** TenantOS Autonomous Convergence
**Date:** 2026-09-23/24 · **Proposal:** P-20260923-012 (already in STATE.json, `proposed`, writer 14)
**Mission:** sandboxing evaluation for tool execution — bound autonomous tool effects.
**Resume note:** prior worker completed harvest lanes 1-5 (documented in HARVEST-DECISIONS.md),
vendored 8 source trees, then lost its runtime handle on daemon restart ~01:28 UTC 2026-09-24.
This session resumed from the on-disk checkpoint, completed the sandboxing lane (previously
undocumented), pruned the vendored trees, and filed the missing diff for P-20260923-012.

## PING problem (concrete)

TenantOS executes tools autonomously (shell commands, code, file writes, network calls) on
behalf of tenants. Today there is no execution-isolation boundary in the design: a tool runs
with the ambient authority of the worker process. One malicious or buggy tool invocation can
read another tenant's data, exfiltrate credentials over the network, fork-bomb the host, or
fill the disk. The sandbox is the enforcement point of the capability decision: every tool
effect must occur inside a jail whose profile derives from the Run's capability grant.

## Candidates evaluated

| Candidate | Source read | Pinned SHA | Verdict |
|---|---|---|---|
| nsjail (google/nsjail) | yes, vendored tree kept | f100fd917c6d3ed0fd15d868528b735cb5fb1a1a | **HARVEST (mechanism)** |
| hatchet (hatchet-dev/hatchet) | yes, lanes 2-3 | e84b24e5bc01190bc45968811abffeb8d4367fa8 | DROP for sandboxing (not a sandbox) |
| bubblewrap | literature | n/a | viable alternative, weaker policy language |
| gVisor (runsc) | literature | n/a | overkill for per-tool-call latency |
| Firecracker microVM | literature | n/a | outer-layer option only, very high complexity |
| Docker/containerd | literature | n/a | daemon attack surface, slower, root needed |
| E2B/Daytona (cloud) | literature | n/a | external dependency, opaque isolation |

Pruned vendored trees (re-fetchable in seconds via `clone.sh` at pinned SHAs, provenance
preserved in HARVEST-DECISIONS.md): hatchet, restate, fastmcp, graphiti, omniroute,
letta-archive, openhands (openhands@b0906809b3e8777491519c386d55ce32d7f4daa4 contained
no sandbox implementation - repo root only). Workspace: 171M/1817 files -> 1.5M/103 files.
Kept: nsjail tree only (the evaluation evidence).

## nsjail mechanism (source-read, vendored tree)

Policy shape: `config.proto` -> `NsJailConfig` textproto. Per-invocation config, no daemon.
- **Namespaces:** `clone_newuser/newns/newpid/newipc/newuts/newnet/newcgroup` (fields 56-63),
  all default-on. `subproc.cc:527-538` assembles clone flags from the config and calls
  `unshare(flags)` - the isolation entry point.
- **Syscall filter:** kafel seccomp-bpf policy (`seccomp_policy_file`/`seccomp_string`,
  fields 68-69; kafel compiler vendored in-tree, linked as `libkafel.a` per Makefile:47).
  `sandbox.cc:122` installs it via `prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, ...)`.
  Example `configs/home-documents-with-xorg-no-net.cfg` shows `KILL_PROCESS { ptrace,
  process_vm_readv, process_vm_writev }` default-deny style policies.
- **Filesystem:** `MountPt` bind mounts with ro default, `rw` only where declared,
  `nosuid`/`nodev`/`noexec` flags; `pivot_root` (or `no_pivotroot=false` default).
- **Resources:** rlimits (as, cpu, fsize, nofile, nproc, ...) fields 30-50; cgroup v1/v2
  caps for memory, pids, cpu (`cgroup_pids_max`, `cgroup_cpu_ms_per_sec`); `time_limit`.
- **Network:** `clone_newnet=true` default with no interfaces = fully offline; or
  `traffic_rule` egress allowlists, or user-mode networking (`user_net` pasta/nstun).
- **Privilege:** `keep_caps=false` default, `no_new_privs` on (field 26), uid/gid maps
  for root-in-jail-is-nobody-outside.

**Assumed authority:** nsjail assumes it is the supervisor of one process tree: it owns the
jail setup, then gets out of the way (mode ONCE). It does not schedule, queue, or journal -
no second orchestrator risk.

## Failure modes

- Shares the host kernel: a kernel exploit escapes the jail. Mitigation: default-kill
  seccomp shrinks reachable syscall surface; keep nsjail pinned and updated; microVM outer
  layer remains a future option, not a now-requirement.
- Policy too tight breaks legitimate tools (node/python need broad syscalls) -> per-class
  profiles, each tested; fail closed = tool errors loudly, never runs unsandboxed.
- Linux-only: cannot run on macOS dev machines -> sandbox tests gate on Linux CI.
- LISTEN/RERUN modes are server modes; TenantOS uses ONCE only (one jail per tool call).
- `seccomp_unotify` tracing adds supervisor round-trips; start with KILL + violation
  logging, add unotify effect-tracing per risk class later.

## PING comparison

The CE-002 analog and current PING design have no execution-isolation boundary: tool effects
run with ambient worker authority. nsjail supplies the missing OS mechanism without importing
a framework: it is a standalone binary, not a library; TenantOS never vendors it, only
generates its per-invocation config deterministically.

## Hatchet contrast (why it is not a sandboxing answer)

Hatchet's harvested mechanics (lanes 2-3: tenant-scoped claim, holder-bound lease CAS) bound
*who* may execute *what* - execution authorization. They say nothing about what the
executing code can touch once running. Authorization without isolation leaves the blast
radius at "everything the worker can reach." Both layers are needed; hatchet covers the
first, nsjail the second. No overlap, no second capability system.

## Red-team

- A profile that is not hash-pinned is theater: the receipt must carry `profile_hash`
  (sha256 of the canonical rendered config) and the Run's claimed profile name; mismatch
  -> reject the outcome (RESULT != VERIFIED OUTCOME).
- Ambient credentials are the classic jailbreak: `keep_env=false`, explicit `envar`
  allowlist only, never bind-mount $HOME, ~/.aws, ~/.ssh, or any credential dir.
- The sandbox bounds effects; it does not make them idempotent. Resume-after-checkpoint
  re-executes inside a fresh jail with the same `(tenant_id, run_id, step_id)` idempotency
  key (Lane 2). RETRY != IDEMPOTENCY still holds inside the jail.
- Unknown tool risk class -> strictest profile (default-kill, no net), never the open one.
  Unknown side-effect semantics fail closed.
- `profiles.ts` renders enforcement config FROM the capability decision owned by the
  constitutional sprint. It grants no authority and decides no capability: no second
  capability system, no second orchestrator, no second event authority.

## Synthetic experiment (run 2026-09-24, this kernel 7.0.0-38-generic)

nsjail needs protobuf/bison/flex to build (absent here), so the experiment exercised
nsjail's exact primitives directly: `unshare --user --map-root-user --mount --net --pid
--fork` (cf. subproc.cc:527-538), then a bind-mount of an empty dir over a planted
"other-tenant secret" (cf. MountPt is_bind), in a fresh network namespace (cf.
clone_newnet=true default).

Results: inside the namespaces the secret was unreadable (SECRET_HIDDEN), the only
interface was a down `lo`, and outbound TCP was blocked (NET_BLOCKED); outside, the
secret stayed intact and network worked. 3/3 PASS. Script was ephemeral (/tmp); the
mechanism is recorded here and in the vendored source.

Kernel support verified: unprivileged user namespaces functional
(`/proc/sys/kernel/unprivileged_userns_clone = 1`).

## Decision: HARVEST (mechanism only, never import)

**Recommendation:** adopt nsjail as the OS execution-isolation mechanism for TenantOS tool
calls. Deploy the nsjail binary alongside the executor (pinned release, not vendored
source); TenantOS generates one declarative nsjail config per capability class from
`src/tenanos/sandbox/profiles.ts`; every tool invocation runs `nsjail --config <rendered>
-- <tool> <args>` in ONCE mode. Four risk classes: `tenant-code-strict` (default-kill
seccomp, no net), `tool-standard`, `tool-egress` (traffic_rule allowlist), and
`trusted-internal` (still namespaced, for PING's own deterministic machinery).

**Delete/avoid:** do not vendor nsjail source into the repo; do not build a custom
namespace/seccomp sandbox (the mechanism is ~30 years of kernel interface plus nsjail's
hardened supervisor - reimplementing it is how sandboxes get escapes); do not use Docker
as the per-tool boundary (daemon = extra attack surface, slower, rootful by default);
defer gVisor/Firecracker to a future outer layer keyed to a real threat-model escalation.

**Classification:** nsjail -> HARVEST (external binary + config generator, no code import).
Hatchet-for-sandboxing -> DROP (authorization != isolation). Custom sandbox -> DROP
(never build). Docker-per-tool -> DROP. gVisor/Firecracker -> DEFER.

## Diff sketch (filed as P-20260923-012.diff)

`src/tenanos/sandbox/profiles.ts` (new, the proposal's claimed file):
- `SandboxProfile` - declarative profile: name, description, namespace flags, mounts,
  rlimits, cgroup caps, time limit, env allowlist, kafel seccomp string, net mode +
  egress allowlist.
- `REGISTRY` - the four risk-class profiles; `profileFor(class)` is pure and total:
  unknown class -> `tenant-code-strict` (fail closed).
- `renderNsjailConfig(profile)` - deterministic textproto rendering (canonical key order).
- `profileHash(profile)` - sha256 hex of the canonical rendering. Run record carries
  `profile_name`; the effect receipt carries `profile_hash`; `verifyReceipt` rejects
  mismatches.
- `EffectReceipt` - sandbox-observed outcome only: exit code, wall time, max RSS,
  seccomp violations, profile hash. The tool's self-reported result is never trusted
  (ACK != EFFECT).
