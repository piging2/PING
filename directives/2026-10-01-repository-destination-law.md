# Repository Destination Law — push only after proven mapping (2026-10-01 ~18:47 MDT, Nolan)

Nolan's closing instruction on this directive: "WILL YOU FIND THAT BOUNDARY YOURSELF. TAKE THAT WITH A GRAIN OF SALT." The pasted directive below is adopted as the working procedure, but Pigi's boundary judgment (next section) governs conflicts.

## Pigi's boundary judgment (binding where it conflicts)

1. AGREE: no blind pushes. Prove the local→remote ownership map first, per repo, from code purpose / git remote / commit ancestry / existing remote history / served-runtime ownership. Never from folder names.
2. AGREE: free models review, criticize, and detect duplication — but Git destination decisions and branch mutations are deterministic operator-controlled actions. The swarm does not touch repository ownership.
3. AGREE: PING product code, CRX constitutional primitives, and FYD product code stay separate. No cleanup push that mixes the product and constitutional layers.
4. HARDER LINE THAN THE DIRECTIVE: "PUSH EVERYTHING THAT IS FINISHED AND OWNED" does NOT authorize pushes. Nolan's standing rule holds: every push needs his explicit per-push authorization. Proven mapping is necessary but not sufficient.
5. GRAIN OF SALT: the directive assigns Mission Control / ORCA / MarketingOS wholesale to piging2/PING. Plausible, but the mapping must prove it file by file. The fuzziest boundary is "FYD/PING tenant code that belongs to the PING product" vs "FYD product code" — nobody hand-waves it, human or model.
6. Journal precondition already satisfied: canonical journal selected, writers converged, proof run, committed as semantic units (2026-10-01 ~18:29 MDT). No fork becomes durable in GitHub.

## The directive (Nolan's pasted text, adopted as procedure)

Tell it: do not push blindly yet. We now have a clear destination rule, but the connected GitHub account currently cannot see the repositories needed to safely execute that push from here.

GitHub connector state (checked by Nolan 2026-10-01 ~18:47 MDT):
- piging2/PING visible, remote main = 81b3248 ("Initial commit") only.
- piging2/fyd returns 404 through the connected account.
- ngesk2/crx-runtime visible at 6c4b531.
- Authenticated profile piging87, but accessible-repository listing came back empty despite direct access to some named repos.

### Desired semantic ownership

piging2/PING = PING product/runtime: tenant-facing PING implementation, Mission Control, ORCA integration, TenantOS integration, MarketingOS integration, FYD/PING tenant code that belongs to the PING product.

ngesk2/crx-runtime = constitutional/runtime primitives that are genuinely CRX-owned: canonicalization/replay/witness/constitutional primitives. NOT a dumping ground for PING product code.

piging2/fyd = FYD product code only, if/when the remote is actually accessible and still canonical.

PING tenant code does NOT belong in crx-runtime merely because it uses CRX concepts. CRX primitives do NOT belong in PING merely because PING consumes them.

### Before any push — per local repo/worktree report

LOCAL PATH / SEMANTIC OWNER / CURRENT BRANCH / HEAD SHA / REMOTE URL / REMOTE EXISTS? / REMOTE DEFAULT BRANCH / AHEAD / BEHIND / DIRTY / UNTRACKED / LAST 5 COMMITS / TARGET REPO / TARGET BRANCH / PUSH SAFE? YES/NO.

Do not infer ownership from folder name. Prove from code purpose, git remote, commit ancestry, existing remote history, current served/runtime ownership.

### Push order (once mappings are proven AND Nolan authorizes each push)

1. Commit every owned semantic unit locally first. 2. Run tests on committed SHAs. 3. Independent SHA-only audit. 4. Fetch remote. 5. Compare local target against remote target. 6. Fast-forward or normal branch push only. 7. NO FORCE PUSH. 8. NO history rewrite during product convergence. 9. NO pushing mixed-authorship dirty state. 10. Report remote SHA after push.

### PING remote looks stale

Remote piging2/PING/main appears to contain only 81b324805611d75e7697cf698f6f304d8914b394 (Initial commit). DO NOT assume main is ready to receive the local integration line. First prove whether local PING work descends from that commit, has a different remote branch, was developed against another repo, or needs a deliberate convergence branch (e.g. convergence/2026-10-01) pushed first. If local history is unrelated, do not graft into main casually.

### FYD

piging2/fyd is not resolvable through the connected account. DO NOT PUSH FYD ANYWHERE ELSE AS A SUBSTITUTE. Keep FYD local/committed until the correct remote is verified. Do not silently move FYD into PING or CRX. Absorbing FYD into PING needs an explicit semantic convergence decision, not a remote-access workaround.

### CRX-RUNTIME

Receives only: CRX-owned constitutional primitives, replay/canonicalization/witness/runtime primitives, their tests, their docs. Does NOT receive: Mission Control UI, MarketingOS, PING tenant logic, FYD UI, ORCA product glue (unless genuinely CRX-owned), tenant-specific execution policy. HARVESTED CRX IDEA ≠ CRX OWNERSHIP.

### Mission Control / ORCA / MarketingOS

Stay with PING unless a specific file is proven a reusable CRX primitive. Mission Control is a PING projection surface. ORCA is PING planning/control unless a foundational primitive is separately owned. MarketingOS is a PING mission domain. Ownership test: WHO OWNS THE SEMANTICS AT RUNTIME? not WHICH REPO NAME SOUNDS LIKE THIS CONCEPT?

### Visual slice

The 8 semantic commits ending at 8a79775d remain unpushed until repo ownership is proven, mixed-authorship CSS reconciled, target branch identified, independent SHA audit passes. Do not resume cut visual items yet.

### Final report per push

REPO / LOCAL PATH / BRANCH / BEFORE LOCAL SHA / AFTER LOCAL SHA / REMOTE BEFORE SHA / REMOTE AFTER SHA / COMMITS PUSHED / FILES / TESTS / FAST-FORWARD YES-NO / FORCE USED: NO / REMOTE VERIFIED: YES / DIRTY FILES LEFT UNTOUCHED.

Goal: LOCAL TRUTH → CORRECT REMOTE → CORRECT BRANCH → TRACEABLE SHA → SERVED PROVENANCE. Not "GitHub looks clean."
