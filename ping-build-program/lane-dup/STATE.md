# LANE DUP — ARCHITECTURE DUPLICATION DETECTOR

Status: BUILDABLE (continuous sweep in progress)
Scope: /home/nolan/projects/ping on the Pig (branch fyd-factory, HEAD e48ef710, dirty WIP — read-only, no writes, no commits).

## Ledger
- 2026-09-23 ~19:40 RESEARCHED: OWNERSHIP.md charter; lane-bcq (evidence/harvest/kit dirs), lane-g (STATE.md + work/probe scripts + ask-path-dump.txt), lane-l (STATE.md + secret broker handle contract), phase0 (event authority trace in progress).
- 2026-09-23 ~19:55 SWEPT (pass 1, read-only via pigwsl-exec.sh): identity generators, hash/canonicalization implementations, event stores, registries, provenance models, config authorities, secret handling, infrastructure registries. Findings recorded in DUPLICATION-SWEEP.md.
- 2026-09-23 ~20:25 SWEPT (pass 2, lane-state review — no repo access): all 20+ lane STATE.md files, COORDINATOR-STATUS.md, integration requests, lane-n LINEAGE-DESIGN.md (full), lane-o DEPENDENCY-INDEX-DESIGN.md (delegation lines), lane-g CONTEXT-COMPILER-DESIGN.md (line 499).
- 2026-09-23 ~20:30 ISSUED: lineage convergence verdict (R-01) — lane N's open question answered. Filed lane-n/DUP-FINDING-lineage-verdict.md. Rule: backward-walk logic lives only in tracer.ts `traceClaim`; lane N's query functions 1/5 delegate; functions 2/3 + LineageEdge/Index/ActionRecord/tombstones are AUTHORITY-IN-FORMATION (no incumbent). Lane N implements; DUP classified.
- 2026-09-23 ~20:30 CREATED: DUP-REGISTRY.md (R-01..R-26) — every mechanism pair examined, classification, verdict, status. Living doc; DUPLICATION-SWEEP.md remains the pass-1 evidence log.

## Lane-overlap findings tonight (tonight's lane work vs repo)
- VERDICTED: lane N vs LANE-LIN tracer — NOT duplicates; one stack, two layers, one home (src/fyd/lineage/). Full verdict in R-01.
- CONFIRMED CONVERGING: lane G adopted src/fyd/ask/context-compiler.ts as the base (design line 499 names it explicitly; no third module). Coordinator had already redirected lane G ~19:58.
- CONFIRMED CONVERGED: lane K taxonomy (13 classes) vs BCQ testkit ErrorClass — coordinator applied UNSUPPORTED + assertion fix; both harnesses 18/18 green. Lane K taxonomy is AUTHORITY; testkit enum is a DERIVED mirror with a named drift guard (lane K §8).
- NEW OPEN duplicate from lane E: dual schema→component mapping (SCHEMA_COMPONENTS table vs registry.ts acceptsSchemas "only place" header) — R-07. Converge via lane E's ranked-tester ADAPT.
- Lane O delegates lineage refresh + lineage queries to lane N (design :85, :250) — no second lineage stack; shared-derivation contract is the open item (R-02).
- Lane J's whyChanged delegates to lane N/O — no duplicate; verify at wiring (R-16).
- Lane F's spike normalize = documented ADAPTED copy (standalone benchmark); must consume the canonical module at wiring, never ship the spike copy (R-14).
- Lane A vs lane-conn16 vs lane-conn: converged-by-design (conn16 extended as deltas) (R-22).
- safe-fetch.ts pinned as the ONE fetch gate by lane D contract + lane CONN (R-24).

## Method
Semantic families, not filenames. Classification per implementation:
AUTHORITY (the one) / ADAPTER (thin consumer) / LEGACY (dormant, superseded) / DUPLICATE (competing live implementation) / DERIVED (rule pinned to an external authority) / UNKNOWN.

## BLOCKED (exact blocker)
- Pass-2 repo sweep (src/services, api routes, fyd/refresh, fyd/net, fyd/capabilities, fyd/resolve; proposalDigest divergence re-verify) is BLOCKED: Pig SSH broken pipe 2026-09-23 ~20:15 MDT (pigwsl-exec.sh hung 90s+, echo probe returned "client_loop: send disconnect: Broken pipe"). Transient infra, not a repo issue. Retry on next pass; no repo access was needed for the lane-state review.

## Escalations to coordinator
- Oracle stack vs build-program output canonicality (lane-oracle found live P18-era stack with config drift: hand-run containers, node 18 vs repo engines 24.x) — Nolan's morning decision, not DUP's. Recorded in DUP-REGISTRY.md escalations.
- lane-xexec's 13 harvested execution semantics are research-only; if they land natively, DUP must converge them onto the mission/retry authorities (R-12) before a second execution engine exists.

## NEXT
1. Retry pass-2 repo sweep when Pig SSH recovers: src/services, api routes, fyd/refresh, fyd/net, fyd/capabilities, fyd/resolve; proposalDigest divergence re-verify (R-05).
2. Verify at wiring (not before): lane G extended context-compiler rather than rebuilding; lane F consumed canonical normalize; lane R imported lane-K taxonomy enum; lane N's queries delegate to traceClaim.
3. Watch lane-l: when the broker lands, confirm env-scattered custody converges onto it.
4. Watch lane-bcq/conn: first business connector must not create a second connector registry alongside src/lib/infrastructure/.
5. Re-sweep after any lane lands implementation designs.
