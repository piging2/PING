# Self-audit 2026-09-30: fence segment saturation in d-segment-deep-dive

## What the agent had to reason about
The d-segment-deep-dive brief tells Meta AI to "pick ONE trade segment ... that looks least covered". Meta AI picked fence again and framed it as uncovered. Independent verification showed 11 of 12 names already pipeline-tracked. The agent had to reason: is this a one-off miss, or a standing defect? The ledger says standing: fence d-passes at 9+/12 duplicate names in rounds 54, 62, 83, 20260918, 20260923, and now 20260930 (11/12). Meta AI's segment-selection heuristic never consults pipeline saturation; its "least covered" claim is an inference from its own ignorance, not from our state.

## Invariant (SPECIFY)
The d-segment-deep-dive brief must carry an explicit saturation exclusion for fence: fence is not "least covered" until another segment is demonstrably emptier. Segment novelty claims from the research worker are never trusted; only pipeline collision counts decide coverage.

## Evidence (TEST)
| d-pass | fence dupes / 12 | verdict |
|---|---|---|
| round 54 | 9/12 | Meta AI "least covered" claim false |
| round 62 (20260915-210630) | 10/12 | claim false 2nd straight |
| round 83 | 10/12 (incl. 2 round-54 re-serves) | claim false 3rd straight |
| 20260918 (audit L2144) | 10/12 + 1 HOLD | false 4th |
| 20260923 (L2691) | 10/12 | saturated, "pick another segment" |
| 20260930 (20260930-210650) | 11/12 | false 6th; 1 net-new staged (Action Fence / R L Smith Fencing) |

Six consecutive passes, never below 75% duplication. A pass slot costs ~25 min of Meta AI research + ~22 independent verifications. Expected yield of another fence d-pass: ~0-1 net-new.

## Automation (AUTOMATE)
1. Done this pass: patched ~/workspace/tandem/prompts/d-segment-deep-dive.md with an explicit fence-saturation exclusion (surgical text edit; next d-pass carries it in the context pack automatically).
2. Proposed (dev lane, not built this turn): pack builder emits a segment-saturation negative signal from pipeline.md coverage greps (count of rows per segment) so ALL segment-pick briefs get a dated "do not pick X" line instead of hand-edits per brief. Hand-edits rot; a computed signal stays current. Do not build until a second segment shows the same pattern (fence is the first; one segment is a patch, two is a system).

## Reasoning removed from the agent
No more "maybe fence is fine this time" judgment calls. The brief now carries the exclusion; the agent follows the brief. Future saturation cases get the same treatment only after a second segment hits 2+ consecutive high-dupe passes (anti-overgeneralization guard).
