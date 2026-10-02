# Substrate Gap 2: shared typed provenance - implementation ledger (2026-09-27)

Branch: `substrate/gap2-provenance-ref` (local only; no push, no merge).
Design: `substrate-gap2-provenance-design-2026-09-27.md` (same directory).

## Commits

- Root repo (`~/workspace/.worktrees/gap2-provenance`, from `d571362`):
  `62d3314` substrate/gap2: shared typed provenance authority
  (provenance-ref@1.0.0). 11 files, +2715.
- Nested fyd-build (`~/workspace/.worktrees/gap2-fydbuild`, from `841825c`):
  `872261c` substrate/gap2: TS provenance_ref twin and served adoption.
  8 files, +825/-28.

## What was built

Python authority `fyd-lane/provenance_ref.py` (`provenance-ref@1.0.0`):
frozen immutable `ProvenanceRef`; closed 7-kind vocabulary
(canonical-journal, website-derived, owner-authored,
owner-presentation-intent, generated, synthetic, unknown); scheme
validation; `pending-emit` placeholder denylist; typed errors
(UNKNOWN_KIND, MALFORMED_REF, UNKNOWN_REASON_MISSING,
PENDING_PLACEHOLDER, UNPARSEABLE, EMPTY_RECORD, INTENT_AS_OBJECT);
constructors journal_event/journal_updated/website_ingestion/
website_observation/website_snapshot/media_source/owner_decision/
owner_intent/generated/synthetic/unknown/from_legacy; canonical/parse/
validate/to_record/to_served_record; updated-ref append path;
intent-block canonicalization.

TS twin `src/lib/ping/provenance-ref.ts`: behaviorally mirrors the
Python authority. `ProvenanceKind` is now genuinely narrow (as-const
tuple; verified: a bogus literal is a compile error). This fix caught
one real latent bug: `toServedRecord()` assigned a `string` field to
`ServedProvenanceKind`; the class field is now typed `ProvenanceKind`.

Adoption:
- `dump.py`: every provenance record goes through the authority.
  add_object validates op-carried provenance first (fail closed), then
  forces `journal_event(eid, timestamp)`. set_field/deactivate_object
  append via `_provenance_append`. Presentation intents via
  `owner_intent`. No raw kind literals remain.
- `lane-e/emit-overlay.py`: serialized `pending-emit` rejected before
  any network (exit 4); `_resolve_op_provenance` raises
  PENDING_PLACEHOLDER for missing/denied event ids; the op builder now
  fails closed when the event id is unresolvable (see P5 notes).
- Served TS: `PingObjectProvenance.kind` routes through the
  authority-owned type; proceduralizer `websiteIngestion`, media attach
  `mediaSource` (object provenance and relationship evidenceRef),
  compile-service-graph `websiteIngestion` (was an inline literal
  bypass, fixed this session), regen evidence refs via `fromLegacy`,
  refresh observations via `fromLegacy` in the node-land module.
- `lane-c/work/ping-types.ts`: mirror of the closed union (documented
  as mirror only).

## Proof results (all run 2026-09-27, final state)

- P1/P3 corpus: Python `48 passed, 0 failed`; TypeScript
  `48 passed, 0 failed`, same corpus file, canonical strings agree.
  Runners: `fyd-lane/provenance_proof.py`, `provenance-proof.mjs`
  (corpus path now resolves relative to the runner, overridable via
  `PROVENANCE_CORPUS`).
- P2 bypass lint (`fyd-lane/provenance_bypass_lint.py`):
  AUTHORITY 34, TEST 69, GRANDFATHERED 9, MAPPED INPUT 18,
  UNRELATED 11, ENFORCEMENT 5, UNCLASSIFIED 0.
  `P2 BYPASS LINT: no unclassified construction sites`.
  The six named paths: lane-C mirror adopted; dump.py updatedRefs
  adopted; emit placeholder enforced; Ask FYD and Mission Control /
  Lane D out of scope per the brief; absorb numeric provenance is a
  different capability (absent from this dump).
- P4 byte-identity (`fyd-lane/provenance_p4_check.py`): baseline vs
  refactored dump on the real happy-place fixture plus stub events
  exercising set_field, add_object (with/without op-carried
  provenance), add_relationship, deactivate_object, and
  set_presentation_intent; `dumpedAt` normalized:
  baseline sha256 `448a35060831cfc815b0606719dd46f1094efc5d2179f670288d220aeb4c9337`
  refactored sha256 `448a35060831cfc815b0606719dd46f1094efc5d2179f670288d220aeb4c9337`
  `P4 BYTE-IDENTICAL: no silent semantic change`.
  Note: all 11 fixture objects already carry full provenance, so the
  kindless-record normalization branch is unreachable on real data.
- FYD-037 (`fyd-lane/provenance_fyd037_check.py`): wrong-journal
  /health marker against the refactored dump -> exit 2,
  `WRONG_JOURNAL: expected overlay journal marker 'ping-main-journal'
  ... got 'not-the-expected-journal'`, no projection written.
  `FYD-037: GUARD VERIFIED`.
- P5 (`fyd-lane/provenance_p5_check.py`): 6/6 probes pass.
  Poisoned add_object (unknown kind) -> ValueError carrying
  UNKNOWN_KIND before any write; no projection file written.
  Op builder without resolvable event id -> typed PENDING_PLACEHOLDER.
  `--add-service` CLI -> exit 4 with zero subprocess/network calls.
  Real event id pins `{"kind": "canonical-journal",
  "ref": "ping-event:e123"}`. Placeholder id -> PENDING_PLACEHOLDER.
- Suites: `tsc` clean; jest 320/320; refresh 21/21.

## P1-P5 verdicts

- P1 (authority correctness): PASS (48/48 both sides).
- P2 (no bypass construction sites): PASS (0 unclassified, documented
  classifications; exclusions per the brief).
- P3 (twin parity): PASS (shared corpus, canonical agreement).
- P4 (no silent semantic change): PASS (byte-identical sha256;
  FYD-037 GUARD VERIFIED).
- P5 (fail-closed): PASS (6/6; see resolution notes below).

## Open design defect (recorded, not fixed)

The design file is literally truncated on disk at line 426, mid-bullet:
`emit-overlay.py invoked without a resolvable event id -> ` and nothing
after. The required consequence is absent from the document. Verified
with `cat -A`: the file ends there (426 lines, 24238 bytes).

## P5 event-id sequencing: conflict and resolution

Sequencing reality: the gateway assigns event ids at POST time; the
emit envelope carries no client-supplied id; no preallocation mechanism
exists in this codebase. The old `--add-service` path therefore could
never resolve its event id before submission, and it bypassed the
`_resolve_op_provenance` gate (whose `not event_id` rejection was dead
code: the only caller skipped the gate for `None`).

Resolution (per the task's explicit direction not to mark P5 green with
the omission behavior): `add_service_ops` now always resolves through
the authority; an unresolvable id raises typed PENDING_PLACEHOLDER and
the CLI exits 4 before any network. This disables the `--add-service`
producer path (documented in DEMO-SCRIPT.md) until an event-id
preallocation mechanism exists; no gateway behavior was invented. The
ops-file emit path is unaffected, and dump.py's forcing path (which
assigns `ping-event:<event_id>` at apply time, P4-proven byte-identical)
remains the mechanism by which gateway-assigned events get provenance.

## overlay-authored: compatibility status (open, honest)

Existing served behavior depends on the `overlay-authored` literal
(FYD-038 DEMO_SYNTHETIC rendering). It is NOT an authority kind. The TS
served type carries it as a compatibility-only union member
(`ServedProvenanceKind = ProvenanceKind | "overlay-authored"`);
read-sites (renderer, why-this) and the single construction site
(owner/corrections.ts) are classified GRANDFATHERED in the P2 lint.
Owner reconciliation (migrate to `owner-authored` vs. retain the legacy
literal) is pending an owner decision; DEMO_SYNTHETIC rendering was not
changed without evidence.

## Boundaries held

No push/merge; no main/master commits; no HPP original contact; no
credentials; no broad process kills; no Pig writes; ports 3100/3200
untouched; `fyd-product-lane/design-sprint` untouched. The
`node_modules` symlink in the fyd-build worktree was removed after the
test runs; both worktrees are clean except prior untracked
`fyd-lane/_gap2scratch/` scratch (left alone).

## Verdict

GAP2-IMPL VERIFIED
