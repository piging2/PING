# SPIKE 3 — AI SDK TRANSPORT SEAM DESIGN (live phase, 2026-09-28)

## Current state (verified in tree 2026-09-28): ZERO model invocations

- No `generateText` / `streamText`, no `ai` package in `package.json`, no fetch to
  any model API (`api.openai.com`, `api.anthropic.com`, `generativelanguage`,
  `chat/completions`: zero hits in `src/`).
- The `openai`/`anthropic` strings in-tree are business-data inventory
  (`src/lib/infrastructure/controller.ts`: which services a business uses) and
  provider-name labels (`src/lib/sentiment/classifier-provider.ts`), not API calls.
- Ask FYD is fully deterministic: `src/lib/ping/ask-composer.ts` is pure functions;
  `src/fyd/ask/answer.ts` is a deterministic composer with fail-closed honest-unknown.
  Determinism here is a product guarantee; the SDK must not replace it.

## Consequence: design only, no implementation

There is no existing transport to delete, so no spike can prove a deletion today.
The seam is specified now so the FIRST model-backed capability (conversational
customization intent parsing, owner-correction understanding — both on the
10 non-negotiables) lands inside it instead of growing a second transport.

## The seam

Single entry module: `src/fyd/ai/transport.ts` — the ONLY file permitted to import
the `ai` package (enforced by an eslint import boundary; CI fails otherwise).
Everything else talks to the transport interface, never the SDK.

### Ownership split (locked)

AI SDK owns: provider abstraction (which model), streaming transport, invocation
(`generateText`/`streamText`), structured-output transport (`Output.object()`),
provider normalization (retries, error shapes).

PING owns: authorization (capability grants checked BEFORE any call), capability
selection (what the model may propose), business state (the object graph — the model
never touches it), effects (model output is a PROPOSAL, never an execution),
approval semantics (proposal -> digest -> approval -> execution binding),
tenant authority (tenant id pinned per request; the transport is tenant-blind),
outcome truth (canonical transitions recorded by PING, never by model output).

### Crossing types

```ts
interface ModelRequest {
  tenantId: string;                 // pinned by PING; transport cannot change it
  capabilityGrant: CapabilityGrant; // what this call is allowed to propose
  inputSchema: z.ZodType;           // derived from EXISTING sitespec Zod schemas
  outputSchema: z.ZodType;          // no second schema: reuse validator.ts shapes
  evidenceRefs: EvidenceRef[];      // the model's only view of business truth
  purpose: "customize-intent" | "owner-correction" | ...; // closed enum
}
interface ModelResult {
  structuredOutput: unknown; // validated against outputSchema, fail-closed
  usage: { inputTokens: number; outputTokens: number };
  modelId: string;
}
```

Rules:
- Raw model text NEVER enters canonical state. Only validated structured output
  becomes a proposal, and a proposal is not an execution.
- Approval pattern: model proposes -> PING builds digest -> owner approves ->
  PING executes. The SDK's approval primitives are presentation/transport; the
  approval AUTHORITY is PING's digest binding (PROPOSAL A -> DIGEST A ->
  APPROVAL A -> EXECUTION A).
- Streaming: `streamText` deltas go to the UI only. Canonical state updates only
  on validated completion.
- Tenant isolation: the transport receives pre-scoped input assembled by PING and
  has no data access of its own; it is a pure function of the request and cannot
  reach cross-tenant data by construction.
- High-risk tools: HMAC-signed approvals from day one (per read-only evaluation).

### Adoption gate (when the day comes)

Adopting the SDK must be net-neutral-or-negative LOC versus the hand-rolled
transport it replaces, must not own anything on PING's side of the split, and must
pin the SDK major. Hard reqs: Node >= 22, ESM-only.

### What the SDK must never become

Authorization, capability registry, canonical transitions, evidence store,
approval authority, tenant boundary. If a future diff shows the SDK deciding any
of these, the seam is breached and the diff is rejected regardless of LOC saved.
