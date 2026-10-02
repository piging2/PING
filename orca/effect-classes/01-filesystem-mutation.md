# Effect Class 01: Filesystem Mutation

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `/home/nolan/ping/gateway/filesystem_authority.js`,
`gateway/generated/event_generator.js`, `gateway/routes/ingest.js`,
`BACKUP_REALITY_AUDIT.md` (2026-06-25), repo-root zip inventory (Pig).

## Who writes today

The runtime services do NOT own file writes. Writers are:
(a) the agent/operator layer via tooling (`Muse.write`, exec over SSH) —
deliverables at `/home/nolan/ping/deliverables/{ping-social-operations-manual.md,
prospect-digest.md, western-co-prospects.jsonl}`, docs, scripts;
(b) design-time codegen tools `gateway/generated/*.js`
(`event_generator.js:88-89` does `fs.mkdirSync(path.dirname(outputPath),
{recursive:true})` + `fs.writeFileSync(outputPath, json, 'utf8')`);
(c) test harnesses.
`gateway/filesystem_authority.js` only READS/scans repos.
`FILE_CREATED`/`FILE_MODIFIED` event types are registered in
`gateway/generated/event_registry.json` but **no emitter exists** — agent file
writes never touch the event journal.
Backups: `BACKUP_REALITY_AUDIT.md` (2026-06-25) proved no automated backup
system exists; zips in the repo root are manual/agent artifacts.

- **Q1 Identity:** No stable logical operation identity exists. Must be
  DERIVED: (mission/run id) + (absolute path) + (canonical content hash).
- **Q2 Provider idempotency key:** NO. The filesystem accepts no key; bolt-on
  only (check-then-write, races).
- **Q3 Queryable:** YES. `stat`/read the file; compare
  `CanonicalAuthority.hash(content)` to the expected hash
  (`filesystem_authority.js` hashes every file it compiles, lines 60-72);
  `git status`/`git diff` for repo files.
- **Q4 Reconcile:** BUILDABLE, no runtime support today. Probe = read back +
  hash compare; for repo files, diff against HEAD.
- **Q5 Reversible:** overwrite is reversible for repo files (git history) and
  deliverables (re-syncable from cloud copies per memory). Append/log writes
  and non-versioned files: irreversible without a pre-write backup.
- **Q6 UNKNOWN means:** the file may be absent, fully written, or PARTIALLY
  written (crash mid-`writeFileSync` leaves truncation; `write-file-atomic`
  exists in node_modules but is NOT used by runtime code). Downstream reads
  see stale or partial content; nothing in the journal distinguishes which.
- **Q7 Retry safe:** when the write is a full-content overwrite with
  deterministic bytes (same path + same content hash) AND the writer is
  single-threaded for that path (no concurrent mutators). Rewriting identical
  bytes is a no-op semantically.
- **Q8 HOLD:** when a partial/truncated write is detected (hash mismatch);
  when multiple writers can touch the path; when the effect is an ordered
  multi-file sequence and a downstream consumer may have read intermediate
  state.

Confidence: HIGH on mechanism (code-read); MEDIUM on retry-safety (behavioral,
not enforced).

## Port guidance

The real gap is not a better write primitive — it is EVIDENCE: agent writes
never emit `FILE_CREATED`/`FILE_MODIFIED` events despite the types being
registered. The cheapest port win: wrap the agent/tool-call write boundary
with an emit (op identity + content hash + post-write hash verify). Consider
`write-file-atomic` for consequential writes (exists in node_modules, unused).
