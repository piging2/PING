# OAUTH CONNECT FLOW — Design (Agent 16, Part 3)

Standing decision honored: no live credentials tonight; fixtures and
recorded responses only. Nolan picks the real account in the morning;
MORNING-QUEUE.md is the request list. Nothing below connects anything.

## 1. Flow state machine

States: IDLE -> PROVIDER_SELECTED -> PERMISSIONS_EXPLAINED ->
AUTHORIZING -> CALLBACK_RECEIVED -> CUSTODY_ISSUED -> INVENTORIED ->
ACTIVE. Terminal failure states: DENIED_BY_USER, CUSTODY_FAILED,
PROVIDER_ERROR. Every transition emits an audit record with redacted
references only (no material).

### Step 1: CONNECT SOURCE
The UI offers exactly three buttons: CONNECT FACEBOOK, CONNECT ATPROTO,
CONNECT OTHER SOURCE. Only connectors with a shipped, testkit-green
adapter are enabled; everything else renders disabled with the reason
("adapter not yet certified"). No speculative buttons. Selecting a
provider moves to PROVIDER_SELECTED and records the provider slug +
connector version.

### Step 2: provider
The provider card shows: what will be read (streams), what will never
be touched (write is DENIED by default; any write capability needs a
separate elevated grant per lane M), where tokens live (lane-L broker
custody, never in the browser), and how to disconnect (revocation path).
This is the consent pre-brief; it must be complete before any redirect.

### Step 3: requested permissions explained
For each requested scope: the exact scope string, why this scope is
needed for the demonstrated feature, and what breaks without it. The
rule is smallest-permission-set: if a narrower scope serves the feature,
the broader one is not requested. Write scopes are never requested
speculatively. The user sees this screen and must acknowledge it before
AUTHORIZING. (Per-scope tables live in MORNING-QUEUE.md.)

### Step 4: OAuth authorization
Server-side initiation only. The server generates: `state` (>=16 random
chars, bound to the user session), PKCE `code_verifier` + S256
`code_challenge` (stored server-side, never sent to the browser),
and for ATProto a DPoP keypair + pushed authorization request (PAR).
The browser is redirected to the provider's authorization endpoint;
the browser never sees the verifier, the client secret, or any token.
Current recommended flow per provider:
- Meta (Facebook): authorization-code flow with PKCE
  (code_challenge=SHA256(verifier), method S256) against
  facebook.com/dialog/oauth; token exchange at graph.facebook.com with
  the code_verifier.
- ATProto: PAR (RFC 9126) with PKCE S256 and DPoP; client_id is the
  client-metadata URL; scope must include `atproto`; the server
  verifies `sub` (DID) against `iss` before accepting the session.
- Google (Drive/Gmail/GBP): authorization-code flow with PKCE;
  access_type=offline + prompt=consent only when a refresh token is
  needed; granted scopes read back from the token response (never
  assumed).
- Stripe Connect: authorization-code flow; test-mode vs live-mode
  selected explicitly (separate source instances downstream).
- QuickBooks: authorization-code flow with PKCE; accounting scopes
  are heavy and requested only for the demonstrated feature.
- Square: authorization-code flow with PKCE; sandbox application for
  all pre-production proof.
- Yelp Fusion: API key (no OAuth); key entered via the operator
  console into broker custody, never through the browser form.

### Step 5: callback
The provider redirects to the server callback with `code` + `state`.
The server verifies state (CSRF), then exchanges the code for tokens
server-side with the PKCE verifier (+ DPoP proof for ATProto, +
client assertion for confidential ATProto clients). The exchange
response is parsed for: access token, refresh token, granted scopes,
expiry, and (ATProto) sub/iss. The browser receives ONLY a
success/failure status. No token, no handle value, no material ever
reaches browser code.

### Step 6: encrypted token custody (lane-L broker issue())
The callback handler calls `broker.issue()` from the trusted path with:
principal (the connect-flow worker identity), tenant from trusted
context (never from request parameters), source id, the granted scopes
(the provider's answer, not the request), the credential material, and
a bounded TTL. The broker encrypts the material at rest (envelope
encryption, KEK outside the store) behind a versioned credentialRef and
returns an opaque `cap_` handle. The handler keeps NO copy. The handle
value itself is never stored server-side (only its sha256).

### Step 7: source capability inventory
With the handle, the worker runs the connector's discover() and builds
the inventory: streams available, capabilities granted (read.* only),
rate budgets, cursor kinds, webhook support, health = unknown (no
heartbeat yet). The inventory is shown to the user WITHOUT any secret
material. Then lane M register() creates the SourceRecord (connection
is the opaque handle; the registry never reads it), and lane J opens
the first run record.

## 2. Token containment rules (non-negotiable)

Tokens (access, refresh, API keys, client secrets, PKCE verifiers after
use, DPoP private keys) may exist in exactly three places: the broker
custody store (encrypted), the connector worker's process memory during
an in-flight provider call (ephemeral mode only, zeroed after use), and
provider TLS in transit. They MUST NEVER appear in: browser code or
network responses to the browser, agent context (prompts, tool args,
tool results), events, SiteSpec, the object graph, logs, fixtures,
diagnostics, checkpoints, cursors, or audit records. The callback
handler returns status + inventory only. The contract test kit's
secrets.redaction scan (canary + secret-shaped regexes over every
emitted surface) is the enforcement test; lane L's RT-1 is the
acceptance scenario.

## 3. Scope discipline

- Smallest permission set for the demonstrated feature. Each scope in
  MORNING-QUEUE.md carries its why and its what-breaks-without-it.
- Never request write scopes speculatively. v1 connectors are
  read-only; a write capability requires a separate elevated grant
  recorded in the registry (lane M: grantedCapabilities).
- Read back the provider's granted scopes from the token response;
  partial grants degrade the capability inventory (capabilities not
  granted are marked unsupported for this source, lane-K UNSUPPORTED),
  never silently assumed.
- Scope minimization is re-checked at every re-authorization: scopes
  granted last time are the ceiling, not the floor.

## 4. PKCE policy

PKCE (S256) is REQUIRED on every authorization-code flow PING
initiates, public or confidential client, per current OAuth best
practice (RFC 9700 / OAuth 2.1 direction) and per the standing
decision. ATProto additionally requires PAR + DPoP. The code_verifier
is generated per authorization attempt, stored server-side bound to
the state, single-use, and destroyed after the exchange (success or
failure). A callback arriving without a matching server-side verifier
fails closed (PROVIDER_ERROR, no token request attempted).

## 5. Isolated spike (fixtures only)

`spike/connect_flow_spike.py` (stdlib only, in this lane dir) simulates
the full flow against a fixture authorization server:

- FixtureProvider: a fake OAuth authorization server implementing the
  code + PKCE(S256) exchange, PAR-lite for the atproto profile, and
  scope-grant responses (including a partial-grant case).
- StubBroker: implements issue() returning `cap_`-shaped handles and
  records what it received; asserts it never receives browser-origin
  material.
- The spike drives IDLE -> ... -> INVENTORIED for three profiles
  (facebook, atproto, google-drive), plus two adversarial cases:
  (a) callback with wrong state -> fails closed, no token request;
  (b) provider grants a subset of scopes -> inventory marks the
  missing capability UNSUPPORTED.
- Containment assertions: after the run, the spike scans every
  browser-facing output, event payload, log line, and fixture artifact
  for the planted token canary and for secret-shaped values; any hit
  fails the run. This mirrors lane L RT-1 and the testkit
  secrets.redaction rule without duplicating their code.

Run: `python3 spike/connect_flow_spike.py`. Expected: ALL CHECKS PASS.
No network, no credentials, no PING repo writes.

## 6. What this design does NOT do

- No live provider calls, no real client ids/secrets, no redirect URIs
  registered tonight.
- No second secret store: custody is lane L's broker; the connect flow
  is a producer of issue() calls, not a store.
- No canonical writes: registration emits lane-M SOURCE_* events through
  the Event Authority when phase0 certifies the names; until then the
  flow stops at INVENTORIED in the spike.
- No agent-initiated connects: the flow is operator/UI-initiated only.
  Agents never call issue() and never see handles resolve (lane L RT-5).

## Shared record lines

DOMAIN: oauth | COMPONENT: connect-flow | CLAIM: 7-step state machine
(IDLE..INVENTORIED) with PKCE-S256 required on every authorization-code
flow and PAR+DPoP for ATProto; tokens never reach browser/agent/events/
logs/fixtures | EVIDENCE: this doc §1-4; atproto OAuth spec (PAR, PKCE,
DPoP required); RFC 9700 direction | CALLER: agent 16 | CALLEE: morning
connect implementation | WRITER: agent 16 | READER: coordinator, Nolan
| AUTHORITY: agent 16 | CLASSIFICATION: DESIGN-PROPOSAL | CONFIDENCE: 0.85
| BROKEN BOUNDARY: none | DEPENDENCIES: lane-l broker issue(), lane-m
register(), lane-j run records, phase0 event names | AFFECTS AGENTS:
morning connect implementer

DOMAIN: oauth | COMPONENT: connect-flow | CLAIM: scope discipline is
smallest-set + per-scope why/what-breaks + granted-scopes read-back +
no speculative write scopes | EVIDENCE: this doc §3; MORNING-QUEUE.md
per-scope tables | CALLER: agent 16 | CALLEE: Nolan (morning approver)
| WRITER: agent 16 | READER: Nolan | AUTHORITY: agent 16
| CLASSIFICATION: DESIGN-PROPOSAL | CONFIDENCE: 0.9 | BROKEN BOUNDARY: none
| DEPENDENCIES: MORNING-QUEUE.md | AFFECTS AGENTS: morning connect
implementer

DOMAIN: oauth | COMPONENT: connect-flow | CLAIM: UI offers CONNECT
FACEBOOK / CONNECT ATPROTO / CONNECT OTHER SOURCE with only certified
adapters enabled; no speculative buttons | EVIDENCE: standing decision
text; this doc §1 step 1 | CALLER: agent 16 | CALLEE: morning UI work
| WRITER: agent 16 | READER: coordinator | AUTHORITY: agent 16
| CLASSIFICATION: DESIGN-PROPOSAL | CONFIDENCE: 0.9 | BROKEN BOUNDARY: none
| DEPENDENCIES: BCQ testkit certification status per adapter
| AFFECTS AGENTS: morning connect implementer
