# Self-audit 2026-09-21: geography-contract gate

## Production evidence
Run 20260921-090637-a (meta-ai-intel-pass, 2026-09-21): `prompts/a-weak-website-hunt.md`
line 3 hardcoded "Prioritize towns we have not covered yet: Palisade, Clifton,
Delta, Cortez, Pagosa Springs, Rifle, Craig, Meeker." That line predates the
2026-09-20 geography scale-back (Nolan's call: Mesa County corridor + Delta,
Montrose, Rifle, Carbondale only). Meta AI obeyed the brief and returned 3
out-of-zone businesses (Dickson Electric Cortez, C R Plumbing & Heating Cortez,
Yerton Plumbing Co LLC Pagosa Springs) = 25% of the 12-slot answer wasted, all
discarded at verification. Same defect class as the h-marketing-intelligence
objective/contract mismatch (2026-09-20): the brief contradicts standing
authority, and the model obeys the brief.

## Invariant (specified)
A research brief's objective must not name an out-of-zone town in an inclusion
context. The geography authority is AGENTS.md ("Targeting"), parsed at runtime.
Out-of-zone = a recognized Colorado place name not in the parsed in-zone set.
Exclusion mentions ("no Cortez", "exclude Pagosa") are allowed. Unknown place
names fail open (documented gap: curated town dictionary, not a gazetteer).

## Tested
`test-check-geography-contract.py`: 15 unit cases, all green. Cases: authority
parse yields the 13 in-zone towns; stale town list flagged (cortez, pagosa
springs, craig, meeker); fixed a-brief passes; b-brief passes; in-zone-only
list passes; exclusion-only mentions pass; mixed include/exclude passes;
out-of-zone target (Telluride) flagged; no-mention and ambiguous prose fail
open; missing brief is infra. One test-found bug fixed before wiring: cue
regexes lacked IGNORECASE, so a capitalized "Cover" at sentence start was
missed (the stale a-brief only matched via lowercase "covered").

## Automated
- `check-geography-contract.py`: exposes `check(slug)` -> (compatible |
  incompatible | infra, message); CLI exit codes 0/3/2, mirroring
  check-objective-contract.py.
- `next-brief.py`: skips geography-incompatible briefs from the effective
  cycle (like quarantined/objective-incompatible briefs), so one stale brief
  never stalls rotation.
- `pig-fb/meta-pass.sh`: re-checks at dispatch as a backstop for direct
  invocations (gate 0b, `infra_exit geography_contract_incompatible`).
- `prompts/a-weak-website-hunt.md`: stale town list replaced with in-zone
  towns only (Palisade, Clifton, Collbran, Loma, Mack, De Beque, Montrose,
  Carbondale). The exclusion list stays in the pack's GEOGRAPHY section, the
  single authority; briefs must not duplicate it.

## What the agent no longer reasons about
Whether a brief's priority-town list is current. The gate owns it.

## Open gaps (not promoted, recorded for a future pass)
- Town dictionary is curated; an out-of-zone town not in the list fails open.
- Clause-level exclusion classification is heuristic; a deliberately
  adversarial brief could phrase around it. Production briefs are
  owner-written, so this is acceptable.
