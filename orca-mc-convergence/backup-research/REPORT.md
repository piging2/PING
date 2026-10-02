# Backup Research Report — Mission Control Convergence Track

**Lane:** BACKUP RESEARCH (backup lane, authorized by Batch 7 disposition #30)
**Date:** 2026-09-26
**Status:** RESEARCH ONLY. No purchases, no commitments, no provider sign-ups, no
credentials generated or read, no production access, no code changes.
**Definition of done for the eventual implementation:** REAL RESTORE TO SCRATCH
ENVIRONMENT. "A comparison spreadsheet is not a backup."

This report answers: architecture options, the eight dimensions (client-side
encryption, incremental strategy, credential isolation, retention, corruption
detection, key recovery, deletion propagation, tenant/privacy), RPO/RTO with
measurement, a concrete restore-to-scratch runbook for the top option, and a
ranked destination recommendation that returns for a decision before any money
or long-term commitment.

Prior work this builds on (not duplicates):
- `~/workspace/ops-lane/OFFHOST-BACKUP-BRIEF.md` (2026-09-24, ops lane mandate
  1A): proved the on-host baseline (daily pg_dump 03:30 UTC, daily Qdrant
  snapshot 04:00 UTC, 7-day local retention, sha256 sidecars, ops-watch
  freshness checks), measured the payload (~68.6 MB/day, ~2.1 GB at 30-day
  retention), and left the destination question escalated to Nolan (OCI bucket
  vs Pig disk vs S3 via Pig). That brief covers the DB artifacts. This report
  extends the scope to the event journal, repo/worktree state, and live
  operational state, and adds the encryption/key-recovery/erasure dimensions
  disposition #30 requires.
- Ops-watch cron checks: `check-pg-backup-fresh.sh`, `check-qdrant-snapshot-fresh.sh`
  (26h freshness + sidecar + timer-enabled gates), and `check-restore-drill-stale.sh`
  (WARN when the last PROVEN isolated restore is >30 days old; last proven
  2026-09-24).

---

## 1. What must be backed up (three domains)

**D1 — Append-only event journal (canonical history).**
Content-derived event IDs, append-only. Secrets/PII live behind revocable
references with a lifecycle (ACTIVE/STALE/SUPPRESSED/ERASURE_REQUESTED/ERASED),
never embedded immutably. The journal's erasure events are part of the history
and must be replicated in order; a restore that replays an old journal snapshot
must still respect erasure, which is only possible if erasure is cryptographic
(see section 5). The journal is also the natural low-RPO stream: because it is
append-only and content-addressed, off-host replication can be incremental to
the event and verified by recomputing IDs.

**D2 — Worktree/repo state.**
Per the 2026-09-26 worktree inventory: 6 repos, 10 live worktrees. Two facts
matter for backup design:
- R1 (PING canonical) has a GitHub remote (`github.com/piging2/PING`). Committed
  code already has off-site redundancy. Uncommitted state does not: the main
  checkout (W1) carried 7 modified tracked files and ~1511 untracked files.
- R2-R6 (fyd-build, demo-sites, hpp-clone, ping-ui-contract, fyd-write-boundary)
  have **no remote observed**. They have zero off-site redundancy today. A host
  loss takes them entirely.
- Worktrees W3/W4 live under /tmp (ephemeral by design); W10 is a non-git
  skeleton. A backup must decide per-worktree: capture or explicitly exclude.

**D3 — Live operational state.**
- Schedules: `~/workspace/cron.d/` (in the R1 repo, so covered by D2) plus the
  systemd timer units on ping-core-01 (`pg-backup.timer`, `qdrant-snapshot.timer`
  and their service files) — small text files, must be captured as files.
- Budgets, approvals, proposals: live in PostgreSQL (`crx_runtime` database:
  `ping_missions`, `mission_events`, `capability_requests`, etc.) — covered by
  the existing pg_dump pipeline.
- Ephemeral runtime state (leases, locks, `_processing` flags, in-flight
  mission cursors): **excluded by design**. Restoring a lock file from yesterday
  is how you get split-brain re-dispatch. Document the exclusion; the restore
  runbook starts from a quiesced, lock-free state.

## 2. Threat model and design constraints

Assume: the destination is untrusted storage (ciphertext only, never plaintext);
the source host can be fully lost (ping-core-01 and/or the WSL VM); the backup
operator is an automated job with minimal credentials; Nolan holds ultimate key
recovery. Out of scope for backup to solve: a tenancy-wide cloud event (noted
as accepted residual risk for a low-GB payload in the off-host brief).

Hard constraints from standing decisions:
- No new accounts/providers without Nolan's word (Batch 7: "no new cloud
  account... adds accounts, bills, and credential sprawl" — rejected).
- Tenant isolation is a binding gate; restore must re-apply it, not bypass it.
- Safety rules are never weakened for convenience; restore tooling fails closed.

## 3. Architecture options

### Option A — restic repository on OCI Object Storage (RECOMMENDED, see section 7)

One tool, one encrypted repo (or one repo per domain), covering D1+D2+D3 file
artifacts plus the DB artifacts as files inside the repo.

- **Client-side encryption:** AES-256-CTR with Poly1305-AES message
  authentication codes, per the restic design doc. Repository objects are
  content-addressed: the storage ID is the SHA-256 of the content and doubles
  as the object filename, so accidental corruption is detectable with plain
  `sha256sum`. The destination sees ciphertext and MACs only.
  (https://github.com/restic/restic/blob/master/doc/design.rst)
- **Incremental strategy:** forever-incremental snapshots. Content-defined
  chunking (Rabin fingerprinting) means only changed chunks upload; renames and
  small edits to large files re-upload only the changed parts. Repo format v2
  adds compression. For the ~68 MB/day Qdrant snapshot + small PG dump + repo
  trees, daily incrementals are small after the initial ~4-8 GB seed.
- **Credential isolation:** two jobs with two credentials. Job 1 (producers,
  on the source host, with production-read credentials): pg_dump, Qdrant
  snapshot API, journal export, git bundles, timer-unit copies — writing
  plaintext artifacts to a local staging dir only. Job 2 (shipper): reads only
  the staging dir, encrypts client-side via restic, and authenticates to OCI
  with a destination-scoped credential (backup-only API key or instance
  principal scoped to one bucket prefix). The shipper never holds a production
  database password. Restore needs neither production credential: scratch
  containers get generated throwaway credentials.
- **Retention model:** `restic forget --keep-daily N --keep-weekly M
  --keep-monthly K --prune`. Prune is the only operation that deletes data; it
  repacks and drops unreferenced chunks. Proposed: keep-daily 30, keep-weekly
  8, keep-monthly 12 (tunable; steady state a few GB, see section 6).
- **Corruption detection:** three layers. (1) Content addressing: object name =
  SHA-256(content). (2) Per-blob Poly1305 MACs verified on every read — a
  tampered or bit-rotted blob fails authentication, not silently. (3)
  `restic check` verifies repo structure; `restic check --read-data` reads and
  authenticates every pack (use `--read-data-subset` for sampled verification
  on a schedule, full read monthly).
- **Key recovery:** restic supports multiple independent keys natively
  (`restic key add/remove/list/passwd`); each key file wraps the same
  repository master key under a password-derived KEK. Plan: K1 operational
  (password file on ping-core-01, root-only, 600, used only by the shipper),
  K2 Nolan-held recovery (sealed offline copy, paper or USB), K3 break-glass
  split via Shamir 2-of-3 shares held apart. Loss of any one key is recoverable
  with any other; loss of all three is documented data loss — the same
  terminal condition as any client-side encryption, stated up front rather
  than discovered.
- **Deletion propagation:** honest limitation first — restic cannot surgically
  delete one record's bytes from history; `forget` removes whole snapshots and
  `prune` garbage-collects. Erasure of PII therefore must be cryptographic,
  not physical (see section 5): per-subject envelope encryption at the
  application layer, with per-reference DEKs destroyed on erasure. The backup
  then holds only unrecoverable ciphertext. Retention pruning bounds the
  window during which even the ciphertext exists.
- **Tenant/privacy implications:** destination holds ciphertext only; per-tenant
  tagging on snapshots (`--tag tenant:<id>`); the restore path re-applies the
  tenant gate (the scratch resolver returns tombstones for ERASED references,
  never plaintext); the backup identity is write-scoped to one bucket prefix
  and cannot read other prefixes or production.

### Option B — Keep the existing artifact pipeline + age-encrypted off-host copy (MINIMAL-CHANGE FALLBACK)

Keep what is proven (pg_dump timer, Qdrant snapshot timer, 7-day local, sha256
sidecars) and add the off-host brief's pipeline: encrypt each artifact with
`age`, upload ciphertext + sidecars + signed manifest via `oci os object put`
(or rclone), 30-day date-prefix retention, monthly pull-back drill.

- **Client-side encryption:** `age` (X25519 recipients, ChaCha20-Poly1305 AEAD;
  single static binary; multi-recipient native). age is not installed on
  ping-core-01 today (`gpg`/`openssl` are) — small install at execution time.
  age's multi-recipient model gives an elegant key-recovery story: encrypt to
  the operational recipient AND a Nolan break-glass recipient; either private
  key decrypts. The break-glass identity must itself be protected
  (passphrase-encrypted identity file, paper, or Shamir split) — "a root is
  exactly as strong as its weakest recipient."
- **Incremental strategy:** none — daily full artifacts. Acceptable only
  because the payload is tiny (~68.6 MB/day). Repo state (D2) needs a separate
  mechanism: `git bundle` per repo plus tar of untracked files, or push R2-R6
  to a remote. The journal (D1) needs a separate export job. Three mechanisms
  to maintain instead of one.
- **Credential isolation:** same two-job split as Option A (producers vs
  shipper); the shipper holds only the age recipient list (public) and the
  destination credential.
- **Retention:** explicit date-prefix purges, logged. No repacking; old
  artifacts are whole files, so erasure-window expiry is clean and auditable.
- **Corruption detection:** sha256 sidecars (already in place) + age's AEAD
  authentication on decrypt. Weaker than Option A: no structural repo check,
  no sampled full-data verification primitive; integrity is per-file only.
- **Key recovery:** multi-recipient age encryption (operational + break-glass).
  Simpler mental model than restic's key list, but per-artifact: every artifact
  must list both recipients correctly, every time. A script bug that drops the
  break-glass recipient silently degrades recovery — the drill must verify
  decryptability with the break-glass key specifically, not just the
  operational one.
- **Deletion propagation:** same crypto-shredding requirement as Option A
  (section 5). Whole-file retention makes expiry clean, but per-record erasure
  still cannot rewrite a stored artifact.
- **Tenant/privacy:** ciphertext only off-host; same tagging/manifest
  discipline; more moving parts to keep consistent.

### Option C — kopia to OCI Object Storage (VIABLE, NOT RECOMMENDED AS PRIMARY)

kopia covers the same ground as restic (dedup, compression, S3 backends,
policies) with a nicer UX (mount snapshots, server mode, fast metadata-only
verification because it segregates metadata from data).

- **Client-side encryption:** AES256-GCM-HMAC-SHA256; content IDs BLAKE2B-256;
  optional Reed-Solomon ECC parity (2% overhead) guarding blobs against
  backend bit-rot — a genuine integrity plus over restic.
- **Incremental/retention:** always-incremental snapshots; rich retention
  policies (hourly/daily/weekly/monthly/annual/latest counts); `kopia snapshot
  verify`; `kopia maintenance`.
- **Key recovery — the decisive weakness:** kopia has ONE password
  (`KOPIA_PASSWORD`). "Lose the password, lose the backups. There is no
  recovery, no reset, and no support backdoor." Recovery then depends entirely
  on external escrow (Shamir-split the password, hardware token, sealed
  envelopes). That is workable but it is a process bolted on beside the tool,
  whereas restic's multi-key escrow is a native primitive. For a system whose
  disposition explicitly lists key recovery as a research dimension, the native
  primitive wins.
- Deletion propagation, credential isolation, tenant/privacy: same shape as
  Option A (app-layer crypto-shredding still required; kopia cannot surgically
  erase one record either).

## 4. Cross-cutting designs (apply to any option)

**Backup authenticity/integrity.** Every backup set ships a cleartext
`manifest.json` + detached signature (`manifest.json.sig`, minisign/ed25519;
`ssh-keygen -Y sign` is an acceptable lighter alternative). The manifest lists:
artifact names, byte sizes, SHA-256 digests, producer tool + version
(pg_dump major, Qdrant minor, restic version, repo format), UTC timestamps,
retention class, tenant tags. Because manifest and signature are cleartext, an
operator verifies authenticity and payload hashes BEFORE decrypting anything.
restic/kopia add per-blob MACs underneath; the sha256 sidecars already in use
stay as the outer check.

**Journal replication for low RPO.** The daily snapshot gives RPO <= 24h. If
the business later needs minutes, the journal's append-only, content-addressed
shape supports a streaming sidecar: export new events since the last
replicated ID, upload, verify by recomputing content-derived IDs on receipt.
This is independent of the snapshot tool and can be added without changing the
destination. Do not conflate the two: snapshots are the restore unit; the
stream is the RPO reducer.

**Repo state without remotes.** R2-R6 have no remote. Two compliant paths:
(a) restic snapshot of the worktrees (captures dirty + untracked state
verbatim); (b) add a private remote and push (needs Nolan-authorized
credential + remote — a separate decision). Until one lands, R2-R6 have no
off-site copy at all. `git bundle` is the clean middle artifact for (a):
`git bundle create repo-<date>.bundle --all` captures all refs in one file;
untracked files ride in the file-level backup beside it.

**What is NOT backed up (documented exclusions).** Ephemeral runtime state
(leases, locks, `_processing` flags, cursors), `/tmp` worktrees, build
artifacts and `node_modules` (rebuildable; excluding them shrinks the seed
from ~3.8 GB substantially), Pig-side `C:\Windows\Temp` wrappers (volatile by
design). Exclusions live in a versioned exclude file next to the backup
config, reviewed when the tree changes.

**Version compatibility (pin it in the manifest).**
- PostgreSQL: custom-format dumps embed the pg_dump version; rule is
  restore-tool major >= dump major, and safest is dump major = restore major =
  server major. Pin the server image and the tool image by digest; record both
  in the manifest; the drill restores with the pinned tool version, not
  "whatever apt has today". pg_dump does not capture roles/tablespaces —
  add `pg_dumpall --globals-only` to the producer job.
- Qdrant: snapshots restore only within the SAME minor version
  (v1.4.1 -> v1.4.x, x >= 1). Pin the Qdrant image tag in the manifest;
  restore drill runs that exact minor. Collection aliases are NOT in snapshots
  — back them up separately (one small JSON file per collection).
- restic repo format v2: readable by restic >= 0.14; pin the restic binary
  version in the manifest and keep a copy of the binary (or its version pin)
  with the runbook.

## 5. Deletion propagation (PII erasure across backups)

This is the dimension most backup plans hand-wave. The system's own design
gives us the right hook: secrets/PII already live behind revocable references
with an ACTIVE/STALE/SUPPRESSED/ERASURE_REQUESTED/ERASED lifecycle, never
embedded immutably. The backup design extends that indirection instead of
fighting the append-only journal:

1. **Erasure is key destruction, not byte deletion (crypto-shredding).**
   Each subject's sensitive fields are encrypted under a per-subject (or
   per-batch) data encryption key (DEK) held outside the backup corpus. On
   erasure, the DEK is destroyed — one operation — and every ciphertext copy
   (live DB, replicas, journal, on-host dumps, off-host repo, old snapshots)
   becomes computationally unrecoverable simultaneously. This is the
   industry-standard answer for immutable backups and append-only logs, and it
   is recognized as valid erasure (GDPR Art. 17) provided the cipher is strong
   (AES-256), destruction is irreversible, and the destruction is auditable.
2. **The journal keeps the erasure events.** Replay of any backup still
   converges to "erased": the reference resolver returns tombstones for
   ERASED references. A restore can never resurrect PII whose key is gone.
3. **Restore-window policy (write it down).** State explicitly: restoring a
   backup taken before an erasure reintroduces ciphertext only; without the
   destroyed key it is unresolvable. The restore tooling must refuse to
   re-materialize ERASED references even if a stale key handle is present.
   Retention pruning (30-day off-host) bounds how long even the ciphertext
   persists.
4. **Residual risk, stated honestly.** PII embedded as free text in stores
   without per-subject envelope encryption (e.g., Qdrant payload fields, log
   prose) is NOT covered by crypto-shredding. Two paths: (a) add field-level
   encryption at write time for PII-bearing fields (recommended), or
   (b) document a retention-window exception: erasure completes when the
   oldest backup containing the plaintext ages out, with the window length
   stated in the policy. Do not claim (b) is (a).
5. **What the backup tool itself can and cannot do.** Neither restic nor kopia
   can surgically remove one record's bytes from history (`forget` removes
   whole snapshots; `prune` garbage-collects unreferenced chunks). Never
   promise per-record deletion at the backup layer. The guarantee lives at the
   application layer (per-subject keys); the backup layer's job is retention
   bounds + ciphertext-only storage.

## 6. RPO/RTO analysis

Definitions used: RPO = maximum age of the newest backup you might have to
fall back to (data-loss window). RTO = measured wall-clock from "restore
begins" to "restored system verified working in scratch". Both are measured,
not asserted — section 8 gives the measurement protocol.

| Domain | Current state | With Option A (daily) | With journal stream added |
|---|---|---|---|
| Event journal (D1) | ad-hoc (42-line demo file local only) | RPO <= 24h (daily export snapshot) | RPO minutes (streaming sidecar, IDs re-verified) |
| Postgres (D3) | RPO <= 24h (daily 03:30 UTC dump, 7-day local) | RPO <= 24h; RTO ~7s PG restore (measured 2026-09-24 drill) | same |
| Qdrant (D3) | RPO <= 24h (daily 04:00 UTC snapshot, ~68 MB) | RPO <= 24h; RTO minutes (68 MB upload + collection verify; to be measured) | same |
| Repos/worktrees (D2) | R1 committed code: RPO ~0 (GitHub remote). R2-R6 + all dirty/untracked: RPO = infinity (no off-site copy) | RPO <= 24h for everything restic snapshots | same |
| Schedules/timers (D3) | cron.d in R1 (covered by remote); systemd units on ping-core-01 not captured | RPO <= 24h (file-level capture) | same |

RTO estimates (to be replaced by measured numbers from the first drill):
- Postgres custom-format dump (~0.5 MB): 7s measured in the 2026-09-24
  isolated drill (temp postgres:17-alpine, generated creds, `pg_restore --list`
  + row counts).
- Qdrant snapshot (68 MB): upload to scratch Qdrant + point-count verify;
  expected 1-3 minutes on same-region bandwidth. Unmeasured — the first drill
  measures it.
- restic repo seed (~4-8 GB with node_modules excluded, compressed): initial
  pull dominated by bandwidth; daily incrementals are MB-scale. Unmeasured —
  the first drill measures both seed-pull and incremental-restore times.
- Full-stack scratch restore (all domains, end-to-end): unknown until the
  first drill; target the drill at < 1 hour wall-clock and record the actual.

What "actually-measured recovery time" means operationally: every drill run
records named timestamps (backup_start, backup_done, copy_done,
restore_start, restore_verified) into the drill log; RTO per artifact class =
restore_verified - restore_start; the reported RTO is the median of the last
3 drills per class. The existing `check-restore-drill-stale.sh` (>30d WARN)
stays as the staleness tripwire; add per-class RTO trend to the same log.

## 7. Destination recommendation (ranked; no purchase, no commitment)

Payload recap: ~68.6 MB/day of DB artifacts, ~2.1 GB at 30-day off-host
retention, plus a one-time ~4-8 GB repo/file seed. Cost does not decide this;
authorization simplicity and restore-path quality do. This ranking concurs
with and extends the 2026-09-24 off-host brief (which ranked the same top
three for the DB artifacts).

**Rank 1 — OCI Object Storage, private bucket in Nolan's existing tenancy,
client-side encrypted restic repo.**
- Why: same provider as ping-core-01 but a different failure domain from the
  VM; no new account, no new bill to explain (Always Free 10 GB tier covers
  the steady state; Standard is ~$0.0255/GB-month — single dollars at most);
  S3-compatible API so restic's S3 backend (or rclone as the transfer
  mechanism) can target it directly; one-hop restore (`get` straight back to
  a fresh host); the 2026-09-24 brief already ranked it first for the DB
  artifacts and nothing found since contradicts that.
- Needs Nolan: create one private bucket + a backup-only credential (API key
  for a backup-only user, or instance-principal dynamic group + policy
  scoped to that bucket). ~5 minutes, only he can do it.
- Residual risk: same cloud account as the VM (tenancy-wide event outside
  the threat model for this payload).

**Rank 2 — Pig local disk as a second copy (restic repo or age artifacts via
SCP).**
- Why: physically separate machine, $0 marginal, SSH path already works from
  this environment. Good as a second copy; weak as the only off-host copy
  (same building/region, commute blackout windows, known C: disk pressure).
- Needs Nolan: confirm target directory + disk headroom; host-to-Pig push
  needs a key and reachable address (Tailscale IP).

**Rank 3 — AWS S3 via the Pig's existing AWS credential presence.**
- Why: S3 is the most boring, best-documented object store; `/home/nolan/.aws`
  exists on the Pig (capability presence only — never inspected).
- Costs: two-hop path (ping-core-01 -> Pig staging -> `aws s3 cp`), needs
  `aws` CLI on the Pig and confirmation the existing credentials are valid
  for the chosen bucket; if stale, Nolan refreshes. More moving parts than
  Rank 1 for no additional safety.

Not recommended: any new cloud account / new paid backup service (credential
sprawl for a low-GB payload); restic-vs-rclone is a false choice — rclone is
a transfer mechanism and can front whichever destination is chosen.

**Tool ranking underneath the destination:** restic (Option A) first —
native multi-key escrow, content-addressed integrity with MACs, single tool
for all three domains, `check --read-data` verification primitive. age +
existing timers (Option B) as the minimal-change fallback if Nolan prefers to
keep the proven pipeline untouched. kopia third — capable, but its single
password with no native recovery is a structural weakness against the key-
recovery requirement.

## 8. Restore-to-scratch runbook (top option: restic -> OCI)

This is the concrete shape of "real restore to scratch". It restores to
isolated scratch resources only — never over live data, never with production
credentials.

**Prerequisites (generated at drill time, never production):** scratch
container host (or temp dirs on a drill VM); restic binary at the manifest-
pinned version; the break-glass or operational repo key supplied for the drill
only (break-glass key used at least once per year to prove the escrow path);
pinned `postgres:<major>-alpine` and `qdrant:<minor>` images; empty target
database; no live ports, volumes, or container names.

**Steps:**
1. `restic -r <repo> snapshots` — list; select the target snapshot ID from the
   manifest under test (usually latest, sometimes an older one to prove
   history works).
2. `restic -r <repo> check --read-data-subset=10%` (sampled) or full
   `--read-data` monthly — proves the repo is structurally sound and the
   sampled blobs authenticate before anything is restored.
3. Verify the cleartext manifest signature (`minisign -Vm manifest.json -P
   <pubkey>`), then compare manifest SHA-256s against the restored files.
   Authenticity is established before decryption is trusted for anything
   beyond restic's own MACs.
4. `restic restore <snapshot> --target /scratch/restore --tag ...` — pull the
   set: pg dump + `.sha256`, Qdrant snapshot + `.sha256`, journal export,
   git bundles, timer units, aliases JSON, manifest.
5. **Postgres:** start temp `postgres:<major>-alpine` on 127.0.0.1:<random
   port> with generated creds and a temp volume; `pg_restore --list` must
   parse (manifest check); restore into the empty DB; record row counts for
   the canonical tables (`ping_events`, `canonical_events`, `ping_missions`,
   `mission_events`) and compare against the manifest's recorded counts.
   Also restore `pg_dumpall --globals-only` output and diff role lists.
6. **Qdrant:** start temp `qdrant:<minor>` on 127.0.0.1:<random port>;
   `POST /collections/<name>/snapshots/upload` with the snapshot file;
   verify collection point count equals the manifest count; verify the
   aliases JSON applies cleanly.
7. **Journal:** replay the exported events into a scratch gateway (or a
   verifier that recomputes content-derived IDs); assert every recomputed ID
   matches, the chain is gap-free from the last verified checkpoint, and
   erasure-lifecycle events resolve references to tombstones (spot-check one
   ERASED reference: resolver must refuse plaintext).
8. **Repos:** `git clone` from each bundle into scratch; `git fsck` /
   `git bundle verify`; diff the checked-out tree against the file-level
   restore of the same worktree (they should agree on tracked files;
   untracked files come only from the file-level restore — assert the
   expected delta, don't just eyeball it).
9. **Operational state:** diff restored timer units against the currently
   installed ones (informational); load the restored `cron.d` snapshot and
   assert every enabled cron file parses.
10. **Tenant/privacy gate:** attempt to resolve a tombstoned (ERASED)
    reference and a cross-tenant read through the scratch resolver; both must
    be refused. This is the backup-specific privacy proof.

**Verification record (appended to the drill log):**
```
DRILL ts=<UTC ISO> driver=restic-oci snapshot=<id> repo_format=v2
manifest_sig: VALID | INVALID
restic_check: PASS (read-data-subset=10%) | FAIL
postgres: pg_restore --list OK; row counts match manifest -> MATCH | MISMATCH ; RTO=<s>
qdrant: point count <n> vs manifest <n> -> MATCH | MISMATCH ; RTO=<s>
journal: <n> events, IDs recomputed MATCH, erasure tombstone check PASS | FAIL ; RTO=<s>
repos: bundles verified <k>/<k>, tree diff as expected -> MATCH | MISMATCH ; RTO=<s>
tenant_gate: ERASED-refusal PASS, cross-tenant-refusal PASS | FAIL
RESULT: PASS | FAIL   (any MISMATCH/FAIL/INVALID => FAIL; quarantines the snapshot, opens a bounded repair mission)
operator: <name>
```
PASS requires every line green. The drill log is the evidence; copy-job logs
alone are never accepted as proof of restorability. Cadence: monthly; the
existing >30-day staleness WARN stays.

## 9. Unknowns and open questions (honest list)

1. **Destination authorization is still open.** The 2026-09-24 off-host brief
   escalated the bucket-vs-Pig-vs-S3 choice to Nolan; no answer is recorded in
   the files surveyed. Nothing here is purchasable or committable until he
   answers.
2. **Measured RTOs beyond Postgres.** Only the PG 7s restore is measured. The
   Qdrant, journal-replay, and full-seed numbers are estimates until the
   first drill runs the runbook in section 8.
3. **restic -> OCI S3-compat interop.** OCI Object Storage exposes an S3-
   compatible API and restic has an S3 backend; the combination is standard
   practice but has not been exercised from ping-core-01. Fallback is rclone
   as the transfer mechanism (local restic repo + `rclone sync`), which the
   off-host brief already anticipated.
4. **PG server major and Qdrant minor versions.** Needed for manifest pinning;
   resolvable on ping-core-01 at execution time (the 2026-09-16 note saw
   qdrant:v1.7.0; confirm live before pinning).
5. **Per-subject envelope encryption is assumed, not verified.** Section 5's
   crypto-shredding design assumes PII fields are encrypted under
   per-subject DEKs held outside the backup corpus. The secrets-broker work
   (revocable references, lifecycle states) suggests the architecture leans
   this way, but the lane did not audit the actual key topology. If DEKs live
   inside the backed-up database, crypto-shredding fails closed to
   retention-window expiry — verify before promising erasure.
6. **Bandwidth/latency ping-core-01 -> OCI Object Storage.** Same-region
   expected fast; unmeasured. Sizes the seed-upload window.
7. **R2-R6 remotes.** Whether to add git remotes (needs Nolan-authorized
   credential) or rely on restic snapshots is an implementation choice with a
   credential implication; flagged, not decided here.

## 10. Suggested execution order (for the decision, not now)

1. Nolan answers: destination (recommendation: OCI bucket) + who creates the
   backup-scoped credential.
2. Verify the per-subject DEK topology (unknown #5) before writing the
   erasure story into policy.
3. Generate restic repo keys (K1 operational on host, K2 Nolan-held,
   K3 Shamir break-glass); fix the known `pg_restore: command not found`
   defect on ping-core-01 (flagged 2026-09-24; the drill's `--list` step
   needs it).
4. Producer job (dumps, snapshots, journal export, bundles, timer units,
   aliases) -> staging dir; shipper job (restic backup to OCI) on the
   existing timer cadence; signed manifest per set.
5. First full drill within 7 days of go-live using the section 8 runbook;
   record measured RTOs; monthly drills after; keep the >30-day staleness
   WARN.

---
*Sources consulted: restic design docs (encryption, repo format, key
management); kopia docs (AES256-GCM-HMAC-SHA256, single-password recovery
warning, ECC, retention policies); age README (recipients, identity files);
Qdrant snapshot docs (same-minor-version restore limit, aliases excluded);
PostgreSQL dump/restore version-compatibility guidance; crypto-shredding /
GDPR Art. 17 erasure literature; this workspace's off-host brief (2026-09-24),
ops-watch backup checks, worktree inventory (2026-09-26), and journal gateway
sample.*
