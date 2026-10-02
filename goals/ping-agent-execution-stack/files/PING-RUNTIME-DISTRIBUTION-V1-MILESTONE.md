# PING Runtime Distribution v1 — migration milestone

**Directive:** Nolan, 2026-09-19. This is the next migration milestone for the convergence program.

## Goal

Separate source/history/audit artifacts from runtime state. Oracle must not become a mirror of the enormous development repository. It receives a deliberately built PING runtime distribution containing only executable code, required schemas/config, package manifests, and deployment files. Ledgers, .graph, reports, historical event-queue JSON, worktrees, test corpora, generated audits, archived material, and Git archaeology stay outside the production runtime.

"Get rid of artifacts" means **exclude them from the runtime distribution**, never delete them from Git.

## Architecture decision: option 3 now, evolving into option 4

| Option | Oracle contains | Verdict |
|---|---|---|
| 1. Clone whole repo | Everything | Rejected: artifacts/WIP leak into production |
| 2. Docker build from whole repo | Lighter images, huge checkout | Rejected: build context can ingest junk |
| 3. Runtime allowlist bundle | Only explicitly reachable runtime files | **Adopt now**: clean, auditable, needs dependency-closure tooling |
| 4. Build artifacts/images elsewhere | Oracle receives only OCI images + env | **Evolve here**: cleanest production host, needs build/publish pipeline |
| 5. Distroless/single executable | Binaries + config | Premature while authority convergence is moving |

## The build boundary: runtime-manifest.json

A manifest that allowlists runtime roots/components (examples, not final: gateway/bootstrap, ping-runtime/events, ping-runtime/orchestration, ping-runtime/workers, runtime/kernel/replay, runtime/authorities, required schemas, required migrations, package manifests/lockfiles). The agent derives the actual closure from imports.

Pipeline:

```
Full repository
      |
Runtime manifest (allowlist)
      |
Dependency-closure validation
      |
Runtime staging directory
      |
Container image
      |
Oracle
```

The build **fails** if runtime code tries importing anything outside the approved distribution. Constitutional property: **production cannot accidentally depend on an audit artifact.**

## Three independent deliverables

- **PING SOURCE**: everything required for development and constitutional history.
- **PING RUNTIME**: only executable production components.
- **PING EVIDENCE**: ledgers, certification results, replay corpora, provenance, SBOM/image digest, and proof of exactly what produced the runtime.

```
SOURCE ───────┐
              │ build
              v
          RUNTIME ─────────> Oracle
              │
              │ hash / manifest
              v
          EVIDENCE
```

Oracle does not need the source repository once container-image deployment matures. ARM64 verified: ping-core-01 (129.146.60.17), Ubuntu 24.04 ARM64. We build/publish linux/arm64 runtime images and transfer/pull the immutable image.

## Keep-off-Oracle list (unless dependency tracing proves otherwise)

.graph/, execution ledgers, governance probe matrices, commissioning reports, migration reports, screenshots, generated audits, historical event-queue JSON, replay test corpora, test fixtures, archived implementations, .tmp.driveupload, development worktrees, Git history, Markdown architecture documentation, old runtime implementations. These stay in the development repository as valuable evidence. Oracle gets the result of the evidence, not the evidence warehouse.

**Exception:** runtime evidence is not a development artifact. Witnesses, lineage records, execution results, mission state, capability decisions, or canonical events generated during actual operation may be durable runtime state. Their authoritative persistence must be determined before stripping anything.

## Hard gate: do not strip yet

Sequencing is explicit. The Event Authority forensic pass must complete first (candidates as framed: IEventAuthority, ConstitutionalEventStore, EventRepository, AcquisitionManager path; the forensic pass establishes which implementation actually owns persistence).

```
Authority proven
      |
Reachability proven
      |
Persistence proven
      |
Runtime dependency closure proven
      |
Runtime allowlist generated
      |
Everything else excluded
      |
Build ARM64 image
      |
Oracle
```

Stripping before the authority work completes risks excluding an implementation that replay or acquisition was supposed to depend on.

## Target Oracle topology (eventual)

- postgres:17
- ping-runtime:<digest>
- ping-python-executor:<digest> (when adapter is ready)
- qdrant:<digest> (only if required)
- ollama:<digest> (only if desired/required)

No ledgers. No worktrees. No .graph. Every image carries metadata naming the exact source commit(s), runtime manifest, dependency lockfile, and constitutional certification that produced it.

## Status

**MILESTONE RECORDED, GATED ON AUTHORITY FORENSICS.** No runtime stripping until the gate chain completes. Both JS and Python systems remain in source; only executable portions required for the deployed topology enter their respective runtime images.

Recorded: 2026-09-19 by Pigi, from Nolan's directive.
