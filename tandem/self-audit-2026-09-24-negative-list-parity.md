# Self-audit 2026-09-24 — negative-list parity invariant

## The invariant (specified)
The set of names the contract validator rejects as duplicates MUST equal the
set of names the context pack showed the worker as "do not return". Both are
the same logical concept ("already covered for this brief's signal type")
computed from the same sources:
1. canonical JSONL (`~/workspace/your_files/western-co-prospects.jsonl`)
2. pipeline.md staged NEW/QUEUED rows carrying the brief's source markers
3. `prospect-archive.jsonl` (archived names re-serve as "new" otherwise)

## Production evidence (this pass)
- a-run 20260924-030441: 12 named, 9 collided; b-run 20260924-030711: 10 named, 7 collided/excluded.
- Wesley Electric and JACG Roofing LLC appeared in captured findings despite
  being in the pack's own negative-signal text (grep-verified in both files).
- Root cause: `build-context-pack.py` derived negatives from JSONL +
  pipeline.md staged rows; `validate-research-contract.py::brief_negative_keys`
  derived them from the JSONL alone. Pipeline-staged and archived names were
  shown "do not return" but never enforced by the gate, so re-serves validated
  as `clear`.
- Secondary findings folded in: pipeline location-town was unparsed (validator
  can key name|town now); JSONL rows used `r.get('town')` while the schema has
  `city`, so old packs printed "Name ()" with empty towns (fixed).

## Implementation (automated)
- NEW `tandem/covered_names.py`: `merged_covered_names(slug)` -> deduped
  (name, town) tuples across JSONL + archive + pipeline; `format_for_pack`
  keeps pack text byte-compatible for existing entries.
- `build-context-pack.py` now imports from it (old inline functions removed).
- `validate-research-contract.py::brief_negative_keys` now imports from it;
  the `path` arg is kept for call-site compatibility.

## Tests (unit cases first)
- `covered_names.py --self-test`: structural invariants + production-evidence
  cases (wesley electric in a-keys, jacg roofing llc + western slope fleet
  washing llc in b-keys, srs construction, llc in b-keys, bold `- **` rows
  excluded, unknown slug empty).
- `validate-research-contract.py --self-test` gained: negkey-pipeline-in-a,
  negkey-archive-in-b, negkey-pack-negative-in-b, negkey-comma-parity
  (comma/LLC-suffix variants normalize identically).
- End-to-end on production data: 'Wesley Electric'/'JACG Roofing LLC'/'SRS
  Construction LLC' now dedup -> `duplicate (in brief negative-signal list)`,
  which `check_entry` classifies DUPLICATE; a never-seen name stays `clear`.
- Pack emission: new packs hash differently (146 vs 117 names for a, +archive
  rows, towns now populated); content superset of the old list, no
  byte-identical guarantee claimed where the old text was lossy ("Name ()").

## What reasoning this removes from the agent
No more manual "is this name already covered?" cross-referencing against three
stores during distill sweeps for pack-negative items; the gate enforces it and
the distill script's collision check remains the pre-merge guard. Future
re-serves of pack-negative names become DUPLICATE classifications in the
contract report, not agent judgment calls.

## Status
SPECIFIED -> TESTED -> AUTOMATED -> VERIFIED in real operation (production
data run through brief_negative_keys -> dedup -> DUPLICATE above).
