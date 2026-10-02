# Gate-check run report

Date: 2026-09-23. Tool: `tools/gate-check.py` (deterministic, no network, no randomness).
Checked: `failures/FAIL-2-unsafe-url.md`, `failures/FAIL-5-claim-binding.md`.

## Result

files checked: 2, violations: 0, warnings: 0. Exit code: 0.

Both reports pass every hard gate. No fixes to the reports were needed, and none were made (reports were not edited, per instructions).

## Per-file detail

### FAIL-2-unsafe-url.md

- 3 surviving mechanisms found (S1, S2, S3), each claims 3 classes, all class numbers match their canonical names (#2 unsafe-url, #5 claim-binding, #6 visibility-error).
- Each has a falsifiable-test block containing all four markers: input, procedure, expected observable outcome, and "proves the mechanism DOESN'T work" falsification.
- Cut list present under (c): 7 entries, each with a stated reason (e.g. "prevents only #2 ... fails the >=2 rule").
- Every prevented-class bullet carries an adjacent explanatory sentence. No bare mentions.
- No em dash characters anywhere.

### FAIL-5-claim-binding.md

- 3 surviving mechanisms found (S1, S2, S3), each claims 2+ classes, numbers match names (#5 claim-binding, #6 visibility-error, #9 conflict-collapse).
- Each has a falsifiable-test block with input, procedure, expected observable outcome, and "What proves the mechanism DOESN'T work" falsification.
- Cut list present under (c): 6 entries, each with a stated reason (rejection stated, hard-rule failure stated, or explicit-forbidden status stated).
- Every prevented-class bullet carries an adjacent explanatory sentence. No bare mentions.
- No em dash characters anywhere.

## Script self-test (fault injection)

To confirm the checker is not a vacuous pass, a synthetic broken report was run through it (deleted afterward, not kept in the workspace). It correctly reported:
violations for <2 prevented classes, class number/name mismatch (#6 paired with 'unsafe-url'),
missing expected-outcome and falsification markers, and a present em dash; plus warnings for a bare class mention with no reason and a reason-less cut entry. Exit code was 1 in all faulted runs.

## Script limitations

- Heading shapes: mechanisms are recognized only from `### Survivor N:` / `### SN.` headings (levels 2-4). A lane using different heading wording would be reported as "no surviving-mechanism sections found", not silently passed.
- Reason adjacency is a length heuristic (stripped reason text must be at least 40 characters), not a semantic check that the reason is actually crisp.
- Falsifiable-test markers are keyword-based (input / procedure / expected / falsif-related wording). The checker confirms the markers exist; it cannot judge whether the test is genuinely falsifiable in the scientific sense.
- The cut-list reason check is likewise length-based per entry; the hard gate only requires the list to be present and non-empty.
- Declared-vs-found class count mismatch is a warning, not a violation; the hard gate is >=2 distinct classes.
- Only the two named files were run. `failures/FAIL-9-conflict-collapse.md` also exists but was out of scope for this task.
- The checker reads class claims as stated by the author; it does not verify the claims against FYD reality (that is the verification gate's job, not this tool's).
