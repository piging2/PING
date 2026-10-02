# `sec-secret-history-unrun` close-out memo

Date: 2026-09-30 ~20:08 MDT. Author: overnight execution worker (Nolan asleep; documentation only).
Backlog item: `sec-secret-history-unrun` (BACKLOG_PING.md line 556, PING.E, was OPEN).

## Layer (a): local plane VERIFIED CLOSED

**Standing finding from 2026-09-25.** The ping-perfecting-pass note (BACKLOG_PING.md line 556, recorded 2026-09-25 01:51 MDT, local plane, bounded self-heal): a proxy metadata scan on the local repo (full clone, 41 commits) found zero commits ever ADDED a file matching `*.env*/*.pem/*.key/id_rsa*/credential*/secret*/.pgpass*/token*`, and none sits in the HEAD tree. The exact `git -S <value>` content check needs the four historical credential values (never written down by design) and targets the Pig-side repo `/home/nolan/projects/pig` (absent on that plane; out of that pass's scope).

**Independent re-verification tonight, 2026-09-30 ~20:08 MDT.** I re-ran the scan myself with read-only git operations only (`git log --diff-filter=A`, `git show`, `git ls-tree -r`; no writes, no content check, no Pig access, no credential contact).

Caveat on plane: `/home/nolan/ping` does not exist on this plane (`/home/nolan` absent; no Pig access permitted). The re-verification ran against this plane's authoritative local PING clone: `~/workspace` (origin `piging2/PING`, 183 commits). This is a different clone from the 41-commit full clone scanned on 2026-09-25, so the two scans are independent corroboration, not the same check repeated.

**Method.**
1. `git log --diff-filter=A --name-only` over the full 183-commit history with the same secret-shaped patterns (`*.env*`, `*.pem`, `*.key`, `id_rsa*`, `*credential*`, `*secret*`, `.pgpass*`, `*token*`).
2. Inspected every hit. Read the added version of `orca-adapter/test/secret-redaction-selftest.js` (added in commit 9652896, "P0-SECRET-01: secret-class redaction for worker prompt construction").
3. `git ls-tree -r --name-only HEAD` filtered for the same secret-shaped patterns.

**Result: VERIFIED CLOSED on the local plane.**
- Zero commits ever added `.env*`, `.pem`, `.key`, `id_rsa*`, `*credential*`, or `.pgpass*` files. Empty result set.
- The `*token*` hits are all FYD design-token files (`fyd-product-lane/builder/tokens/`, `lane-p01/tree/src/fyd/media/media-tokens.ts`, `src/fyd/tokens/`). These are CSS/TS design tokens, not credential tokens. False positives of the broad glob, not secret-shaped files.
- The single `*secret*` hit is `orca-adapter/test/secret-redaction-selftest.js`, the P0-SECRET-01 redaction self-test. Its header states explicitly: "Synthetic secrets only." It is the redaction machinery's test, not a secret in history.
- HEAD tree: zero secret-shaped files outside those benign categories.

**Why the exact content check was not and cannot be run here.** `git -S <value>` searches history for additions/removals of an exact string. The four historical credential values were never written down by design (standing rule), so there is no value to search for on this plane. An exact content check against real values would require the value holder (Nolan or the rotation lane) and is Nolan-gated. Do not reconstruct or invent values to make the check run; that would violate the standing rule.

## Residual risk note

Risk assessed LOW, unchanged from 2026-09-25: the exposure was in Oracle tool output, swept in memory on 2026-09-21; all four values are known-dead post-rotation; two independent local-plane metadata scans (2026-09-25, 2026-09-30) found zero secret-shaped files ever added to git history; HEAD tree is clean. Remaining exposure surface, if any, is the Pig-side repo history, which this plane cannot see.

## Layer (b): Nolan-gated checklist (remainder)

Nothing below may proceed without Nolan's explicit word. Do not run the content check, do not touch the Pig, do not reconstruct values.

- [ ] **Pig-side repo history check.** Against `/home/nolan/projects/pig` (Pig-side, requires Pig access): run the proxy metadata scan (`git log --diff-filter=A` with the secret-shaped patterns) and record the commit count of the clone scanned.
- [ ] **Content check against the four historical values.** The value holder (Nolan or the rotation lane) supplies or authorizes the values under a protected path; then and only then run `git -S <value>` on the Pig-side history. Values must never be written into files, chat, logs, or this memo.
- [ ] **Record the verdict.** VERIFIED CLOSED (Pig plane) or enumerate any hit with commit, file, and remediation (rotation already complete; remediation would be history surgery or a documented acceptance).
- [ ] **Close the backlog item.** Move `sec-secret-history-unrun` to DONE_VERIFIED in BACKLOG_PING.md only after the Pig-side verdict is recorded by the value holder's lane.

## Compliance statement

Documentation only. Read-only git operations (log, show, ls-tree). No credentials touched, no content check run, no Pig access, no network probes, no secret value reconstructed or written anywhere. No other files edited; this artifact is the only write. No drift into crew lanes (FOCUS-1..10, BUG-0001, C1 perfecting pass, Muse x Codex website synthesis, FYD owner loop); none encountered.
