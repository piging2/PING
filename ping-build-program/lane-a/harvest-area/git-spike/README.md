# Git ingestion spike (LANE A, P0 infra)

Turns one Git repository into typed, relationship-rich **acquisition packets**:
observations about Git (commits, parents, file changes, branches, tags),
never a second Git database. Git SHAs stay native. Authors are recorded
only as unverified `claimed_*` fields. Signatures are recorded as a
structured triple, never as trust.

## Run

```bash
npm test          # 20 tests: hostile-repo gauntlet G-01..G-16 + idempotency + incremental
npm run slice     # vertical slice against a local bare mirror (see below)
node src/query.mjs --state slice/state --slug ping --path src/fyd \
  --from <shaA> --to <shaB>   # dogfood query with evidence citations
```

Zero dependencies. Node 20+ and a Git CLI on PATH are the only requirements.

## Architecture

- `src/config.mjs` — the single cap module (G-16). Every bound lives here.
- `src/git-runner.mjs` — the only module that spawns Git. Read-only
  subcommand allowlist, `execFile` with `shell: false`, fixed argv,
  system/global config isolation, hooks neutralized, SSH/askpass env
  stripped, repo-local diff drivers disabled (`--no-ext-diff`).
- `src/model.mjs` — sanitization, tree-path validation, metadata
  neutralization, deterministic canonical JSON, evidence hashing.
- `src/packet.mjs` — packet builder. Protocol: snapshot refs, walk objects
  BY OID from the snapshot, re-read refs, compare. A moved ref marks the
  packet STALE; the cursor never advances on STALE or QUARANTINED packets.
  Ref-store enumeration is direct (packed-refs + loose refs + HEAD) because
  Git's own `for-each-ref`/`show-ref` silently omit unresolvable symrefs
  (cycles, dangling), which would make hostile ref configurations
  invisible instead of handled.
- `src/cursor.mjs` — incremental `OLD HEAD -> NEW HEAD` cursor and
  seen-SHA idempotency. Persists one canonical packet per ingest that
  carries new knowledge; re-ingesting the same range persists nothing.
- `src/query.mjs` — dogfood query: "what changed in <path> between <shaA>
  and <shaB>", every claim citing commit SHA + packet evidence hash.
  Unknown SHAs answer "unknown": absence reads as absence.

## Threat model

See `test/red-team.test.mjs` (G-01..G-16). Highlights:

- Malformed trees are written by a raw object writer in the tests because
  modern Git fsck-rejects them at `hash-object -w`; the ingestor
  quarantines them via path validation before any observation is built.
- Gitlinks stay opaque: submodule URLs are never read, never followed.
- Blobs are size-gated before read; a 1 GiB sparse blob is truncated by
  the cap, never loaded.
- Symlinks are data, never resolved (no checkout, no worktree, nothing
  to resolve through).
- Repo config, hooks, filters, and diff drivers are never honored:
  isolated `-c` flags, `core.hooksPath=/dev/null`, no shell.
- Signature state is a triple
  (`signature_present`/`signature_valid`/`signer_trusted`), defaulting to
  untrusted; unsigned commits are normal, not suspicious.
- Force-push / ref-move races become STALE packets; the cursor does not
  advance.

## Boundaries (not proven here)

- Packets are written as local JSONL proof material. Canonical PING event
  persistence is Phase 0's authority; integration submits normalized
  acquisition packets through that boundary when it exists.
- Pack expansion ratio and delta depth are NOT enforced by the CLI
  wrapper; object-level bombs beyond single-blob size are out of scope
  for this slice.
- Per-worktree refs are not enumerated (bare-mirror slice).
- Annotated tags are not peeled; a tag ref pointing at a tag object is a
  typed quarantine in this slice.
- Packet evidence hashes include acquisition time, so two ingests of the
  same range produce the same observations but different packet
  envelopes. Canonical knowledge identity is SHA-based (Git SHAs), not
  packet bytes; whether acquisition time belongs in canonical bytes is a
  Phase 0 decision.
