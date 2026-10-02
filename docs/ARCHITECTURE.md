# Architecture (current, not history)

One current architecture. Historical designs live in PING.

## The product path

```
SOURCE
  → OBSERVATION
  → EVIDENCE
  → OBJECT GRAPH
  → SITE SPEC
  → RENDERER
  → ASK FYD
  → OWNER CORRECTION
  → REGENERATION
```

## The execution path

```
MISSION
  → SCHEDULER
  → WorkerRuntime.dispatch()
  → worker.handle(event)
  → evidence/result (UNTRUSTED)
  → independent verification
  → canonical event
  → projection
```

## The seams (each buys replaceability)

| Seam | Buys |
|---|---|
| Evidence-backed objects | acquisition optionality |
| SiteSpec | presentation optionality |
| Source/render bindings | editor optionality |
| Capabilities | action optionality |
| Model router | model optionality |
| Execution target seam | agent optionality |
| MCP | tool optionality |
| Protocol adapters | network optionality |
| Canonical events | projection/implementation optionality |

## Authority map

- Transport (A2A/MCP): commodity. Official SDKs. No privileged effects.
- Authority (evidence mapping, capability allowlist, tenant/context binding, result admission, verification): ours.
- Worker output: untrusted until verified. `worker claim != verified truth`.
- Projections: derived. `projection != canonical truth`.

## Code owners

| Area | Path | Owner (source) |
|---|---|---|
| Trust kernel | `packages/trust/` | (from manifest) |
| Object kernel | `packages/objects/` | (from manifest) |
| Event spine | `packages/events/` | (from manifest) |
- Mission execution | `packages/missions/` | (from manifest) |
| Capabilities | `packages/capabilities/` | (from manifest) |
| FYD vertical | `packages/fyd/` | (from manifest) |

(Owners filled from harvest-manifest.json; generate, don't hand-maintain.)
