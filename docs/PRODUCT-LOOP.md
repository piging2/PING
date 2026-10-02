# Product loop

The test that matters:

1. Business owner pastes their URL.
2. They see their business (rendered from evidence-backed objects).
3. They ask it questions (Ask FYD answers from evidence, with citations).
4. They trust the answers (every factual claim bound to evidence; unsupported claims refused or marked UNKNOWN).
5. They correct something ("We serve Grand Junction, not Denver").
6. Correction is recorded as OWNER ASSERTION, distinct from SOURCE OBSERVATION and DISPLAY POLICY. Source evidence is never rewritten.
7. They tell FYD what they want ("Put emergency plumbing first") — presentation intent, structured patch, preview, approve, apply deterministically.
8. They see the change.
9. They return later. It is still correct (correction/intent survives regeneration and re-observation).

One binding model underlies all of it:

```
RENDERED NODE ↔ SiteSpec path ↔ object/field ↔ claim ↔ evidence
```

That one relationship unlocks: WHY THIS? / EDIT / CORRECT / HIDE / FEATURE / ASK FYD / AGENT CONTEXT / REGENERATION DIFF.

## Mechanical close gate (Nolan, 2026-10-02, binding)

The FYD slice closes when ONE EXTERNAL BUSINESS completes the entire customer loop with ZERO ENGINEERING INTERVENTION:

1. Owner provides a real URL; FYD acquires it.
2. Deterministic evidence-backed graph is produced.
3. Generated site opens on desktop and mobile.
4. Ask FYD answers one material business question WITH EVIDENCE.
5. Owner corrects / hides / confirms one fact; correction PERSISTS.
6. Owner requests one plain-English site change; FYD produces a proposal; owner APPROVES it; site changes; reload preserves it.
7. Second source observation detects a change; regeneration PRESERVES the owner's correction/customization.
8. The owner can explain what FYD did WITHOUT understanding PING internals.

TWO HARD GATES (both must pass):
- ZERO customer-specific code anywhere in the path.
- ONE REAL EXTERNAL OWNER has actually used it.

Until both gates pass, A2A/MCP remain harvested designs/prototypes, not another architecture wave.

Steering line for all lanes: external systems report observations, PING decides truth; ports translate protocols, not semantics; projections explain truth, not replace it.
