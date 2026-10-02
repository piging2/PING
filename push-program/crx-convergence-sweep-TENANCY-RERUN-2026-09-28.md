# CRX-RUNTIME CONVERGENCE SWEEP — TENANCY-RULE RE-RUN (2026-09-28 ~06:30 MDT)

Order: Nolan 06:24 MDT. HPP (Happy Place) and the piging2 website are TENANTS. EVERYTHING ELSE IS PING. Generic backend/kernel/runtime work that is not tenant-specific belongs in crx-runtime. This supersedes the T+0 sweep's cautious KEEP verdicts. Standing discipline unchanged and binding: converge proven semantics only; clean gate; push; verify remote SHA; rollback receipt; converge callers; retire proven duplication; NO manufactured abstractions; active writer → read only; one writer per semantic unit; UNKNOWN does not get pushed.

Method: re-read the code for each candidate (did not trust the T+0 summary); cloned crx-runtime @ 6c4b5317 and inspected main + constitutional-trunk for existing homes; checked branch activity dates and push state; determined tenant-scoped vs PING substrate for each.

## Re-examination verdicts

### 1. Secret redaction invariant — ACTIVE WRITER-DEFERRED
- Lives: PING repo, orca-adapter/adapter.js, branch security/secret-redaction-2026-09-28 @ 9652896. NOT yet pushed (verified via ls-remote).
- Classification: PING substrate (generic secret handling for worker prompt construction), NOT tenant-scoped.
- Existing CRX home: NONE. No secret/redaction code module in crx-runtime main or constitutional-trunk (trunk has SECRET_MANAGEMENT.md docs only, plus a checked-in credentials/client_secret.json smell — not a module).
- Active writer: YES. The secret-audit lane is pushing the branch now and owns phase-3 invariant convergence (find every live redactor, determine the home, clean checkout → fail-before → apply → pass-after → 92-probe → mutated hostile suite → consumer tests → push → rollback).
- Action: READ ONLY. Queued after that lane's handoff. One writer per semantic unit.

### 2. Vocabulary gate — ALREADY CANONICAL (reclassified)
- Lives: FYD repo src/fyd/proceduralize/vocabulary.ts, committed 0264d517 on hardening/2026-09-28-vocab-ssrf. Re-read: pure classifier, "no new authority... consumed by the existing extraction seam (structured-data.ts, microdata.ts). No store, no registry."
- Classification: PING substrate (generic observation→meaning machinery, used by every site's ingestion — not HPP-specific). The 06:26 FYD convergence determination anchors the taxonomy's authoritative semantics in the extraction pipeline's FactClass (DIRECT_FACT=OBSERVED, INFERENCE=INFERRED, DERIVED_FACT=DERIVED, USER_OVERRIDE=OWNER_ASSERTED, plus GENERATED_COPY).
- Existing CRX home: NONE. No vocabulary module in crx-runtime.
- Callers: microdata.ts, structured-data.ts only (the two canonical-ingestion paths). Single authority holds.
- Action: STAYS. Converging would manufacture an abstraction.

### 3. SSRF safe-fetch / effective-destination — ALREADY CANONICAL (reclassified)
- Lives: FYD repo src/fyd/net/safe-fetch.ts ("the ONE canonical fetch gate for FYD. Canonical home is fyd/net"; media shim re-exports). Re-read header: scheme allowlist, credential-URL rejection, per-hop DNS resolution with private-space rejection incl. IPv6 transition encodings decoded to effective IPv4, 5-hop re-validated redirects, content-type/size/timeout guards, honest residual TOCTOU note.
- Classification: PING substrate (generic URL safety for acquisition/media).
- Existing CRX home: NONE. No URL-safety module in crx-runtime.
- Callers: acquire-media.ts, ingest.ts, static-adapter.ts. Single authority holds. lane-p01/tree copy is a synced mirror, not a competing authority.
- DNS-rebinding socket-pinning gap stays HONESTLY OPEN (read-only research lane running).
- Action: STAYS.

### 4. HOLD/UNKNOWN/reconciliation — ALREADY CANONICAL (reclassified)
- Lives: PING repo feat/orca-unknown-outcome-port @ 6344c41 (last commit 2026-09-25; not active), mc/lane-c-reconcile-gate in p0/approval base.
- Classification: PING substrate (ORCA-owned execution-outcome semantics — ORCA is PING, not a tenant).
- Existing CRX home: NONE. No HOLD/UNKNOWN/outcomes/reconciliation code module in crx-runtime main or trunk.
- Action: STAYS. Existing ORCA authority holds; converging would manufacture a boundary.

### 5. Tenant/identity primitives — ALREADY CANONICAL (reclassified)
- Lives: mc/tenant-hardening @ 38c7ad0 (2026-09-27), mc/tenant-hostile-tests @ a65846d (25 hostile tests), lane-c tenant_id threading (d5d56bc), fix/broker-failclosed-containment (da64baa); crx-runtime constitutional-trunk lineage has Lane-L tenant-isolation vectors (Pig-local 74fbb74, 9 ahead of origin/constitutional-trunk, UNPUSHED).
- Classification: PING substrate — the tenancy MECHANISM is PING's (tenants are HPP + piging2 website; the mechanism isolating them is not tenant-scoped).
- Existing CRX home: PARTIAL — tenant-isolation vectors already in crx-runtime's constitutional-trunk lineage. MC-side hardening is MC-dispatch-specific (front-door + approval tenant semantics); kernel/commit-service identity_engine.ts is artifact identity, not tenant isolation. No mergeable home on main.
- Action: STAYS. The unpushed Lane-L work (74fbb74) is flagged below for the durability audit; it is already in the crx-runtime lineage, just not durable.

### 6. WRONG_JOURNAL / event / evidence / replay spine — ALREADY CANONICAL (reclassified)
- Lives: PING-owned event spine (Q-P0-04 PASS); substrate/gap2-provenance-ref @ 62d3314 (2026-09-27, shared typed provenance authority), gap3-journal-identity, stream-b visibility, jev/shadow-recorder.
- Classification: PING substrate.
- Existing CRX home: trunk already HAS its own lineage event/replay code (kernel/replay.py, event_stream.py, replay_kernel.py, api/events.py, application/event_service.py, architecture/canonical_events.py) — different scope (constitutional runtime eventing), not a missing home.
- Constitutional rule stands: never duplicate PING's event system; the spine stays singular and PING-owned. gap2 is a 213-file lane program, not a surgical proven unit — not a sweep action.
- Action: STAYS.

## Convergence ledger

- DISCOVERED: 6 candidate semantic units re-examined
- ALREADY CANONICAL: 5 (vocabulary, SSRF, HOLD/UNKNOWN, tenant/identity, event spine — reclassified from T+0 "KEEP product-side" to PING substrate with the rightful single owner holding)
- CONVERGED: 0
- PRODUCT-OWNED: 0 (none of the six is genuinely tenant-scoped; tenant-scoped code serving only HPP or the piging2 website was not among the candidates)
- ACTIVE WRITER — DEFERRED: 1 (secret redaction invariant — secret-audit lane owns push + invariant convergence)
- SUPERSEDED: 0 (the 11 remote crx-runtime feature branches remain unrelated histories, intentional port only — unchanged from T+0)
- UNPROVEN: 0
- UNKNOWN: 0

Per converged unit (SOURCE → TARGET → SHA → INVARIANT → TEST → CALLERS → DUPLICATES → RETIREMENT → ROLLBACK): NONE — no unit met all gates (PING substrate + proven + existing CRX home + no active writer). Creating homes would manufacture abstractions, which the binding discipline forbids.

## WHAT REMAINS UNCOMMITTED?
- security/secret-redaction-2026-09-28 @ 9652896 — unpushed; secret-audit lane pushing now.
- Pig constitutional-runtime constitutional-trunk @ 74fbb74 — 9 commits ahead of origin/constitutional-trunk incl. Lane-L tenant-isolation vectors; UNPUSHED local work in the crx-runtime lineage (durability audit should capture).
- Pig FYD repo hardening/2026-09-28-vocab-ssrf @ 0264d517 — 100 commits ahead of origin/main, unpushed; plus 131–144 dirty files (builder lane's live-phase zone — read only).
- PING local branches ahead of remote: mc/tenant-hardening, mc/tenant-hostile-tests, lane-c/orca-adapter-2026-09-26, fix/broker-failclosed-containment, substrate/gap2-provenance-ref, feat/orca-unknown-outcome-port (42 ahead), and ~20 more (durability audit inventorying).
- crx-runtime remote feature branches (11): unrelated histories; intentional port only.

## SEMANTIC DEBT
- Secret redaction: repaired orca-adapter redactor vs other live redactors (narrow email redactor in lane-p01/tree mirror noted) — hunt owned by the secret-audit lane's phase 3. OPEN.
- URL safety: ONE authority holds (fyd/net/safe-fetch.ts). No live duplication. CLEAN.
- Tenant validation: trunk-lineage tenant-isolation vectors (kernel/worker scope) vs MC dispatch tenant hardening (product scope) — different layers, not proven duplicates. WATCH.
- Event writing: PING spine singular by constitutional rule; trunk lineage has its own eventing (different scope). No duplication. CLEAN.
- HOLD/UNKNOWN: single ORCA authority. CLEAN.
- Reconciliation: mc/lane-c-reconcile-gate only. No CRX counterpart. CLEAN.
- Canonicalization: kernel/commit-service canonical_engine.ts (constitutional scope) vs PING substrate/gap1 canonical work (floats refused, UTF-16 key order) — different scopes, not proven duplicates. WATCH, not converged.
- Identity: kernel/commit-service identity_engine.ts vs trunk identity-algebra docs vs Pig ping-constitutional claim/identity.ts — multiple artifacts, none proven strongest. WATCH/UNPROVEN, not converged.
- Executor outcomes: ORCA outcomes.js single. CLEAN.
- Approval checking: mc/approval-request canonical ApprovalRequest single; trunk feature/approval-effect-identity is an unmergable unrelated history. CLEAN.

## Remote verification
- crx-runtime main: 6c4b5317 — UNCHANGED (nothing pushed).
- PING secret branch: NOT yet pushed (audit lane in progress).
- Rollback: nothing to roll back (no mutations made; /tmp/crxr clone is scratch).

## Net effect of the tenancy rule on this sweep
The rule changed CLASSIFICATION, not the convergence outcome: five units moved from "KEEP (product-side)" to "ALREADY CANONICAL (PING substrate, rightful owner holds)". Future convergence of any of them is an intentional port by the owning lane, not a sweep action. The secret invariant is the one live convergence, owned by the secret-audit lane.
