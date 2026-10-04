# OpenShell × PING: research and integration design

Date: 2026-10-03. Researched and drafted by Pigi under Nolan's order
"research open shell, start integrating it."

## What OpenShell is

NVIDIA OpenShell (github.com/NVIDIA/OpenShell, Apache 2.0, v0.1.2,
announced 2026-09-28 as part of the Open Agent Safety Platform) is an
open-source runtime for executing fleets of autonomous AI agents in
sandboxed environments with kernel-level isolation.

Three components:
- **Gateway**: control plane. Sandbox lifecycle, policy distribution,
  credential attachment, auth. Local single-user or Kubernetes/Helm.
- **Supervisor**: trusted side of the boundary. Evaluates every network
  request against policy, injects provider credentials only at approved
  endpoints, resolves DNS, relays approved traffic.
- **Sandbox**: untrusted side, shares the boundary with the agent. Owns
  the agent process tree, identifies the calling binary from trusted
  /proc data, forwards TCP/DNS to the supervisor via seccomp. Holds no
  credentials, makes no policy decisions. Freezes the agent if the
  supervisor disconnects.

Enforcement: Landlock LSM (filesystem), seccomp-BPF (syscalls, network
mediation), deny-by-default egress. Every outbound connection passes a
policy check before leaving.

Policy model: declarative YAML (`version: 1`), five sections —
`filesystem_policy`, `landlock`, `process` (locked at sandbox start),
`network_policies`, `network_middlewares` (hot-reloadable at runtime).

**Policy prover** (`openshell-prover`, Z3-backed): formally verifies that
a candidate policy is CONTAINED in an operator-owned boundary policy
before it is applied. A candidate granting anything outside the boundary
fails closed with a counterexample. Also runs standalone in CI.

**Providers**: credentials live outside the sandbox. The supervisor
resolves opaque placeholders only at policy-approved endpoints. The
agent never sees real credentials.

Runtimes: Docker, Podman, Kubernetes, MicroVM (libkrun), MXC (native
Windows, in progress per RFC 0013). Platforms: Linux x86_64/aarch64
(supported), macOS Apple Silicon (supported), Windows WSL2 + Docker
Desktop (experimental).

## Why it matters for PING

PING already thinks in these terms. OpenShell is the kernel-enforced
version of ideas PING enforces at the application layer:

| PING concept | OpenShell concept | Relationship |
|---|---|---|
| AUTHORITY.json / holds.json (machine-readable authority) | Policy YAML (declarative) | PING declares WHAT is authorized; OpenShell enforces the worker's BOUNDARY. Complementary layers. |
| authority-check.py (fail-closed gate) | Policy prover (formal verification) | The gate checks live state at dispatch; the prover checks policy containment BEFORE deployment. Stronger primitive for "what can this worker touch." |
| Engagement guard / eligibility (deterministic) | Filesystem + network policy | Eligibility picks WHICH targets; OpenShell policy bounds WHICH destinations/paths are reachable at all. |
| Secure Vault (credential custody) | Providers (credential isolation) | Same principle, runtime-enforced: credentials never enter the agent environment. |
| Intent ledger (durable intent before action) | OCSF audit logging | Both are evidence trails. OCSF is the runtime's own record of what the worker attempted (allowed AND denied). |
| ORCA WorkerRuntime.dispatch | Sandbox lifecycle (gateway) | The natural seam: dispatch spawns a sandbox with a PING-derived policy instead of an unconstrained subprocess. |

**Constitutional note (rule of one):** OpenShell is NOT a competing
authority. It does not decide what is true, what is authorized, or what
happened — PING keeps all of that. OpenShell is an enforcement
mechanism for boundaries PING declares. PING remains the authority;
OpenShell is the fence. No new kingdoms.

**Defense in depth, stated plainly:**
- PING answers: is this ACTION authorized? (authority, eligibility,
  intent, evidence, replay)
- OpenShell answers: is this WORKER confined? (filesystem, network,
  process, credentials)
A compromised or buggy worker inside a sandbox cannot reach what PING
didn't authorize even if PING's application-layer checks are bypassed.
Today a worker runs with ambient authority; OpenShell removes that.

## What was proven today (this sandbox, no Pig, no Docker)

Binaries: `openshell` CLI 0.1.2 + `openshell-prover` 0.1.2, checksums
verified against the NVIDIA release. Location:
`~/workspace/openshell-research/bin/`.

Artifacts: `~/workspace/openshell-research/policies/`
- `ping-operator-boundary.yaml` — operator-owned ceiling for outreach
  workers (deny-by-default; LinkedIn/FB/IG/X/Threads endpoints; scratch-
  only writes; unprivileged uid 1500).
- `ping-linkedin-worker.yaml` — the LinkedIn engagement worker's actual
  needs (linkedin.com:443 only; same filesystem/process posture).
- `ping-linkedin-worker-evil.yaml` — adversarial candidate: adds an
  exfiltration host, the cloud metadata endpoint, and widened filesystem.

Prover results (formal verification, not assertion):
- Honest worker policy: `within_boundary`, exit 0, coverage across
  filesystem, network_l4, network_rest, process, landlock.
- Evil candidate: `exceeds_boundary`, exit 1, counterexample names
  `host=evil.example.com:443`.

The mechanism works: least-privilege worker policies, machine-checked
against the operator boundary, fail closed with proof.

## Integration phases

**Phase 0 — DONE today.** Research, policy drafts, prover verification.

**Phase 0.5 — DONE 2026-10-04 overnight.** `ping_policy_gen.py`: PING
capability declaration -> deterministic OpenShell candidate YAML.
Deny-by-default (emits only what is declared), prover-compatible output
(include_workdir omitted -- the prover cannot verify unresolved workdirs).
Generated LinkedIn worker policy is byte-semantically identical to the
hand-written prover draft and passes `openshell-prover check` with
`within_boundary`. Tests: 4/4 green (`test_ping_policy_gen.py`).
This is the translator for the Phase 3 dispatch seam: PING declares,
OpenShell enforces.
No Pig, no Docker required.

**Phase 1 — Live sandbox proof (needs Docker; NOT the Pig yet).**
Install the gateway on a Linux host with Docker, create a sandbox with
the LinkedIn worker policy, run a read-only discovery worker inside,
and prove confinement empirically: `curl evil.example.com` from inside
the sandbox must be denied and logged (OCSF). This is the "adversarial
test" for the fence itself.

**Phase 2 — Pig worker confinement (needs: tunnel up, storage above
15%, Docker Desktop on WSL2).** Install on the Pig's WSL2 Ubuntu
(experimental path, honest caveat). Run one real engagement worker
(LinkedIn read-only discovery first — lowest blast radius) inside a
sandbox with the drafted policy. Open design question: the workers
drive Pig-local Chrome via CDP (:9223/:9224); the sandbox network
mediation of that loopback path needs a design decision (supervisor-
mediated loopback rule vs. MXC native driver when it lands).

**Phase 3 — ORCA dispatch seam.** `WorkerRuntime.dispatch` gains a
sandbox backend: each worker spawns in an OpenShell sandbox whose
policy is generated from the worker's declared capabilities
(PING declares, OpenShell enforces). Policy YAML becomes a build
artifact of the dispatch path, prover-checked in CI before deploy.
The deterministic router stays frozen; this changes WHERE workers
execute, not how they are chosen.

## Honest constraints (why Phase 1+ hasn't started)

1. **Pig tunnel down** since ~09:14 MDT today. No Pig-side work possible
   until it recovers. Nothing to do but wait; retries are automatic.
2. **Storage CRITICAL** (C: 8.36% free). Docker Desktop + sandbox images
   on the Pig need gigabytes; pulling them now violates the standing
   15% storage law. Blocked until headroom recovers.
3. **Windows/WSL2 is the experimental path.** The Pig is the least mature
   target. Linux (this sandbox class, Oracle) is the supported path.
4. **No Docker in this sandbox.** Can't run a live sandbox here without
   installing a container runtime — out of scope for this VM.
5. **Oracle host** (129.146.60.17, ARM64 Ubuntu 24.04) is the natural
   Phase-1 target (supported platform+arch), but host-mutation
   authorization there is NOT verified. Read-only inspection only until
   Nolan says otherwise.

## Decisions for Nolan

1. **Target for Phase 1:** Oracle (supported Linux/ARM64, needs your
   host-mutation authorization) or wait for Pig tunnel + storage
   (experimental WSL2 path)?
2. **Priority:** does OpenShell integration outrank the FYD backend P0s
   currently in flight? Recommendation: no — it rides alongside as a
   hardening lane, not ahead of the product loop.
3. **Scope of first confined worker:** LinkedIn read-only discovery
   (lowest blast radius) is the proposed first candidate. Agree?
