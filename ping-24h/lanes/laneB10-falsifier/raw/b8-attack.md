# Lane B10 falsifier attack notes: Lane B8 (portability)

## Scope
Report: ~/workspace/ping-24h/lanes/laneB8-portability/report.md (161 lines).
Claimed: HEAD 0264d517, branch hardening/2026-09-28-vocab-ssrf, read via Pig WSL.

## Critical findings

### FALSIFIED: digest.ts does not exist in HEAD
- B8's dimension 5 (Canonical hashes) verdict: PASS, based on "The pinned algorithm `sha256-canonical-json-v1` is specified completely at `src/lib/ping/digest.ts:1-60`... The file ships a shell reproduction recipe... proven by pinned vectors (`src/lib/ping/__tests__/digest.test.ts`)."
- **Verified**: `src/lib/ping/digest.ts` is UNTRACKED (`??` in git status). It does NOT exist in commit 0264d517. `git show 0264d517:src/lib/ping/digest.ts` returns "exists on disk, but not in '0264d517'".
- B8 states: "the worktree carried ~144 dirty files; all reads above were against HEAD-tracked content, but a clean-checkout replay is the real check." This is FALSE for digest.ts. The file is not HEAD-tracked.
- **Impact**: Dimension 5's PASS verdict is based on uncommitted work. The "pinned algorithm", "test vectors", and "shell recipe" are not in the committed tree. The portability claim for canonical hashes fails at HEAD.
- The "one-authority violation" (three digest formulations) is also compromised: one of the three (digest.ts) isn't in HEAD. The actual HEAD state has dev-signer.canonicalizeJson (exists) and pipe-joined sha256 (exists), but not the pinned digest.ts.

### FALSIFIED: Mission id formula does not match HEAD
- B8 claims: Mission id = `'mc-m-' + sha256hex(['mission', agent, tenant, capability, promptDigest, idempotencyKey].join('|'))` at `src/app/api/mc/dispatch/route.ts:309`.
- **Verified at HEAD 0264d517**: `const missionId = 'mc-m-' + sha256hex(['mission', agent, tenant, capability, promptDigest, ts].join('|')).slice(0, 12);` at line 256.
- B8's formula uses `idempotencyKey`; HEAD uses `ts`. Line numbers differ (309 vs 256).
- B8 audited a worktree with uncommitted changes, not HEAD. The idempotencyKey variant may exist in the dirty worktree or a different branch.

### CONFIRMED: Journal event_id is wall-clock + random
- B8 claims: `fyd-ovl-<Date.now() base36>-<randomBytes(6) hex>` at `tools/fyd-journal-gateway/server.mjs:172-174`, NOT reconstructible.
- **Verified at HEAD**: line 160: `return `${prefix}-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;` line 303: `event_id: mintId("fyd-ovl")`.
- The substance is correct: journal overlay event_ids cannot be re-derived from the record. This is a valid PARTIAL for dimension 1.

## WEAKENED

### W1. Multiple dimensions cite uncommitted files
- Dimension 5 (digest.ts) is the clearest, but B8's method ("read directly from the stated tree this session") does not distinguish HEAD-tracked from worktree-dirty. Given 144 dirty files, other file:line citations may also be worktree-only.
- B8's falsification section says "Any cited file:line that does not match a clean checkout of 0264d517" would falsify. Digest.ts and the mission-id formula already fail this test.

### W2. The 11-dimension framework is useful but the verdicts are fragile
- Dimensions marked PASS (2, 7, 8, 10, 11) are based on code shapes that may differ between worktree and HEAD.
- Dimension 6 (Extension namespaces) FAIL is well-founded (the jev NAMESPACE_OWNERS incident is real and live).
- Dimension 9 (purge ABSENT) is likely correct but not re-verified against HEAD here.

## STRONGEST SURVIVING
- The journal event_id non-reconstructibility finding. Verified at HEAD: wall-clock + randomness, cannot be re-derived. This is a real portability limit.
- The extension namespaces FAIL (dimension 6). The missing jev NAMESPACE_OWNERS entry caused a live incident; the mechanism is ungoverned. This does not depend on worktree vs HEAD.
- The analytical framework (11 dimensions, occurrence vs semantic identity, three clocks) is useful for reasoning about portability even if specific file citations are worktree-tainted.

## WEAKEST LINK
- Worktree vs HEAD confusion, again. B8 claims HEAD 0264d517 but cites digest.ts (untracked) and a mission-id formula (idempotencyKey) that does not match HEAD (ts). The report's "all reads were against HEAD-tracked content" is false.

## Verdict lines
- STRONGEST SURVIVING: Journal overlay event_ids are wall-clock + randomness (verified at HEAD, not reconstructible); extension namespace governance is absent (live jev incident proves it).
- WEAKEST LINK: B8 audited the dirty worktree, not HEAD. Digest.ts (basis for dimension 5 PASS) is untracked; the mission-id formula (idempotencyKey at :309) contradicts HEAD (ts at :256).
- FALSIFIED: Dimension 5's PASS verdict as a HEAD claim. The pinned `sha256-canonical-json-v1` (digest.ts:1-60) with test vectors and shell recipe does not exist in commit 0264d517. The mission-id `idempotencyKey` formula does not match HEAD.
- WEAKENED: All file:line citations inherit worktree-vs-HEAD uncertainty; the "HEAD-tracked content" claim is false for at least digest.ts.
