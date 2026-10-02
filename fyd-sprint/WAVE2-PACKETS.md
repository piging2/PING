# FYD Wave 2 packets (dispatch AFTER Wave 1 commit lands)

Lane branch: fyd/builder-composition on the Pig at /home/nolan/projects/ping.
Binding: ~/workspace/fyd-sprint/FYD-PRODUCT-AUTHORITY-OPTIONALITY-HARVEST-DIRECTIVE-2026-09-23.md (newest wins).

## Canonical vocabulary (newest directive)

DIRECT_EVIDENCE / DERIVED_EVIDENCE / OWNER_ASSERTION / GENERATED_PRESENTATION / CONFLICTING / UNKNOWN.

Note: Worker D's verifier used DETERMINISTIC_DERIVATION/OWNER_ASSERTED. Do NOT relitigate in Wave 2; record any verifier-vs-ask vocabulary delta in the worker's evidence note for a later convergence pass.

## Worker B — provenance vocabulary in ask responses

Goal: every ask response classifies its factual atoms in the canonical vocabulary.

- Map the ask pipeline's existing provenance vocabulary (DIRECT_FACT/DERIVED_FACT/INFERENCE/GENERATED_COPY/USER_OVERRIDE per the lane survey) to the canonical set. INFERENCE with no evidence -> UNKNOWN with explicit "I don't have evidence for that".
- CONFLICTING from sourceDrifted: when a source observation changed against an owner assertion, the ask response must expose the conflict, not silently pick a side (same bar as the Ollama acceptance test).
- OWNER_ASSERTION for owner corrections: corrections applied above the read seam must be labeled as owner assertions, with the source value preserved separately (effective-value/source-value/citation split per Worker A's tests).
- Ask FYD receives: target objects, related objects, evidence, visibility-filtered facts, viewer context, allowed capabilities. Answers only from those.
- Tests: ask lane tests for each vocabulary class, conflict exposure, and refusal behavior. tsc clean. No file overlap with Worker E (coordinate via file list in report).

## Worker E — WHY THIS lineage + ask->owner actions

Goal: WHY THIS lineage fed, and ask responses wire into the owner correction loop.

- Feed the WHY THIS lineage object: every cited fact in an ask answer carries lineage (object ref, evidence ref, owner-assertion ref, visibility state) so "Why does it say this?" -> FYD shows the source. Default visitor UI stays clean; lineage is the enabling infrastructure, not a dashboard.
- Wire ask->owner actions: CONFIRM / CORRECT / HIDE affordances on ask answers route into the overrides propose stage (Worker C's propose/approve with the authority gradient: presentation = fast proposal/undo, factual = explicit confirmation). Owner mode visually obvious; visitor cannot invoke.
- WHY THIS exists for: correction, trust, debugging, conflict resolution, agent grounding, regeneration, support, auditability.
- Tests: lineage completeness per answer, CONFIRM/CORRECT/HIDE -> propose-stage wiring, visitor-mode denial of owner affordances. tsc clean. No file overlap with Worker B (coordinate via file list in report).

Both workers: no commits to main, no pushes; work uncommitted on the lane branch; report VERIFIED with test counts + tsc; end with next uncertainty.
