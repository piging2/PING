# Q-J-04: Acquisition Minimum Contract (SOURCE -> EVIDENCE seam)

Formal contract for the acquisition seam of the FYD website-builder target
loop. Covers the SOURCE -> EVIDENCE stage only.

**Owned files:** `src/fyd/net/safe-fetch.ts` (the one SSRF gate;
`src/fyd/media/safe-fetch.ts` is a pure re-export shim),
`src/fyd/acquisition/static-adapter.ts`, `src/fyd/acquisition/live-loop.ts`,
`src/fyd/acquisition/acquisition-adapter.ts` (types),
`src/fyd/acquisition/errors.ts` (failure taxonomy),
`src/fyd/net/budgets.ts`, `src/fyd/net/rate-limit.ts`.

**Status at f877c391** (`fyd/builder-harvest-trackc-2026-09-28`):
claims C1-C5 implemented and green; C6-C7 are CONTRACT-GAP (normative,
not yet implemented; failing-before tests fail by design until a writer
lane closes them). C8 is an accepted honest residual.

**Invariant tests:** `src/fyd/acquisition/__tests__/q-j-04-contract.test.ts`.
Falsification map in section F. Every claim has a failing-before test:
implemented claims are guarded by tests that fail if the implementation
is removed; gap claims have tests that fail right now.

---

## C1. Source identity / digest (canonical statement)

**evidenceHash = sha256(exact stored bytes).**

Normative detail:

- The hash input is the raw response body `Buffer` handed to the adapter by
  the SSRF gate (`SafeFetchOk.bytes`). It is not a string re-encode, not the
  parsed DOM, not the extracted text, and not a truncated excerpt (the
  `truncated` flag is a separate field).
- Output is 64 lowercase hex characters.
- Verification procedure: `sha256(stored bytes) === observation.evidenceHash`.
  Any downstream evidence that cites an observation must be able to re-run
  this check.
- The hash is computed at acquisition time in `static-adapter.ts`
  (`evidenceHash: sha256Hex(res.bytes)`). It is never recomputed from a
  derived form, and no later stage may mint a replacement.

## C2. Provenance never silently empty

Every emitted observation carries, all present and non-degenerate:

- `url` (seed echo), `finalUrl` (after redirects), `fetchedAt` (ISO 8601),
  `statusCode`, `contentType`, `bytes`, `levelUsed`, `depth`,
  `policyNotes` (length >= 1), `evidenceHash`, `escalation[]`.

Refusal is never an observation:

- A refused seed never produces an observation object. It throws
  `LiveAcquisitionError`, which is **thrown, never returned as a value**,
  so a refusal can never be mistaken for a usable result.
- There is no null observation, no undefined observation, and no
  empty-array-as-success for a refused seed.

## C3. Deterministic-extraction boundary (the L4 line)

Field classification for `AcquiredObservation`:

- **Deterministic-of-bytes** (pure functions of the raw bytes plus fetch
  metadata): `finalUrl`, `statusCode`, `contentType`, `bytes`, `truncated`,
  `title`, `meta`, `openGraph`, `jsonLd`, `canonicalUrl`, `links`,
  `evidenceHash`, `redirectChain` (when surfaced, see C7).
- **Echo**: `url` (the seed, verbatim).
- **Process**: `levelUsed`, `depth`, `escalation[]`, `policyNotes[]`
  (what the pipeline did and why).
- **Sanctioned non-determinism**: `fetchedAt` only (wall clock). This is the
  one field allowed to differ between two acquisitions of identical bytes.
- **Interpretive**: nothing. The observation level carries no AI judgments,
  no scores, no summaries, no rankings.

The line the L4 AI stage must not cross back over:

- L4 operates on observations only. It must not re-fetch the source, must
  not mutate observation fields, must not mint a new `evidenceHash`, and
  must not write interpretation back into the observation.
- Derived artifacts (graphs, specs, copy) must cite `(url, evidenceHash)`
  so the bytes behind every claim stay checkable.

## C4. Visibility EXCLUSION (compiler-privacy call, 2026-09-25)

**Acquisition never decides presentation privacy.**

- Acquisition RECORDS: robots.txt directives as observed facts
  (`policyNotes`), `noindex`/`nofollow` as extracted meta values. These are
  evidence, not instructions.
- Acquisition never DECIDES: there is no `visibility`, `publishable`,
  `hidden`, `redacted`, or `suppress` field on the observation, and a
  restrictive directive never suppresses an observation. A page carrying
  `<meta name="robots" content="noindex">` still yields a full observation;
  the directive is recorded as data.
- Evidence at f877c391: grep-verified, no visibility-deciding field exists
  on `AcquiredObservation`; the closed-shape test (F, T-closed-shape) fails
  if one is ever added.
- Adding a visibility-decision field to the observation is a contract
  violation. The presentation-visibility decision belongs to the compiler /
  later stages, never to acquisition.

## C5. 17-code status taxonomy (pinned)

The frozen terminal vocabulary. Hostile or unusable input ALWAYS terminates
with one of these, never with an uncaught exception and never with a silent
empty result.

Gate-level (via `classifyFetchFailure` over safe-fetch reasons):

1. `ACQ_INVALID_URL`
2. `ACQ_SCHEME_REJECTED`
3. `ACQ_CREDENTIAL_URL`
4. `ACQ_PRIVATE_IP`
5. `ACQ_DNS_FAILED`
6. `ACQ_HTTP_STATUS`
7. `ACQ_REDIRECT_LOOP`
8. `ACQ_CONTENT_TYPE_REJECTED`
9. `ACQ_TOO_LARGE`
10. `ACQ_TIMEOUT`
11. `ACQ_NETWORK_ERROR` (also the fail-closed fallback: any reason the
    classifier does not recognize maps here, never to an unknown code)

Loop-level (thrown by the loop/adapter directly):

12. `ACQ_ROBOTS_DISALLOWED`
13. `ACQ_EMPTY_CONTENT`
14. `ACQ_NO_GRAPH`
15. `ACQ_VERIFY_FAILED`
16. `ACQ_PLAN_FAILED`

Rights-level:

17. `MEDIA_RIGHTS_SCOPE`

`LiveAcquisitionError` carries `code` plus the loop `stage`; it is thrown,
never returned. Codes are never renamed, never removed, never silently
extended: any new terminal condition gets a new code through a contract
amendment, not a quiet string.

## C6. Temporal identity: asOf / revision / checkpoint (CONTRACT-GAP)

Normative semantics, not yet implemented at f877c391:

- `asOf`: the instant the observation is true-as-of, ISO 8601. Today
  `fetchedAt` serves this role implicitly; the contract requires an
  explicit `asOf` bound to the same instant, so re-observation and
  caching layers have a stable field to key on.
- `revision`: the content revision, a pure function of `evidenceHash`.
  Equal bytes imply equal revision; different bytes imply different
  revision. Two observations of the same URL with equal `evidenceHash`
  are the same revision.
- `checkpoint`: the acquisition-run/pass identity that produced the
  observation, so re-observations can be ordered (this pass supersedes
  that pass).

Status at f877c391: NOT IMPLEMENTED (grep-verified: no `asOf`,
`checkpoint`, or `revision` in `src/fyd/acquisition/*` or
`src/fyd/net/*`). The failing-before tests (T-asof, T-revision,
T-checkpoint) fail now by design. A writer lane implements these fields;
no reobservation consumer exists yet (sitemap and incremental refresh are
separately gated and NOT authorized by this contract).

## C7. redirectChain surfacing (CONTRACT-GAP)

`SafeFetchOk` carries `redirectChain` (every hop re-validated by the gate),
but `AcquiredObservation` does not surface it at f877c391. The contract
requires it: the per-hop chain is the audit evidence behind redirect
claims ("public -> public", "rejected at hop 3"). The failing-before test
(T-redirect-chain) fails now by design; a writer lane copies the chain
through.

## C8. TOCTOU residual (honest, accepted)

The DNS-validation-to-socket-connect window is not atomic: the gate
validates the addresses DNS returns at check time, and the production
fetch re-resolves independently, so a hostile DNS that answers differently
per query (rebinding) could steer the socket. This is documented in the
`safe-fetch.ts` module header, accepted for demo inputs, and NOT claimed
away. Socket-pinning is required before untrusted public URL ingestion.
The decision-ready research note (TOCTOU options) is a separate
deliverable; this contract claims nothing about atomicity.

---

## F. Falsification map (at f877c391)

| Claim | Test(s) | Status |
|---|---|---|
| C1 digest = sha256(exact bytes) | T-digest-exact, T-digest-format | PASS |
| C2 provenance complete / refusal throws | T-provenance-complete, T-refusal-throws | PASS |
| C3 determinism / no interpretive fields | T-determinism, T-closed-shape | PASS |
| C4 visibility exclusion | T-closed-shape, T-noindex-recorded-not-acted | PASS |
| C5 17-code taxonomy pinned / fallback closed | T-taxonomy-pinned, T-fallback-closed | PASS |
| C6 asOf / revision / checkpoint | T-asof, T-revision, T-checkpoint | FAIL by design (CONTRACT-GAP) |
| C7 redirectChain surfaced | T-redirect-chain | FAIL by design (CONTRACT-GAP) |
| C8 TOCTOU documented, not claimed away | module header (read-only; no test asserts atomicity) | documented |

Q-F-01 hostile battery (separate artifact, closed-pending-verification):
`src/fyd/net/__tests__/ssrf-adversarial.test.ts` (72 tests) +
`src/fyd/acquisition/__tests__/hostile.test.ts` (17 tests), green on the
clean checkout f877c391 and on the served head (see lane report).
