# Lane A spike: deterministic git observation extraction

Proves the lane-A observation model before any PING integration.
Creates throwaway git repos locally, extracts deterministic observations
with two independent engines, cross-checks them, and red-teams the wrapper.

## Run

```
cd spike
npm install          # once; installs isomorphic-git (MIT) for engine A
node run-spike.mjs   # 25 checks: determinism, cross-engine agreement, manifests
node redteam.mjs     # 12 checks: hostile tree, ref cycle, config isolation
node failure-test.mjs# 12 checks: pack bomb, corrupt repo, shallow clone, renames
```

All three must print ALL CHECKS PASSED. Packets land in `out/`
(`packet-iso.json`, `packet-cli.json`): canonical JSON, byte-deterministic.

## Layout

- `lib/common.mjs` — caps config, metadata sanitizer (ANSI/C0/bidi),
  tree-name gate (fsck rules), stable stringify, observation builders,
  shared `readRefs` enumeration (T-12).
- `engines/iso.mjs` — isomorphic-git extractor (fallback engine).
- `engines/gitcli.mjs` — git CLI plumbing extractor (primary engine,
  ground truth; pre-read blob caps, diffcore rename detection).
- `fixtures/make-repo.mjs` — rich deterministic fixture (manifests,
  openapi, compose, CI, CODEOWNERS, license, rename, merge, annotated tag,
  symlink, gitlink, spoofed author, ANSI-injection message).
- `fixtures/make-hostile.mjs` — hostile tree (raw bytes via
  `hash-object --literally`) and symref cycle fixtures.

## Key findings encoded here

- Observation model: relationships, never flat chunks; SHAs as native ids.
- Authorship is `claimed_*` until a pinned trust anchor verifies a signature.
- Exact renames are facts (certainty 1.0); inexact renames are scored hypotheses.
- isomorphic-git cannot enforce pre-read size caps and has no diff;
  the wrapper converts its hostile-tree throw into quarantine.
- `git for-each-ref` silently drops unresolvable symrefs; the shared
  `readRefs` enumerates them explicitly with a hop cap.
- Every subprocess failure becomes a typed packet problem; the extractor
  never throws on hostile input.
- /tmp is a 512M tmpfs in this sandbox: scripts clean up fixture dirs.
