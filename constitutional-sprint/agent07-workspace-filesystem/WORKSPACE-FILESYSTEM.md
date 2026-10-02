# WORKSPACE + FILESYSTEM — Agent 07 report

**Agent:** 07 — WORKSPACE + FILESYSTEM · **Date:** 2026-09-23 ~20:00–21:30 MDT
**Bases:** (a) `/home/nolan/projects/ping-constitutional` @ `constitutional-convergence-v2` / `a69bb68f`
(+ my patch, uncommitted, unstaged); (b) `/home/nolan/ping` @ `refactor/runtime-authority-convergence` / `cc6856c3b`
**Mode:** read-only investigation; no commits (COMMITS CREATED: NONE); nothing staged; no live processes
touched/restarted in (b); secrets metadata-only (none encountered). Transport: `pigwsl-run.sh`
(base64 stdin-fed ssh), scp for file transfer. Per task instruction, live CODE was prioritized over
stale top-level audit `.md` files in (b) (those were treated as pointers only).
**Read first:** `authority-map/AUTHORITY-MAP.md`, `security/SECURITY-SWEEP.md` (both read).

## 0. Headline findings

1. **No `WorkspaceRegistry` exists in either base.** The name appears exactly once in the whole
   program: an unmerged worktree patch
   (`worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js:52,424`)
   that `require`s a `../workspace_registry` module that does not exist anywhere. It is a phantom
   reference. Any convergence plan that assumes a live WorkspaceRegistry is building on air.
   The live "registry" analogues in (b) are `TenantRegistry`, `DeploymentRegistry`, `RuntimeRegistry`
   (`ping-runtime/runtime/*.js`) — all in-memory, zero filesystem use.
2. **`FilesystemAuthority` (`gateway/filesystem_authority.js`) is DORMANT in the live core.** Zero
   `new FilesystemAuthority` in the main tree; the live 892-line `gateway/bootstrap/gateway_runtime.js`
   (97 `require`s) never references it. It is referenced only by audit/regression tooling. Its
   `_scanRepository` follows symlinks (`fs.stat`), a latent escape in a dormant module — patch
   PROPOSED ONLY (see §6).
3. **Two unvalidated identifier→path joins in (a), one publicly reachable.** `getPingObjectGraph(Sync)`
   (`src/fyd/data/ping-object-source.ts`) and `getPipelineManifest` (`src/fyd/media/bundle-media.ts`)
   joined a caller-supplied id straight into a path. Reachable without auth via
   `GET /api/fyd/objects/[objectId]` → `loadObjectViewBySlugOrId` → `loadObjectView` and via
   `GET /api/fyd/media?siteId=`. Traversal primitive proven at the `path.join` level
   (`../../etc/x` → `/etc/x.json`). Exfiltration is blocked downstream (sha256 graphDigest /
   manifest shape validation), but blind read + memory-DoS (whole-file `readFileSync`) remain.
   **Patched in the sprint worktree (a)** with a shared guard + regression test (§6).
4. **Path containment in (a) has no authoritative owner (UNOWNED).** Each store invented its own
   gate (sha256 filename hashing, three different regexes); the two read seams had none. The patch
   introduces one shared guard module rather than a second authority.
5. **All write paths in (a) are contained** (hash- or regex-gated segments, same-dir tmp+rename).
   The write paths in (b)'s live HTTP layer are **Postgres-backed** (`RepositoryStore`), not
   filesystem; the fixed-path file-serving routes (`gateway/routes/system.js`) use literal segments only.

## 1. Mechanism inventory

### 1a. Base (a) — sprint worktree (website repo)

| # | Mechanism (file:line) | Responsibility | Root derivation | Identifier → path | Containment | Class | Owner |
|---|---|---|---|---|---|---|---|
| A1 | `FileIdentityBindingStore` — `src/fyd/identity/file-store.ts:44` | Durable provider-account bindings, one JSON file per account, tmp+rename | `FYD_IDENTITY_DIR` env, else `join(cwd(),"data","fyd-identity")` (:23) | `accountFileKey(id)` = sha256hex(id)+".json" (`principal.ts:268-270`) | **Hashing** — 64 hex chars, fixed | LIVE | FYD identity lane |
| A2 | `readClaim`/`writeClaim` — `src/fyd/claim/store.ts:55,68` | Durable claim records, tmp+rename | `FYD_CLAIM_DIR` env, else `cwd()/data/fyd-claims` (:24) | `resourceId+".json"` gated by `isValidResourceId` = `/^[a-z0-9-]{1,64}$/` (`machine.ts:27-29`) | **Regex gate** | LIVE | FYD claim lane |
| A3 | `writeLogFile`/`ownerPath` — `src/fyd/object/owner-events.ts:375,608` | Append-only owner event logs, tmp+rename | `FYD_OWNER_DIR` env, else `cwd()/data/fyd-owner` (:370) | `objectId+".json"` gated by `/^[a-z0-9-]+$/` (:376) | **Regex gate** | LIVE | FYD object lane |
| A4 | `storeFydKeypair`/`safeIdentityDir` — `src/fyd/social/key-custody.ts:38,45` | Ed25519 dev key escrow (0600/0700) | `fydDevKeyDir()` = `FYD_DEV_KEY_DIR` env else `/home/nolan/.fyd-dev-keys` (`config.ts:21-23`) | dir name = identityId gated by `/^identity_[0-9a-f]{16}$/` | **Strict regex** | LIVE | FYD social lane |
| A5 | `storeDevKeypair`/`safeIdentityDir` — `src/lib/ping/dev-signer.ts:82,88,100` | Practice-lane dev key escrow (0600/0700) | `PING_DEV_KEY_DIR` env (required, throws if unset) | dir name = identityId gated by `/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/` | **Loose regex** — allows `:` and `.`; no `/`, `\`, NUL → no POSIX traversal, but diverges from A4 (DUPLICATE, cf. AUTHORITY-MAP Overlap 2) | LIVE | Practice BFF lane |
| A6 | `getPingObjectGraph(Sync)` — `src/fyd/data/ping-object-source.ts:258,279` | Read PING-side projection JSON, digest-verified | `FYD_PROJECTION_DIR` env else `/home/nolan/ping/var/fyd-projections` (:90) | `siteId+".json"` — **was unvalidated** | **NONE (pre-patch)** → now `assertSafeSiteId` (shared guard) | LIVE | UNOWNED (no shared guard existed) |
| A7 | `getPipelineManifest` — `src/fyd/media/bundle-media.ts:123` | Read committed media manifests, shape-validated | `join(cwd(),"src","fyd","media","manifests")` (fixed) | `siteId+".json"` — **was unvalidated** | **NONE (pre-patch)** → now `assertSafeSiteId` | LIVE | UNOWNED |
| A8 | `assertSafeSiteId`/`SITE_ID_PATTERN` — `src/fyd/data/site-id-guard.ts` (new, this patch) | Single shared path-containment guard: `/^[a-z0-9-]{1,64}$/` | n/a (pure) | n/a | The guard itself | LIVE (new) | Agent 07 patch — proposed owner for identifier→path gating |
| A9 | likes/follows stores — `src/fyd/object/likes.ts:81`, `follows.ts:80` | Per-viewer like/follow JSON, tmp+rename | `FYD_LIKES_DIR`/`FYD_FOLLOWS_DIR` env else `cwd()/data/fyd-*` | **Fixed filename** `local.json`; objectIds are JSON keys validated by `/^[a-z0-9-]+$/` + known-id allowlist (`assertKnownObject`, likes.ts:88-95) | Fixed name → no path risk | LIVE | FYD object lane |
| A10 | `claimResourceIdForUrl` — `src/fyd/claim/resource-id.ts:14` | Opaque claim ids from URLs | n/a | `"url-"+sha256hex(origin).slice(0,16)` — matches A2's regex | **Hashing** | LIVE | FYD claim lane |
| A11 | `readPreviewManifest`/`resolveLogo` — `src/fyd/preview/pipeline.ts:53,73` | Read preview/media manifests | fixed `cwd()/src/fyd/preview|media/manifests` | `objectId+".json"`; callers pass allowlisted (`BUSINESSES`, portal-rail/page.tsx:42-46) or disk-derived (`listObjectIds()`, app/page.tsx:144) ids | **Allowlist / disk-derived** (no raw URL input) | LIVE | FYD preview lane |
| A12 | `capture.ts main()` — `src/fyd/preview/capture.ts:34,83` | Playwright capture → preview manifest (operator CLI) | `repoRoot/src/fyd/preview/manifests` | argv `objectId` gated by `/^[a-z0-9-]+$/` (:36) | **Regex gate** | DORMANT (manual script) | FYD preview lane |
| A13 | `saveSnapshot`/`loadSnapshot` — `src/fyd/refresh/snapshot-store.ts:11,17` | Snapshot JSON for diffing | caller-provided `dir` | `snapshotId+".json"`; ids internally derived (`"t2-"+timestamp`, run-t2.ts:52) | No gate, but **DORMANT** (no route imports the lane; AUTHORITY-MAP #44) | DORMANT | UNOWNED |
| A14 | `generateDerivatives` — `src/fyd/media/derivatives.ts:95,109,123` | Image derivatives under `<publicDir>/<contentHash>/` | caller-provided `publicDir` (operator config) | `contentHash` = sha256 of fetched bytes (ingest.ts:154, capture.ts:52); `fileName` built from internal plan | **Hashing** (content-derived) | LIVE | FYD media lane |

Roots summary (a): `FYD_IDENTITY_DIR`, `FYD_CLAIM_DIR`, `FYD_OWNER_DIR`, `FYD_LIKES_DIR`,
`FYD_FOLLOWS_DIR`, `FYD_PROJECTION_DIR`, `FYD_DEV_KEY_DIR`, `PING_DEV_KEY_DIR` — all
operator-controlled env with sane defaults. No central registry; no `WorkspaceRegistry`.

### 1b. Base (b) — live core

| # | Mechanism (file:line) | Responsibility | Root derivation | Identifier → path | Containment | Class | Owner |
|---|---|---|---|---|---|---|---|
| B1 | `FilesystemAuthority` — `gateway/filesystem_authority.js:17` | Compile File constitutional objects from a repo path; persist cache to Postgres `filesystem_cache` | `repositoryPath` param (caller-supplied) | `path.relative(repositoryPath, filePath)` as payload label; no writes to fs (only Postgres, parameterized) | **No containment check**; scan follows symlinks (B2) | DORMANT — zero `new FilesystemAuthority` in main tree; live `gateway/bootstrap/gateway_runtime.js` (892 lines, 97 requires) never references it | UNOWNED (aspirational "Ω.65" label only) |
| B2 | `_scanRepository` — `gateway/filesystem_authority.js:112` | Recursive repo scan | (above) | n/a (read) | **Symlink escape (latent):** uses `fs.stat` (follows symlinks); no `lstat`, no link skip | DORMANT (part of B1) | — |
| B3 | `WorkspaceRegistry` | **Does not exist.** Sole reference: unmerged worktree patch `worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js:52` (`require('../workspace_registry')`) and `:424` (`new WorkspaceRegistry(this._pool, '/app/workspace')`); the required module exists nowhere. | — | — | — | PHANTOM / UNOWNED | Nobody |
| B4 | `TenantRegistry`/`DeploymentRegistry`/`RuntimeRegistry` — `ping-runtime/runtime/*.js` | Live registries wired in the gateway boot | n/a | n/a | **No fs usage at all** (in-memory + Postgres) | LIVE | Gateway runtime |
| B5 | `dump_site` — `tools/fyd-site-projection/dump.py:383` | Write digest-verified projection JSON (pairs with A6) | `OUT_DIR="/home/nolan/ping/var/fyd-projections"` hardcoded (:66) | `os.path.join(OUT_DIR, site+".json")`; `site` gated by `argv[1] in SITES` (closed key set, :443-450) | **Closed key set**; atomic `tempfile.mkstemp(dir=OUT_DIR)` + `os.replace` (:424-431) | LIVE (operator/cron) | PING FYD tooling |
| B6 | `prepare_workspace` — `scripts/workspace_builder.py:36` | Create `workspaces/<mission>/workspace.json` | `ROOT=Path(__file__).resolve().parents[1]` (:5); `workspace_root = root/"workspaces"/mission_name` (:43) | mission name gated by graph lookup (`build_workspace` returns error for unknown, :19-22); dir names cannot contain `/` | **Lookup-gated**; no explicit sanitization but not exploitable via `/` (DORMANT dev script) | DORMANT | UNOWNED |
| B7 | `RepositoryStore` — `ping-runtime/events/repository_store.js:111,171` | Object persistence behind `gateway/routes/repository.js` (`req.params.id`) | n/a (Postgres) | `object_id = $1` parameterized | **N/A** — no filesystem | LIVE | Gateway runtime |
| B8 | `createSystemRoutes` — `gateway/routes/system.js:19` | Serve fixed pipeline files over HTTP | `PING_ROOT=path.resolve(__dirname,'../../')` | literal segments only (`cache/drive_index.json`, `config/placements.json`, `content/manifest.json`, `logs/sync.log`, `logs/audit.json`) | **Literal-only** — no request-derived segments | LIVE | Gateway runtime |
| B9 | `filesystem_worker.py:25,125,146` | Repo snapshot → SQL/stdout + `.constitutional_snapshot.json` | `PING_ROOT=Path(__file__).parent.resolve()` | fixed filenames | Read scan uses `follow_symlinks=False` (`scan_files`); aggregate ids normalize separators (`os.sep`→`/`) | DORMANT (batch worker) | UNOWNED |
| B10 | `workspace/cache/config.yaml` | Content-addressed cache spec (`/workspace/cache/...`) | — | — | **Orphan:** zero readers in main tree | DORMANT | UNOWNED |
| B11 | `ConstitutionalBlockers` — `gateway/constitutional_blockers.js:93` | Build-time audit: ban JSON/Date/fs in replay-visible code | n/a | `path.normalize` + exact-match allowlists (`_jsonAllowedPaths`, `_dateAllowedPaths`) | Audit-time only, not runtime containment | DORMANT (audit tool) | UNOWNED |
| B12 | Audit/report scripts (`constitutional_audit.py`, `secret_audit.py`, `vault_hardening.py`, `generate_*_manifest.py`, …) | One-off reports | hardcoded paths, some Windows-literal (`C:/Users/nolan/PING/vault/...`) | fixed paths | Fixed-path writes; Windows-literal paths only work on Windows (dormant tooling) | DORMANT | Various |

## 2. Containment proofs (file-writing paths)

**Base (a) — every write path keeps writes inside its root:**
- A1: filename is `sha256hex + ".json"` — 64 chars from `[0-9a-f]`; `path.join(dir, name)` cannot
  escape for any input. (`principal.ts:268-270`, `file-store.ts:54-56`)
- A2/A3: `join(root, id + ".json")` with id gated by `/^[a-z0-9-]{1,64}$/` / `/^[a-z0-9-]+$/`
  (no `.`, `/`, `\`, NUL possible) — a joined path cannot contain `..` segments or become absolute
  (`path.join`, unlike `resolve`, does not discard the root on absolute second args).
  (`claim/store.ts:26-29,31-34`, `owner-events.ts:375-380`)
- A4: dir name gated by `/^identity_[0-9a-f]{16}$/` (`key-custody.ts:38-42`).
- A5: dir name gated by `/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/` (`dev-signer.ts:88-92`).
  Weaker than A4 (`:` and `.` allowed) but still traversal-free on POSIX: no `/`, `\`, or NUL,
  and a leading alnum rules out a bare `..` segment. Cross-platform note in §4.
- A9/A12: fixed filenames / argv regex-gated.
- A14: `contentHash` is computed sha256 hex of the bytes being written; `publicDir` is operator config.
- Atomicity: all (a) stores write same-dir tmp + `renameSync` (claim: `path+".tmp-"+pid`,
  owner-events: `path+".tmp"`, likes/follows: same pattern) — no cross-directory temp races,
  no partially-visible files.

**Base (b):**
- B5 (`dump.py`): `site` ∈ closed `SITES` key set; write is `mkstemp(dir=OUT_DIR)` (O_EXCL,
  random name) + `os.replace` — atomic, same-dir, no temp race.
- B7: no filesystem involved (Postgres, parameterized).
- B8: literal path segments only.
- B9: read-only scan with `follow_symlinks=False`.

## 3. Escape-path findings (static proof only — no live exploitation)

**F-AGENT07-1 — Unvalidated slug→path join, publicly reachable (base a). [PATCHED]**
- `src/fyd/data/ping-object-source.ts:262` (async) and `:283` (sync, pre-patch numbering):
  `join(projectionDir(), siteId + ".json")` with no validation of `siteId`.
- Reachability: `GET /api/fyd/objects/[objectId]/route.ts:33` (public, no in-route auth) →
  `loadObjectViewBySlugOrId(objectId)` (`by-id.ts:66`) → `loadObjectView(objectId)` (`view.ts:306`)
  → `getPingObjectGraphSync(siteId)`. Raw URL path param flows unmodified into the join.
- Second instance: `GET /api/fyd/media?siteId=` (`app/api/fyd/media/route.ts:26-36`, public) →
  `listMediaProvenance`/`getMediaProvenance` → `getPipelineManifest(siteId)`
  (`bundle-media.ts:128` pre-patch) → same unvalidated join.
- Traversal proof (node semantics, verified on Pig): `path.join("/srv/p", "../../etc/x" + ".json")`
  → `/etc/x.json`. `path.join` normalizes `..`, so any `..`-bearing id escapes the root.
- Exploitability: MEDIUM-LOW. Blind read + memory-DoS (`readFileSync` loads the whole file;
  `loadObjectView` catches all errors → 404, so no error oracle). Content exfiltration is blocked
  downstream: `parseAndVerify` recomputes the sha256 `graphDigest` and requires `meta.siteId`
  match + provenance refs (projection), and `validatePipelineManifest` requires the
  `fyd-media@2` generator stamp + shape (manifests) — an arbitrary file cannot satisfy either,
  so the route 404s. The residual risks are (i) reading large files into memory per request
  (DoS), (ii) the boundary violation itself: a read primitive outside the authorized root.
- Fix applied: shared guard `assertSafeSiteId` (`src/fyd/data/site-id-guard.ts`), wired into both
  readers; fail-closed behavior preserved (404s unchanged for unknown-but-safe ids).

**F-AGENT07-2 — Symlink-following scan in dormant FilesystemAuthority (base b). [PROPOSED ONLY]**
- `gateway/filesystem_authority.js:117`: `await fs.stat(currentPath)` follows symlinks; a symlink
  pointing outside `repositoryPath` is descended and its files read + registered as File objects.
  Primitive behavior proven on the Pig (node v22): `statSync(link).isDirectory()===true` vs
  `lstatSync(link).isSymbolicLink()===true`.
- Additionally `path.relative(repositoryPath, filePath)` for an outside file yields a payload
  `path` containing `..` — a downstream join hazard.
- Exploitability: NONE while dormant (never instantiated in the live boot). Latent only.
- Proposal: `patches/agent07-workspace/filesystem-authority-symlink-scan.md` (lstat + skip).

**F-AGENT07-3 — Phantom WorkspaceRegistry (base b).**
- The name exists only in `worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js:52,424`,
  requiring a `../workspace_registry` module that exists nowhere (verified by repo-wide find).
  It is an unmerged patch's broken reference, not a live component. Any agent or plan that treats
  WorkspaceRegistry as an authority to converge will fail closed on a missing module.

**F-AGENT07-4 — Loose identity-dir regex divergence (base a, A5 vs A4).**
- `dev-signer.ts:88` allows `:`, `.`, `_`, `-` where `key-custody.ts:38` allows only
  `identity_[0-9a-f]{16}` (AUTHORITY-MAP Overlap 2, DUPLICATE). No POSIX traversal is possible
  (no `/`, `\`, NUL; leading char alnum), but `:` is illegal in Windows path segments and `.`
  permits dot-heavy names — a latent cross-platform hazard if the practice lane ever runs on
  Windows. Not patched (behavioral change to key layout needs lane-owner decision).

**F-AGENT07-5 — `.gitignore` `data/` swallowed `src/fyd/data/` (base a). [PATCHED]**
- `.gitignore:19` `data/` matched at any depth, silently ignoring new files under the source
  directory `src/fyd/data/` (my new guard/test/config were invisible to git). Narrowed to
  root-anchored `/data/` (the actual FYD runtime-state dir); `src/fyd/data` is the only nested
  `data/` dir in `src/`, so no behavior change for anything else.

## 4. Windows / WSL / Linux path-semantics review

- The system runs on WSL (Linux). No `path.win32`/`path.posix` branching, no `ntpath`, no
  `/mnt/c` references, no drive-letter parsing in live code of either base. Case-sensitivity is
  assumed Linux-style everywhere (no case-folding of path segments).
- Hardcoded Windows paths exist only in dormant audit scripts (b): `C:/Users/nolan/PING/vault/...`
  (`constitutional_audit.py:166`, `secret_audit.py:181`, `vault_hardening.py:271,282,311`) —
  inert on WSL, would only function on a Windows host.
- `os.path.join` (Python) discards the prefix on absolute second args — relevant only where the
  second arg is untrusted; in (b) the only such join is `dump.py`'s, where the segment is
  key-gated (B5). Node's `path.join` does not discard — used consistently in (a).
- Temp-dir races: none found. (a) uses same-dir tmp+rename; (b) `dump.py` uses
  `mkstemp(dir=OUT_DIR)` + `os.replace`.

## 5. Classification summary

| Mechanism | Class | Rationale |
|---|---|---|
| A1–A5, A9–A12, A14 | LIVE | Reachable from live routes/lanes; containment proven |
| A6, A7 | LIVE (patched) | Were uncontained; now guarded |
| A8 (new guard) | LIVE | Shared containment helper, not a second authority |
| A13, B6, B10, B11, B12 | DORMANT | Scripts/audit tooling/orphan spec; no live callers |
| B1, B2 | DORMANT | Never instantiated in live boot |
| B3 | PHANTOM / UNOWNED | Name without implementation |
| B4, B5, B7, B8, B9 | LIVE | In the live boot or its tooling; contained or N/A |
| A5 vs A4 | DUPLICATE (divergent) | Two key-custody gates, different strictness |
| `workspace/` vs `workspaces/` | CONFLICTING (naming) | `workspace/cache/` (orphan spec) vs `workspaces/<mission>/` (builder output); confusingly similar, different purposes, no shared owner |
| Path containment as a concern | UNOWNED (pre-patch) | No single owner; A8 establishes the helper |

No second canonical filesystem authority was created. The authoritative owners named are the
existing lane owners; A8 is a helper, not an authority.

## 6. Patch record

### Applied in sprint worktree (a) — uncommitted, unstaged (COMMITS CREATED: NONE)
1. **New** `src/fyd/data/site-id-guard.ts` — `SITE_ID_PATTERN` + `assertSafeSiteId()`.
2. **`src/fyd/data/ping-object-source.ts`** — guard called at the top of `getPingObjectGraph`
   and `getPingObjectGraphSync`, before any path join.
3. **`src/fyd/media/bundle-media.ts`** — guard called inside `getPipelineManifest`'s try block
   (refusal → null → existing 404 behavior).
4. **New** `src/fyd/data/__tests__/site-id-path-containment.test.ts` — regression tests:
   guard accept/reject matrix; traversal id refused before I/O (sentinel file outside the root
   is never read); legitimate ids still resolve under the configured root; manifest traversal
   returns null; committed `happy-place` manifest still serves.
5. **New** `src/fyd/data/jest.config.cjs` — lane test config (repo convention).
6. **`.gitignore`** — `data/` → `/data/` (root-anchored).
- **Test result:** jest could not be executed in the worktree (`node_modules` absent; installing
  would dirty the tree). The guard — the entire security decision — is a zero-dependency module
  and was executed directly on the Pig via `node --experimental-strip-types`: 4 accept ids all
  keep `join(root, id+".json")` inside the root; 10 reject ids all throw, including `../evil`
  and `../../etc/x` which were shown to escape to `/srv/evil.json` and `/etc/x.json` pre-guard.
  The jest file follows the repo's lane-test convention for CI. The other agent's concurrent
  worktree changes (customize/route.ts, claim/identity.ts, social/*) were not touched.

### Proposed for live core (b) — NOT applied
- `~/workspace/constitutional-sprint/patches/agent07-workspace/filesystem-authority-symlink-scan.md`:
  WHY → EVIDENCE → MINIMUM CHANGE (lstat + skip symlinks in `_scanRepository`) → TEST → RESULT,
  for the dormant `gateway/filesystem_authority.js`. No live behavior change (module unwired).

## 7. Findings table (shared record format)

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| workspace | (a) `getPingObjectGraph(Sync)` | Unvalidated siteId→path join, publicly reachable; traversal primitive | `src/fyd/data/ping-object-source.ts:262,283` (pre-patch); `GET /api/fyd/objects/[objectId]/route.ts:33` → `by-id.ts:66` → `view.ts:306` | objects route / `loadObjectViewBySlugOrId` | `getPingObjectGraphSync` | (b) `dump.py` | website read seam | UNOWNED (pre-patch) | LIVE (patched) | HIGH | filesystem root containment | `FYD_PROJECTION_DIR` | agent01 (event/projection), security |
| workspace | (a) `getPipelineManifest` | Same unvalidated join class via public media API | `src/fyd/media/bundle-media.ts:128` (pre-patch); `app/api/fyd/media/route.ts:26-36` | media route | `getPipelineManifest` | media ingest pipeline | website/ask | UNOWNED (pre-patch) | LIVE (patched) | HIGH | filesystem root containment | manifests dir | security |
| workspace | (a) `site-id-guard.ts` (new) | Single shared containment guard for identifier→path joins | New file; wired at 3 call sites; guard executed on Pig (4 accept contained, 10 reject incl. escaping ids) | `ping-object-source`, `bundle-media` | `assertSafeSiteId` | — | — | Agent07 patch (helper, not authority) | LIVE | HIGH | — | — | all convergence agents (pattern to follow) |
| filesystem | (b) `FilesystemAuthority` | Exists but never instantiated in the live boot; aspirational only | `gateway/filesystem_authority.js:17`; zero `new FilesystemAuthority` in main tree; live `gateway/bootstrap/gateway_runtime.js` (97 requires) has zero references | audit/regression tooling only | — | — | — | UNOWNED | DORMANT | HIGH | — (never wired) | Postgres `filesystem_cache` (intended) | agent13 (durability), coordinator |
| filesystem | (b) `_scanRepository` | Follows symlinks via `fs.stat`; outside-root files would be read+registered | `gateway/filesystem_authority.js:117`; node primitive behavior proven on Pig | `compile()` | `fs.stat` | — | scan | UNOWNED | DORMANT (latent) | HIGH | repository-root bound | — | coordinator |
| workspace | (b) `WorkspaceRegistry` | Name has no implementation; only a broken require in an unmerged worktree patch | `worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js:52,424`; repo-wide find: no `workspace_registry.*` exists | (patch only) | — | — | — | UNOWNED | PHANTOM | HIGH | — | — | coordinator (do not plan against this name) |
| workspace | (b) `dump_site` | Projection writer is contained: closed site key set + atomic same-dir write | `tools/fyd-site-projection/dump.py:66,87-98,424-431,443-456` | operator/cron | `os.replace` | dump.py | (a) A6 | PING FYD tooling | LIVE | HIGH | — | `var/fyd-projections` | agent01 |
| filesystem | (b) `RepositoryStore` | HTTP id param never becomes a path; Postgres parameterized | `ping-runtime/events/repository_store.js:111,171`; `gateway/routes/repository.js:23,38` | repository route | `pool.query` | gateway | gateway | Gateway runtime | LIVE | HIGH | — | Postgres | agent13 |
| filesystem | (b) `createSystemRoutes` | Fixed file-serving endpoints; literal segments only, no request-derived paths | `gateway/routes/system.js:19-55`; `PING_ROOT=path.resolve(__dirname,'../../')` | HTTP GET | `res.sendFile` | — | any HTTP client | Gateway runtime | LIVE | HIGH | — | — | security (unauthenticated file serving is by design here, fixed set) |
| workspace | (a) identity/claim/owner/key stores | All write paths contained via hashing or regex gates; same-dir tmp+rename | A1–A5 rows in §1a with file:line refs | routes/lanes | `writeFileSync`+`renameSync` | lane stores | lane stores | lane owners | LIVE | HIGH | — | `FYD_*_DIR` envs | — |
| workspace | (a) `dev-signer.ts` safeIdentityDir | Loose regex diverges from FYD strict gate; POSIX-safe but cross-platform hazard | `src/lib/ping/dev-signer.ts:88-92` vs `src/fyd/social/key-custody.ts:38-42` | practice BFF | `mkdirSync`/`writeFileSync` | practice lane | practice lane | Practice BFF lane | LIVE / DUPLICATE | MEDIUM | — | `PING_DEV_KEY_DIR` | — |
| workspace | (a) `.gitignore` | Broad `data/` pattern silently ignored new source files under `src/fyd/data/` | `.gitignore:19` (pre-patch) | — | — | — | — | UNOWNED | LIVE (patched to `/data/`) | HIGH | source-tree visibility | — | all agents working in (a) |
| workspace | (b) `workspace/` vs `workspaces/` | Confusingly similar names, different purposes, no shared owner | `workspace/cache/config.yaml` (zero readers) vs `workspaces/VerifyReplay/workspace.json` (`scripts/workspace_builder.py:36`) | — | — | workspace_builder | nobody / builder | UNOWNED | DORMANT / CONFLICTING (naming) | MEDIUM | naming/ownership | — | coordinator |

## 8. Open questions / recommended follow-ups (for coordinator, not acted on)

1. **Next.js param decoding vs `%2e`/`%2f`**: the exact exploitability of F-AGENT07-1 through a
   real request depends on how the App Router decodes `%2e%2e`/`%2f` into `[objectId]` params.
   The patch makes this moot (refusal precedes I/O), but a live-framework confirmation would
   firm up the pre-patch severity rating.
2. **`dev-signer.ts` loose regex** (F-AGENT07-4): needs the practice-lane owner's call; not
   patched unilaterally since it changes key-directory naming.
3. **Dormant `FilesystemAuthority`**: coordinator should decide — wire it (with the proposed
   symlink fix), or delete/archive it, so the "Ω.65 owns File object creation" claim stops
   floating. Same for the phantom `WorkspaceRegistry` reference in the oracle-assembly worktree.
4. **jest not runnable in the worktree** (`node_modules` absent): the regression test is written
   to repo convention and the guard logic was executed directly; CI should run
   `npx jest --config src/fyd/data/jest.config.cjs`.
