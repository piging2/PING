# piging2

Executable convergence of years of PING work into a small product core.
PING (the original repository) is preserved as archaeology. piging2 is the refinery.

## WHAT IS THIS?

piging2 is the minimal executable core of PING:

- **Trust kernel**: canonical serialization, hashing, deterministic IDs, Ed25519, schema validation, tenant isolation, visibility, secret redaction, URL safety.
- **Object kernel**: Object, Relationship, Evidence, Observation, Transition, Capability. Small.
- **Event spine**: one canonical event path (UnifiedEventRuntime), canonical bytes, replay, projection rebuild.
- **Mission execution**: MissionRuntime, MissionScheduler, WorkerRuntime.dispatch(), independent verification. Worker claims never establish truth.
- **FYD vertical**: SOURCE → OBSERVATION → EVIDENCE → OBJECT GRAPH → SITE SPEC → RENDERER → ASK FYD → OWNER CORRECTION → REGENERATION.

Every seam buys replaceability. If an abstraction does not make something replaceable, it does not belong here.

## HOW DO I RUN IT?

First slice (target): ingest a real website → evidence → objects → SiteSpec → render.

```sh
npm install
npm run slice1 -- <url>
```

(Exact commands land here when the first slice is harvested and green.)

## HOW DO I TEST IT?

```sh
npm test
```

Every harvested primitive arrives with its test. A primitive is harvested when: source identified, license acceptable, target owner identified, dependencies bounded, test moved/adapted, test passes, caller uses it. No orphan libraries.

## WHAT IS THE PRODUCT LOOP?

Paste URL → see business → ask questions → trust answers (evidence) → correct something → tell FYD what you want → see the change → return later → still correct. See `docs/PRODUCT-LOOP.md`.

## WHERE IS CANONICAL TRUTH?

Canonical events (UnifiedEventRuntime). Projections are derived, never canonical. Worker output is untrusted until independently verified. See `docs/ARCHITECTURE.md` and `docs/INVARIANTS.md`.

## PROVENANCE

`harvest-manifest.json` is the machine-readable provenance chain: every module's source path, source SHA, license, purpose, authority owner, dependencies, tests, target path, action, rationale. Generated from discovery, not hand-maintained.
