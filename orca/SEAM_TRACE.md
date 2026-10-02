# ORCA Execution-Target Seam Trace (2026-10-02)

Question: WHERE CAN AN EXTERNAL EXECUTION TARGET BE ATTACHED WITHOUT
CHANGING MISSION SEMANTICS?

## What was found (bounded trace)

The full MissionRuntime → MissionScheduler → WorkerRuntime chain lives in
the PING runtime on the Pig (`/home/nolan/ping/ping-runtime/`, branch
`feat/orca-unknown-outcome-port`), not reachable from this machine. What IS
established locally:

1. **Existing adapter seam** — `~/workspace/orca/port/effect_adapters/adapter_core.js`
   (staged; target: `ping-runtime/orchestration/effect_adapters/`).
   Factory: `require('./adapter_core.js')({ foundation, emit })`.
   - Wraps the skill-CLI / agent boundary per effect class with canonical op ids
     (`deriveOpKey({missionId, effect, input})` byte-identical to the foundation).
   - Adapters NEVER own terminal state: `recordOutcome` maps to foundation
     events; SAFE_TO_RETRY emits no terminal event; the EffectReconciler sweep
     governs. `emit` must be caller-injected and bound to the UnifiedEventRuntime;
     without it the adapter FAILS LOUD rather than writing shim events.
   - This is the proven pattern: external execution attaches BELOW authorized
     work, as an effect-class adapter, with admission/terminal authority staying
     in the reconciler.

2. **ORCA lane worker boundary** — `mission2.py::call_model(model, prompt) -> text`.
   The mission consumes only: (router-selected worker, artifact, verifier verdict).
   Transport is invisible to mission semantics. An A2A-backed worker implements
   the same boundary: `(dispatch_envelope) -> artifact_text`, speaking A2A
   Task/Message/Artifact on the wire.

3. **Verifier / epistemic gate** — `mission2.py::verify_dispatch_module` +
   the rule WORKER CLAIM != VERIFIED RESULT. Proven 2026-10-02 (see mission
   evidence). Any execution target, local or A2A-remote, lands BEHIND this gate.

4. **Eligibility policy** — `model_router.py`: DATA CLASS → PROVIDER ELIGIBILITY
   is operator policy, evaluated before every dispatch. (FROZEN.)

## Answer

An existing seam answers it: **the worker-execution boundary below the router
and below independent verification**. In the ORCA lane that is the
`(envelope) -> artifact` function boundary (today: `call_model` over OpenRouter;
tomorrow: an A2A adapter with the identical signature). In ping-runtime it is
the effect-adapter factory. No new authority, scheduler, bus, or workflow
engine is needed. If a formal port is ever required, it is one function
signature: `execute(dispatch_envelope: dict) -> artifact`. Not built until needed.

A2A belongs BELOW authorized work. MCP belongs beneath the agent/tool boundary
(see harvest notes below).

## A2A read-only harvest — WHAT COMMODITY CODE CAN WE AVOID OWNING?

Envelope objects (AgentCard, Task, Message, Part, Artifact), task lifecycle
states, transport bindings (JSON-RPC 2.0, REST `POST /message:send|stream`,
SSE streaming, `/.well-known/agent-card.json` discovery), and client/server SDK
machinery. USE the official A2A SDK (JS SDK v1) when attaching an external
target. DO NOT hand-roll envelopes or transport.

What stays ours: the admission mapping (A2A Artifact → PING evidence) and the
rule REMOTE AGENT RESULT != VERIFIED RESULT — an A2A task state of COMPLETED
is a claim; only our verifier promotes to verified. A2A is transport for the
EXECUTE step only: it must not see mission state, write events, or bypass
verification.

## MCP read-only harvest — WHAT COMMODITY CODE CAN WE AVOID OWNING?

The tool-transport protocol: JSON-RPC 2.0 framing, `tools/list` + `tools/call`,
`resources/*`, `prompts/*`, capability negotiation, stdio/Streamable HTTP
transports. USE the official MCP SDK (TS SDK v2) when needed. DO NOT build our
own tool bus. (Reference: the harvested external `orca` repo itself exposes an
MCP server so agents can drive it — the "MCP beneath agents" pattern exists;
we don't need to invent it.)

What stays ours: the capability allowlist — AGENT → MCP TOOL → PING CAPABILITY
→ EXISTING IMPLEMENTATION. Never MCP TOOL → DIRECT PRIVILEGED EFFECT → BYPASS
PING. Do not promote mock filesystem/browser/docker MCP implementations into
authority-bearing production surfaces.

## Termination

Both harvests answered their commodity question. Harvesting stops here until a
real dependency requires wiring.
