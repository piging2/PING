# HOSTILE-NOTES.md (SYNTH-HOSTILE)

TESTING ONLY. These are synthetic fixtures for compiler stress testing.
Never present them as real prospects. Every fixture carries `synthetic: true`
and the `TESTING_ONLY_SYNTHETIC` marker. All phones are 555-01XX test numbers.
All business names contain "Test" or an explicit synthetic marker.

## Coverage map: hostile class x business type

10 hostile classes, at least 3 fixtures each, spread over 6 business types.

| hostile class | count | fixtures (ids) | expected failure mode |
|---|---|---|---|
| no-jsonld | 4 | hostile-nojsonld-trade, -food, -prof, -retail | warn: low-confidence compile, degraded evidence_quality; no invented fields |
| hours-conflict | 4 | hostile-hoursconf-trade, -hospitality, -food, -personal | warn: explicit HOURS CONFLICT flag; never pick a winner; quarantine scheduling projections |
| hundred-services | 4 | hostile-svc100-trade, -food, -prof, -personal | warn: page/cap service rendering; flag 100-vs-12 count mismatch; never silently drop |
| unsafe-urls | 5 | hostile-unsafeurl-trade, -food, -retail, -prof, -hospitality | fail-closed: quarantine javascript:/data:/vbscript: URL fields; never render raw |
| rtl-text | 5 | hostile-rtl-food, -personal, -retail, -hospitality, -trade | warn: preserve RTL runs, escape bidi controls, never reorder Latin metadata |
| franchise-lookalike | 5 | hostile-franchise-food, -trade, -retail, -personal, -prof | fail-closed: never merge with a real chain; compile as independent with warning |
| stale-source | 5 | hostile-stale-trade, -food, -prof, -hospitality, -personal | warn: freshness annotations on every claim; quarantine hours/prices; require re-observation |
| contradictory-phone | 4 | hostile-phonec-trade, -food, -retail, -personal | fail-closed: no canonical phone; block dial actions until human resolution |
| broken-media | 4 | hostile-media-trade, -food, -retail, -hospitality | fail-closed: validate media before render; quarantine 404, PDF, invalid scheme |

Total: 40 fixtures. Business type spread (manifest-indexed): trades 9, food 9,
retail 6, personal services 6, professional 5, hospitality 5. (Some fixtures
carry extra types through location/service objects; the biz-level type is what
the manifest indexes.)

## Conflict-preservation rule (binding)

Conflicts stay EXPLICIT and preserved in the `conflicts` field list. The
compiler must never smooth a conflict into a single value. Observed patterns:
- hours conflicts name both sources and both claims (website Saturday 09:00-17:00
  vs directory Saturday closed)
- phone conflicts name both numbers and block dial actions
- franchise lookalikes carry an explicit do-not-merge directive
- stale sources carry `source_last_observed: 2024-06-15` and freshness flags

## Generator and validator

- Generator: `fixtures/hostile/gen_hostile.py` (deterministic, idempotent;
  rerun to regenerate all 40)
- Validator: `fixtures/hostile/validate_hostile.py`. Checks: JSON loads;
  `synthetic:true` + `TESTING_ONLY_SYNTHETIC` + `testing_only:true` present;
  thesis/failure-mode/hostile-properties present; object keys well-formed;
  provenance kind synthetic; relationships dangle-free; explicit conflicts on the
  business object; no real-looking phones (any phone-shaped string must be
  555-01XX); business name clearly synthetic; per-class hostile markers present
  (RTL chars, unsafe schemes, 100 services, franchise location count 3,
  2024 stale date, conflicting phones, broken-media markers).

## Validator result

`python3 fixtures/hostile/validate_hostile.py` -> 40 passed, 0 rejected.

## Manifest

`manifests/hostile.json` indexes id, file, business type, hostile properties,
expected failure mode, and object/relationship/service counts per fixture.
