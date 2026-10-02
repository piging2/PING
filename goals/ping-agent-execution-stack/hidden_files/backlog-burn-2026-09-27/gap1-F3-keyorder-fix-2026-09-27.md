# Gap-1 F3 fix ledger: dump.py canonicalize -> UTF-16 code-unit key order (2026-09-27)

Fix worker item: Gap-1 F3 (key sort). Analysis basis:
`gap1-F3-keyorder-analysis-2026-09-27.md` (same directory), recommendation (a): change the sort now.

## Change

Branch: `substrate/gap3-journal-identity` (dump.py lineage, base commit e84764e).
Worked in dedicated worktree `/tmp/f3-fix` (removed after commit); shared
checkout's branch (`mc/sprint-integration-2026-09-27`) never touched.
Worktree's dump.py verified byte-identical to the shared tree's restored
untracked copy before editing.

Diff (1 file, 9+/1-, matches the analysis diff sketch):

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

Commit (local only, NOT pushed): `9da0ea9` "Gap-1 F3: canonicalize key sort
-> UTF-16 code-unit order" on `substrate/gap3-journal-identity`.
No DUMPER_VERSION bump (canonical bytes unchanged on the observable domain).
Adjacent Python mirrors (`lane-c/proof-owner-correction.py`,
`lane-e/proof.py::canon`) intentionally NOT touched (out of F3 scope, per analysis).

## Proof (i): conformance runner

Runner `fyd-lane/canonical-conformance/run-conformance.py` (gap1 branch) cannot
run in its own tree: it loads `dump` from the runner-relative fyd-lane and
`/tmp/gap1-work/fyd-lane/` has no dump.py. Assembled two runnable fyd-lane
shapes (runner files copied, not the gap1 worktree touched):

- `/tmp/f3-runner` with dump.py -> patched `/tmp/f3-fix/fyd-lane/dump.py`
- `/tmp/f3-runner-base` with dump.py -> pre-change `/home/hatch/workspace/fyd-lane/dump.py`
  (verified identical to the pre-edit worktree copy by the pre-edit diff)

(siblings `lane-e/proof.py`, `absorb/`, `harvest-wave1/`, `journal_identity.py`
symlinked read-only.)

Baseline (pre-change): `[live] dump.py NON_CONFORMANT` with
`astral-key-order FAIL KEY_SORT_ASTRAL`; all other dump.py cases PASS
(only ts-only `undefined-to-null` SKIP). That is 9/10 applicable.

Patched: `[live] dump.py CONFORMANT` — all applicable cases pass, including
`astral-key-order` (typed `KEY_SORT_ASTRAL` clears). No regressions in dump.py's
other cases. Runner overall remains exit 1 as predicted by the analysis
(F1/F2/F4 scope: float-refusal fails in the reference and other
implementations; out of F3 scope).

Reports: `/tmp/f3-baseline-report.json`, `/tmp/f3-patched-report.json` (ephemeral).

## Proof (ii): decisive invariant — no verifying digest changes bytes

sha256 of both base graphs, extracted via dump.py's own `extract_base_graph`,
computed with pre-change code vs patched code vs TS-side pins
(`fyd-product-lane/src/fyd/data/fyd-tenant-graph.ts` FYD_TENANT_PINS):

- happy-place: pre == new == pin ==
  `eacaa6113180f2cf601e7d592f10dfa1a783da25c8e0f86004d5922e65510679`
- coppersmith-plumbing: pre == new == pin ==
  `8eaf11fc761a49ff51e52844ac610c993f43b7443c173e3b2d7d6f73f3cc5d8b`

Control injection `{"z":1, U+1F600:2, U+E000:3}`: pre-change emits
`{"z":1,"\ue000":3,"\U0001F600":2}` (code-point order), patched emits
`{"z":1,"\U0001F600":2,"\ue000":3}` (UTF-16 order = JS `Object.keys().sort()`
order). Fix is exactly scoped to astral keys.

## Proof (iii): py_compile

`python3 -m py_compile fyd-lane/dump.py` -> OK (run before commit).

## Proof (iv): FYD-037 wrong-journal guard

`fyd037-dump-wrong-journal-probe.py` hardcodes the shared-tree dump.py path;
ran it via in-memory source replace against the patched copy (original file
untouched): both `query_overlays()` (main) and `query_overlays_demo()` (demo)
performed exactly one journal-identity pre-flight and failed closed with the
typed WRONG_JOURNAL error (exit 2), 0 data urlopen calls, 0 subprocess calls.

Verdict: **GUARD VERIFIED** (dump path) — the sort change does not disturb the guard.

## Cleanup

- Worktree `/tmp/f3-fix` removed (`git worktree remove --force /tmp/f3-fix`).
- Runner scratch `/tmp/f3-runner`, `/tmp/f3-runner-base`, `/tmp/f3-digest-proof.py`
  removed; ephemeral report JSONs removed.
- /tmp tmpfs was 100% full during the task (unrelated workers' worktrees,
  e.g. `/tmp/mc-fyd-shapeC` 460M); nothing outside my own scratch was deleted.
- Shared tree untouched except this ledger file; no pushes; no Pig access;
  no HPP original contact.

Note: the analysis's Unknown about live overlay journal payloads
(unscannable Pig-side demo journal / down demo Postgres) is unchanged, but the
fail-closed argument stands: even if astral-plane keys exist in those
journals, no digest that verifies today can change bytes; a re-dump of such
a journal would now produce digests the website read seam can serve instead
of refusing.

# F3 VERIFIED
