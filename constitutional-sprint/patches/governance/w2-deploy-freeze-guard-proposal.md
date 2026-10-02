# PROPOSAL (unapplied): deploy-freeze guard for the CapabilityAuthority boundary

Worker W2, 2026-09-24. Propose-only. NOT installed, NOT run against any pipeline.
Status: PROPOSED ONLY — awaiting governance ruling (CP-7) and operator approval.

---

## WHY

A source-tree deploy of the gateway silently drops the live execution authority and route
authentication. The prod image `ping-gateway:devin-boundary2` bundles
`gateway/capability_authority.js` (889 lines), `gateway/exterior_auth_middleware.js`
(251 lines), `gateway/workspace_registry.js` (226 lines), `gateway/routes/capabilities.js`
(482 lines) — none exist in /home/nolan/ping @ cc6856c3b. The build is `COPY . .`
(`gateway/Dockerfile`), so any `docker build` from the current tree produces an image
without them, and the composition root's 342-line drift (middleware mounts on `/events`,
`/canonical-events`, `/ingest`, `/orchestration`, `/missions`, `/ai`, `/connectors`,
plus the `/capabilities` endpoint) disappears with no error, no warning, and no test
failing (F14: the suite cannot catch this). The loss is an auth regression on live routes
that return 401 tonight (verified: `curl :8080/events` → 401).

The minimum-change guard: a standalone pre-deploy script that fails the deploy CLOSED
whenever the required boundary artifacts are absent or unwired — in the source tree AND
in the candidate image.

## EVIDENCE

- F260: byte-exact manifest of the four live files (sizes, lines, sha256) in the prod image.
- F261: two more image-only files (`.before-phase2`, `test_mvp_auth.js`) — classified, not guarded.
- F262: 342-line composition-root diff; requires (img lines 51, 52, 106-107), instantiation
  (416-432), middleware mounts (790, 794, 798, 900, 915, 918, 920), `/capabilities` (926-929).
- F263: blast-radius table — 7 routes lose auth; `/capabilities` vanishes; 401 live tonight.
- F267: drop vector is the build itself (`COPY . .`); rc line already proves 3-of-4 drop.
- F268: files never in git history — provenance is opaque image bytes; guard checks
  presence/wiring, not provenance.

## MINIMUM CHANGE

One new file, run manually before any `docker build` / `docker tag` / `docker compose up`
of the gateway (NOT installed as a hook — operator runs it, propose-only until the CP-7
ruling names an owner). The script checks, in order, and exits non-zero with the first
named failure:

1. **Source presence:** each of the 4 manifest files exists under the source tree.
2. **Source wiring:** `gateway/bootstrap/gateway_runtime.js` contains the requires
   (`exterior_auth_middleware`, `workspace_registry`, `capability_authority`,
   `routes/capabilities`), the instantiations (`new CapabilityAuthority`,
   `new ExteriorAuthMiddleware`, `new WorkspaceRegistry`), and the middleware mounts on
   `/events`, `/canonical-events`, `/ingest`, `/orchestration`, `/missions`, `/ai`,
   `/connectors` plus the `/capabilities` mount.
3. **Candidate-image parity (optional until a build pipeline exists):** build the
   candidate with a temp tag, `docker create` it, `docker cp` the 4 files out, and
   `sha256sum`-compare against the source tree copies. Any mismatch fails closed.
   (Because the Dockerfile is `COPY . .`, steps 1+2 make 3 almost redundant — 3 is the
   defense against a context/filtered-copy change.)

Proposed script (unapplied; save as e.g. `tools/deploy-guard/capability-boundary-guard.sh`):

```bash
#!/usr/bin/env bash
# capability-boundary-guard.sh — PROPOSED ONLY (CP-7 deploy freeze)
# Fails closed (exit 1) if the CapabilityAuthority boundary artifacts are
# absent or unwired in the source tree, or differ in a candidate image.
# Usage: ./capability-boundary-guard.sh [SOURCE_TREE] [CANDIDATE_IMAGE]
#   SOURCE_TREE      default /home/nolan/ping
#   CANDIDATE_IMAGE  optional temp-built image tag to parity-check
set -u

SRC="${1:-/home/nolan/ping}"
IMG="${2:-}"
RUNTIME="$SRC/gateway/bootstrap/gateway_runtime.js"
fail() { echo "DEPLOY-GUARD FAIL: $1" >&2; exit 1; }

FILES="gateway/capability_authority.js gateway/exterior_auth_middleware.js gateway/workspace_registry.js gateway/routes/capabilities.js"
for f in $FILES; do
  [ -f "$SRC/$f" ] || fail "missing source file: $f"
done

REQUIRES="exterior_auth_middleware workspace_registry capability_authority routes/capabilities"
for r in $REQUIRES; do
  grep -q "$r" "$RUNTIME" || fail "composition root missing require: $r"
done

WIRING="new CapabilityAuthority new ExteriorAuthMiddleware new WorkspaceRegistry"
for w in $WIRING; do
  grep -q "$w" "$RUNTIME" || fail "composition root missing instantiation: $w"
done

MOUNTS="/events /canonical-events /ingest /orchestration /missions /ai /connectors /capabilities"
for m in $MOUNTS; do
  grep -q "'$m'" "$RUNTIME" || fail "composition root missing mount: $m"
done
# middleware must actually wrap the mutating mounts (not merely be required)
grep -q "exteriorAuthMiddleware.middleware()" "$RUNTIME" \
  || fail "composition root: exteriorAuthMiddleware.middleware() not used on mounts"

if [ -n "$IMG" ]; then
  CID=$(docker create "$IMG") || fail "docker create $IMG failed"
  trap 'docker rm -f "$CID" >/dev/null 2>&1' EXIT
  for f in $FILES; do
    docker cp "$CID:/app/$f" "/tmp/guard-$CID-$(basename "$f")" \
      || fail "candidate image missing: /app/$f"
    IMG_HASH=$(sha256sum "/tmp/guard-$CID-$(basename "$f")" | cut -d' ' -f1)
    SRC_HASH=$(sha256sum "$SRC/$f" | cut -d' ' -f1)
    [ "$IMG_HASH" = "$SRC_HASH" ] || fail "hash drift in $f (image != source)"
    rm -f "/tmp/guard-$CID-$(basename "$f")"
  done
fi

echo "DEPLOY-GUARD PASS: CapabilityAuthority boundary present and wired."
```

Canonical manifest (propose-only; owned by GOVERNANCE-CORE after ruling):

```yaml
# capability-boundary.manifest.yaml — versioned by governance ruling
version: 1
ruling_ref: CP-7
required_files:
  - path: gateway/capability_authority.js
    sha256: ff0eaeb836ec221923a98c75f40eb4c60a0644e73b559f48f1ae87bff540bfd9  # baseline: prod image bytes (unverified upstream, F268)
  - path: gateway/exterior_auth_middleware.js
    sha256: 26e6761de0e21ef82f71c28119d586cbe07139c725b2ccb35997d9e7629be34e
  - path: gateway/workspace_registry.js
    sha256: 18ce3a0d23b826164ebfc8afcea2dd8073b5ef3396d32bce3b07d7b27b97f458
  - path: gateway/routes/capabilities.js
    sha256: 6501b51dd8dbcfef66d206f2c9bd20743b060a5e68e7a7782e08e5c9fc0d8b41
required_mounts: [/events, /canonical-events, /ingest, /orchestration, /missions, /ai, /connectors, /capabilities]
auth_enforcement: exteriorAuthMiddleware.middleware() on every mount above
# Phase 2 (after CP-7 ruling + quarantine review): pin hashes to REVIEWED bytes, not image bytes.
```

## TEST

All steps are read-only w.r.t. production. None touch the running container, its data, or CI.

1. **Baseline (report-only):** run the script against `/home/nolan/ping` with no image arg.
   EXPECTED: FAIL at step 1 (`missing source file: gateway/capability_authority.js`) —
   proves the guard detects the current drift.
2. **Negative control:** run against a scratch checkout of the rc line (or against image
   `ping-gateway:rc-4d522a6b` as CANDIDATE_IMAGE): EXPECTED FAIL — the rc lacks 3 of 4
   files and its gateway_runtime wiring differs. Proves detection of partial drops.
3. **Positive control:** in a throwaway worktree, restore the 4 files from the prod
   image (`docker cp ping-gateway:/app/gateway/...` — read-only), apply the composition-root
   wiring from the F262 diff, run the script. EXPECTED: PASS at steps 1+2. Then build a
   candidate image from that worktree (temp tag, no push, no deploy) and run with
   CANDIDATE_IMAGE. EXPECTED: PASS at step 3 — proves the guard passes a reconciled tree.
4. **Mutation check:** in the scratch worktree, rename one file (e.g. `capability_authority.js`
   → `capability_authority.js.bak`), re-run. EXPECTED: FAIL — proves single-file sensitivity.
5. **Wire-cut check:** in the scratch worktree, remove one middleware mount line from the
   scratch gateway_runtime.js, re-run. EXPECTED: FAIL at the mount assertion.

Acceptance: all five expectations met, then the script graduates from report-only to a
manual pre-deploy gate (operator runs it; a FAILED guard blocks the build), and later to
a CI step once a deploy pipeline exists.

## RESULT

NOT EXECUTED — proposal only. Terminal state when adopted: any source-tree gateway build
that would drop the CapabilityAuthority boundary fails before an image is produced, with
the exact missing artifact named. CP-7 stays escalation-class until Nolan rules on the
canonical home (options in `fleet/governance/w2-capability-authority-home.md`).
