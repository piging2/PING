# Gap-1 F3 impact analysis: dump.py key sort -> UTF-16 code-unit order (2026-09-27)

Read-only analysis. No files modified, no branches, no commits, no Pig access.
No contact with the HPP original repo/site.

## The proposed change

`fyd-lane/dump.py::canonicalize` line 198 sorts dict keys with Python
`sorted()` (code-point order). The pinned semantic KEY_ORDER_UTF16 is the
reference's `Object.keys().sort()` (UTF-16 code-unit order). The two agree
on all BMP keys and diverge only when a dict key contains an astral-plane
character (U+10000+): JS compares the surrogate pair's lead unit
(U+D800-U+DBFF < U+E000) while Python compares the full code point
(U+1F600 > U+E000). Empirically: JS `z, U+1F600, U+E000`; Python
`z, U+E000, U+1F600`.

## 1. Consumer inventory: who compares digests produced by dump.py

Digests written by `dump_site()`: `meta.baseDigest` (sha256 over
canonicalize(pre-overlay base graph)), `meta.graphDigest` (sha256 over
canonicalize(post-overlay graph)), `meta.presentationIntentDigest`
(sha256 over canonicalize(intent_block)). `fixtureFileDigest` is raw
file bytes, unaffected. Direct importers of `dump.py::canonicalize`:
only `fyd-lane/lane-f-replay-adapter.py` (importlib load, Pig-side
replay) and the Gap-1 conformance runner's dump.py adapter (per the
Gap-1 ledger; runner sources live on the gap1 branch).

Verification paths that compare against dump.py-produced digests:

1. `fyd-product-lane/src/fyd/data/ping-object-source.ts` (the live
   website read seam). Recomputes `graphDigest` (line ~300) and
   `presentationIntentDigest` (line ~189) with the TS `canonicalize`
   from `@/lib/ping/ask-composer` (which is `Object.keys().sort()`,
   UTF-16) and FAILS CLOSED on mismatch ("tampered with or written
   by an incompatible dumper; refusing to serve it"). `baseDigest`
   is only validated as a non-empty string here, not recomputed.
   This is the hard consumer: every served projection is
   cross-checked by the UTF-16 side.

2. `fyd-product-lane/src/fyd/data/fyd-tenant-graph.ts`. TS-native
   path: recomputes `baseDigest` with the TS canonicalize and fails
   closed against hand-pinned `FYD_TENANT_PINS` digests
   (`base_digest_mismatch`). Its `graphDigest` is TS-computed only.
   It does not ingest dump.py bytes, but it pins the same fixture
   base graphs dump.py dumps.

3. `fyd-product-lane/src/fyd/builder/dogfood/build-ping-fyd-projection.mjs`.
   Claims byte-identical output to dump.py while using the verbatim
   TS `canonicalize` (UTF-16 sort, line 42). Today that claim is
   FALSE for astral-keyed inputs (it already uses UTF-16 while
   dump.py uses code-point order). The F3 fix makes the claim true.

4. `fyd-lane/lane-f-replay-adapter.py` + `lane-f-probe.py` + Pig-side
   `check-stable.py`. Replay determinism: re-run the reducer and
   compare emitted digests to persisted meta digests; two
   consecutive dumps must be byte-identical (normalized dumpedAt).
   Sort change is deterministic, so these keep working.

5. `fyd-lane/lane-c/proof-owner-correction.py`. One-off proof script
   with its own Python `canonicalize` mirror (also `sorted()`,
   code-point order). Verified against a live projection's
   `meta.graphDigest` at the time. Not a consumer of dump.py's
   function; adjacent divergence only.

6. `fyd-lane/lane-e/proof.py`. Reads `meta.graphDigest` for
   evidence display (line 156); its own `canon()` is
   `json.dumps(sort_keys=True)` (code-point order, F1 scope). Not a
   comparer of dump.py digests.

7. FYD-037 guard paths (`dump.py` pre-flight, `lane-e/emit-overlay.py`
   pre-POST). These compare journal identity MARKERS
   (`WRONG_JOURNAL`), never canonical digests. Unaffected by the
   sort change. Confirmed: emit-overlay.py contains no digest
   comparison.

## 2. Blast radius: do any stored digests cover astral-plane keys?

Scan (recursive, every dict key, `ord(c) > 0xFFFF`) over all
observable canonicalized inputs: the machine-generated fixture TS
graphs dump.py reads (`happy-place-graph.ts`, `coppersmith-graph.ts`),
the committed test projection fixtures (`happy-place.json`,
`coppersmith-plumbing.json`, graph + presentationIntent), and
`fyd-lane/lane-e/*.json` evidence structures. Result: **0 astral-plane
keys** in any of them.

Stronger, on the real data: computed sha256 digests of both base
graphs under (a) current code-point sort and (b) proposed UTF-16
sort (`s.encode("utf-16-be")` key), and compared both to the TS-side
pinned `baseDigest` values in `fyd-tenant-graph.ts`:

- happy-place: old == pin == new (all three
  `eacaa611...65510679`)
- coppersmith-plumbing: old == pin == new (all three
  `8eaf11fc...73f3cc5d8b`)

The TS pins were produced with UTF-16 sort and the Python
code-point order reproduces them exactly, because the data is
BMP-only. A control injection (astral key added) makes old != new,
confirming the fix is exactly scoped to astral keys.

Consequence: the sort change is BYTE-IDENTICAL for every
canonicalized input observable in the tree. No stored digest that
verifies today can change, because:

- BMP keys: `sorted()` order == UTF-16 code-unit order, provably
  (code unit == code point for BMP; lone surrogates compare by the
  same numeric value in both).
- Astral keys: no verifying digest can exist today. The website
  read seam (consumer 1) recomputes with UTF-16 and fails closed,
  so any dump whose canonical bytes contain an astral key already
  produces an unservable projection. The change converts that case
  from fail-closed to conformant; it cannot turn a passing digest
  into a failing one.

UNKNOWN (with reason): the live overlay journals are unobservable
from here. The demo journal (Pig-side JSONL gateway at
127.0.0.1:18199) is unreachable (Pig transport down) and the demo
Postgres (`ping-test-pg`) is down (Exited 255 per the FYD-036
ledger); the main PING journal does not accept FYD_SITE_OVERLAY
(FL-20260921-231). So FYD_SITE_OVERLAY event payloads in the wild
could not be scanned for astral-plane keys. Per the fail-closed
argument above, even if such keys exist in the journal, no digest
that currently verifies would change; the only effect is that a
re-dump of such a journal would produce digests the website can
now serve instead of refusing.

`DUMPER_VERSION` (`fyd-projection-dump@1.2.0`): no bump required.
The versioned contract is the canonical bytes, which are unchanged
for the entire observable domain. Replay and byte-stability probes
remain valid across the change.

## 3. Recommendation

**(a) Change the sort now.** Safe: zero astral-plane keys in all
observable canonicalized inputs; the change is byte-identical on
BMP data (proven against the TS-pinned digests); every digest that
verifies today keeps its bytes; the dogfood TS builder's
byte-identical claim becomes actually true; the Gap-1 conformance
runner's `astral-key-order` case flips to PASS for dump.py.

Diff sketch only (no edit made):

```diff
+def _utf16_sort_key(s):
+    """Sort key matching JS Object.keys().sort(): UTF-16 code-unit order.
+    Python sorted() uses code-point order and diverges on astral-plane
+    keys (JS: z, U+1F600, U+E000; Python: z, U+E000, U+1F600).
+    utf-16-be encodes without a BOM, so byte order == code-unit order."""
+    return s.encode("utf-16-be")
+
 def canonicalize(v):
     ...
     if isinstance(v, dict):
-        items = sorted(v.items(), key=lambda kv: kv[0])
+        items = sorted(v.items(), key=lambda kv: _utf16_sort_key(kv[0]))
```

Notes for the implementer (separate item, not done here):
- Adjacent Python mirrors share the divergence and were NOT
  touched: `lane-c/proof-owner-correction.py::canonicalize`
  (`sorted(v.keys())`) and `lane-e/proof.py::canon`
  (`json.dumps(sort_keys=True)`). Neither consumes dump.py's
  function; the proof script's mirror was verified on BMP data
  and stays valid there.
- Re-run the conformance runner after the change; dump.py should
  go 9/10 -> 10/10 applicable. The runner stays exit 1 until
  F1/F2/F4 close.

## 4. Conformance runner treatment under each option

- (a) No runner change. `astral-key-order` stays a positive
  byte-case generated from the reference via `make-fixture.mjs`;
  dump.py's adapter flips FAIL -> PASS (typed reason
  `KEY_SORT_ASTRAL` clears). Runner remains exit 1 until F1, F2,
  F4 are fixed, which is the honest state.
- (b) Not recommended: a migration plan (re-hash affected records)
  has an empty affected set. If chosen anyway, the runner would
  need versioned expectations keyed on `meta.dumperVersion`
  (pre-fix digests expected under code-point order, post-fix
  under UTF-16), i.e. the runner would bless two canonical byte
  forms, which contradicts the pin.
- (c) If pinned as accepted divergence, the runner must mark
  `astral-key-order` for dump.py as a pinned SKIP with a typed
  reason (e.g. `ACCEPTED_DIVERGENCE_ASTRAL_SORT`), not a FAIL,
  otherwise the runner can never reach exit 0. Interop cost of
  (c): any future astral-plane key in a journaled overlay keeps
  producing website-unservable projections (fail-closed at the
  read seam) and keeps the dogfood builder's byte-identical claim
  false. Documented, bounded, but a standing cross-language
  conformance hole.

## 5. Unknowns

- Journal overlay payloads (Pig-side demo journal gateway, demo
  Postgres down): unscannable; see the fail-closed argument in
  section 2 for why this does not change the verdict.
- `run-conformance.py` itself was not present in this checkout
  (gap1 branch content partially merged); runner behavior is taken
  from the Gap-1 ledger, not re-verified here.

RECOMMENDATION: (a)
