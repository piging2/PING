# Oracle Critical Path — Collapsed from Six Investigations
**Date:** 2026-09-20 (updated 17:15 MDT)
**Candidate:** /home/nolan/ping @ refactor/runtime-authority-convergence @ 8b42c1b01
**Previous HEADs:** 0e3fe6ac2 → ccfef91f3 (P0 fixes) → 8b42c1b01 (Dockerfile fix)

## BLOCK (Must fix before Oracle)

### 1. ACK without durability [FL-20260920-012] — FIXED
- **Commit:** ccfef91f3
- **Fix:** emit() returns error when !this._pool, before dispatch.
- **Verified:** Null-pool emit returns error, handlers do not fire. 2026-09-20.

### 2. Event ID collision treated as success [FL-20260920-013] — FIXED
- **Commit:** ccfef91f3
- **Fix:** On conflict, fetch existing payload, compare canonical JSON. Collision → error.
- **Verified:** Code inspection confirms collision detection present. 2026-09-20.

### 3. Distribution closure [FL-20260920-014] — FIXED (definition)
- **Commit:** 8b42c1b01
- **Problem:** infrastructure/oracle/Dockerfile.gateway only copied gateway/, missing ping-runtime/ and runtime/. Also broke relative path resolution via flat COPY.
- **Fix:** Preserve structure: COPY gateway/ ./gateway/, COPY ping-runtime/ ./ping-runtime/, COPY runtime/ ./runtime/. CMD ["node", "gateway/server.js"].
- **Verified:** Structure analysis confirms ../../ping-runtime resolves from /app/gateway/. P0 markers present in source.
- **NOT VERIFIED:** Actual Docker image build (Pig credential manager failure).

## DEFER (Backlog, not release-blocking)

### 4. Health truthfulness gaps
- /health 200 when authority absent. Read failures swallowed. /ops/drift healthy when unconfigured.
- **Action:** Backlog.

### 5. Outbox durability theater
- TransactionBoundary/EventOutbox have no live instantiations.
- **Action:** PRESERVED_INACTIVE.

### 6. Product loop dead ends (Lane 10)
- MissionScheduler discards dispatchResult. Approval events have no producers.
- **Action:** Backlog for post-ORACLE_RUNTIME_PROVEN.

### 7. Seed event provenance
- First-boot seeds write fictional events.
- **Action:** Backlog.

## PRESERVED_INACTIVE

### 8. 14 fail-closed callers (Lane 3) — PRESERVED_INACTIVE
### 9. Append-only migration blocker (Lane 6) — DORMANT
### 10. FL-004 http_parser — DORMANT_DEFECT

## ORACLE PROMOTION GATE STATUS

### A. SOURCE
- [x] SHA: 8b42c1b0163783b4cd881252dfbf20ece4fcb627
- [x] Working state understood
- [x] Required fixes present (P0-012, P0-013, Dockerfile)
- [x] P0 targeted verification passed
- [x] No cross-plane commits

### B. DISTRIBUTION
- [x] Dockerfile fixed (definition)
- [x] Required dirs identified: gateway/, ping-runtime/, runtime/
- [x] Structure preserves relative requires
- [ ] **NOT PROVEN:** Image build (Docker credential failure on Pig)

### C. DATABASE / MIGRATION
- [x] No forbidden UPDATE (Lane 6)
- [ ] Prior schema representation: not verified
- [ ] Migration execution: not run

### D. STARTUP
- [ ] Postgres-unavailable behavior: not verified
- [ ] Bounded retry: not verified

### E. EVENT PATH
- [x] Durable persistence required (P0-012)
- [x] Collision fails closed (P0-013)
- [x] No memory-only success (fixed)
- [ ] Live duplicate equivalence: pending

### F. MISSION / WORK
- [ ] Event→mission path: not verified
- [ ] dispatchResult discarded (known product gap, not blocker)

### G. SECURITY — Not audited
### H. REPLAY / WITNESS — Not verified

### I. ARM64
- [x] Dockerfile uses node:18-alpine (has ARM64 variant)
- [x] Code is pure JS (no arch-specific logic)
- [x] Native deps (tree-sitter) not on startup path
- [ ] **NOT PROVEN:** Actual ARM64 image build

### J. RELEASE PROVENANCE
- [ ] **NOT ESTABLISHED:** No image built, no digest

### K. ROLLBACK
- [x] Anchor 8400deecf2a9 preserved

### L. RUNTIME / M. RESTART — Post-deployment

## DECISION

**DO NOT PROMOTE YET.**

Gate B is fixed in definition but not proven via image build. Gates I and J require a successful build.

**Blocker:** Pig Docker credential manager failure prevents image build. Error: "A specified logon session does not exist."

**Options:**
1. Fix Pig Docker credentials, then build.
2. Build on a different machine with working Docker.
3. Nolan builds manually from the fixed Dockerfile.

The Dockerfile definition is correct. The P0 fixes are in the source. Once an image builds successfully, Gates B/I/J can be verified and promotion can proceed.

## PROVENANCE

- P0 fixes: ccfef91f37f6d5388b9372ca2eb9d4a6662813c9
- Dockerfile fix: 8b42c1b0163783b4cd881252dfbf20ece4fcb627
- Ledger: FL-20260920-012, 013, 014 recorded
