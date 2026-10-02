# LANE C — TASK 2: "FAKE SHA-256" CLAIM (read-only notes)

Date: 2026-09-22. Repo /home/nolan/ping @ cc6856c3b. NOTE: the task's path
`runtime/kernel/witness/cryptographic-authorities.ts` no longer exists — it was deleted in
S.16 Epic A. All analysis below is against git history + current tree.

## EVIDENCE-BACKED SEVERITY: real hazard, DORMANT, now REMOVED — LOW residual risk

### The fake algorithm (verified from git: `git show c54bd91bc^:...` — parent of deletion)
Deleted file `runtime/kernel/witness/cryptographic-authorities.ts` contained class `HashAuthority`:
- `computeSHA256(data)`: JSON.stringify → Java-style 32-bit hash loop
  `hash = ((hash << 5) - hash) + char; hash = hash & hash` → `Math.abs(hash).toString(16).padStart(64,'0')`
  i.e. a NON-cryptographic 32-bit string hash zero-padded to 64 hex chars to MIMIC a SHA-256 digest.
- `computeBLAKE3(data)`: identical fake, same loop.
- The code's own comments: "Placeholder for actual SHA256 implementation / In production, use
  crypto.createHash('sha256').update(serialized).digest('hex')" — self-admitted placeholder.
- Same file also had MerkleAuthority (Merkle root built on the fake hash), SigningAuthority,
  CertificateAuthority, WitnessBuilder — all downstream of the fake.

### Zero consumers across its entire lifetime
- Added: 0afd1a3b3 "Import constitutional replay kernel". Deleted: c54bd91bc "S.16 Epic A:
  collapse witness/ into replay/ — 7 dead files deleted, 2 live files moved to replay/" (2026-06-27,
  ancestor of HEAD — verified via `git merge-base --is-ancestor`).
- `git log -S"cryptographic-authorities" --all` → only: import commits, deletion commits, and DOC commits
  (AGENTS.md, PHASE_22_ARCHITECTURE_REVIEW.md, PHASE_S15_PRE_AUDIT_READINESS_REPORT.md, "Phase Ω" doc overwrites).
  NO .ts/.js commit ever added an import of the module.
- `git grep -l "cryptographic-authorities" c54bd91bc^` (parent of deletion) → only
  `runtime/kernel/AUDIT_REPORT.md` doc mentions; zero code imports. Commit message itself:
  "Deleted (all dead, zero imports from outside witness/): cryptographic-authorities.ts
  (fake SHA-256 bit-shift, never used)".
- Current tree: zero .ts/.js references to `computeSHA256`/`computeBLAKE3` and zero references to the
  deleted module path.

### It NEVER participated in identity/hashes/signatures
- Canonical event/object IDs, event hashes, signatures: no live path ever reached the fake.
  The real authority was already in use before deletion: AGENTS.md (aaec592bd:217) records
  "Fake computeSHA256() quarantined — witness/cryptographic-authorities.ts deleted. Zero imports
  from outside witness/. All canonical code already used CertificateAuthority.sha256 (real NIST FIPS 180-4)."

### The superseding real HashAuthority (verified live)
- `runtime/kernel/replay/certificate_authority.ts` — `static sha256(input: string)` is a genuine
  pure-TypeScript NIST FIPS 180-4 implementation (verified by reading: correct K constants
  0x428a2f98..., correct initial values 0x6a09e667..., Merkle-Damgård padding). Header: "Constitutional
  rule: This is the sole SHA-256 authority. All hash operations must route through this method."
- `runtime/kernel/replay/canonical_hash_authority.ts` — "CONSTITUTIONAL RULE: Uses CertificateAuthority
  for SHA-256 (sole hash authority)"; delegates to CertificateAuthority.
- Live consumers (current tree): `runtime/adapters/postgres_event_store.ts`,
  `runtime/kernel/replay/witness_authority.ts`, `canonical_hash_authority.ts`, `merkle_tree.ts`,
  `index.ts`, `runtime/kernel/repository/repository-authority.ts`,
  `runtime/kernel/commit-service/src/engines/identity_engine.ts`, `gateway/replay_authority.js`,
  `gateway/verification_pipeline.js`.
- `constitutional-authorities.yaml` lines 28-47: CanonicalHashAuthority entry documents the fake as a
  `duplicates:` item with evidence "Provides computeSHA256() that is NOT real SHA-256 (bit-shift string
  hash)... action_severity: CRITICAL", action "Delete cryptographic-authorities.ts fake hashes." —
  action EXECUTED (file gone; only the yaml text and docs remain stale).

### Residual risks (not patched — read-only lane)
1. `constitutional-authorities.yaml` still lists STALE paths (`runtime/kernel/witness/certificate_authority.ts`,
   `runtime/kernel/witness/canonical_hash_authority.ts`) and the deleted fake under `duplicates:`; also says
   `status: missing_package # kernel/hash/ does not exist yet` — the planned kernel/hash/ package was never
   created (authority lives in replay/ instead). Doc staleness only.
2. The yaml also notes "~67 hash computation sites, only 3 route through canonical" (line 380-384) —
   that is a SEPARATE, live finding (hash-computation sprawl), not the fake; worth a follow-up read but
   outside this task's scope.

## Evidence contradicting this conclusion
- If any commit had added a code import of the module, severity would escalate; `git log -S` across --all
  shows none — but this is a string search, so an import via a re-exported barrel or dynamic
  `require(variable)` would not match. Mitigation: at parent-of-deletion, a full-tree `git grep` for the
  module path in ALL files (not just .ts/.js) returned only AUDIT_REPORT.md doc lines.
- The deletion commit c54bd91bc is the duplicate of e6c744f82 (same message, parallel lineage like the
  aaec592bd/d596aa596 pairs in this repo); I verified c54bd91bc IS an ancestor of current HEAD, so the
  deletion is in-force on this branch.
