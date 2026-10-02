# PING Verdict Authority — Authorized Fix Lane

Issued by Nolan, 2026-09-23 07:46 MDT. Verbatim. Binding on the Jev fix lane. No live deployment authorized by this message.

GO — TAKE THE VERDICT AUTHORITY FIX LANE.

THE LIVE FORENSICS OVERRIDE THE EARLIER STATIC HYPOTHESIS.

CURRENT FACT:

LIVE HTTP INGRESS IS AUTHENTICATED.

THE BUG IS NOT:

UNAUTHENTICATED USER CAN FORGE VERDICT.

THE BUG IS:

AUTHENTICATED PRINCIPAL
+
VALID API KEY
≠
AUTHORIZED VERDICT PRODUCER.

FIX THAT PRECISELY.

DO NOT REDESIGN THE EVENT SYSTEM.

LOCK THIS:

AUTHENTICATION answers:

WHO IS CALLING?

AUTHORIZATION answers:

WHAT MAY THEY DO?

PROVENANCE answers:

WHERE DID THIS CLAIM COME FROM?

EVIDENCE answers:

WHAT SUPPORTS THE CLAIM?

VERIFICATION answers:

DID THE REQUIRED CHECK ACTUALLY PASS?

ATTESTATION answers:

WHO/WHAT VERIFIED THAT CHECK?

NONE OF THESE ARE INTERCHANGEABLE.

A VERDICT-CLASS EVENT MUST NOT ACQUIRE VERDICT AUTHORITY MERELY BECAUSE:

event_type is registered
API key is valid
actor/source string looks trusted
payload says VERIFIED
event reached ping_events
bridge forwarded it
witness saw it.

A verdict is authoritative only when its provenance demonstrates an AUTHORIZED VERDICT-PRODUCING EXECUTION PATH.

Search the repository first for the actual semantic family.

Classify events whose meaning asserts outcomes such as:

VERIFIED
VALIDATED
ATTESTED
APPROVED
CERTIFIED
PASSED

but do NOT assume naming alone determines authority.

Find the semantic contract already present.

The desired abstraction is conceptually:

EVENT CLASS
→ REQUIRED CAPABILITY / PRODUCER CLASS
→ PROVENANCE REQUIREMENTS.

Reuse existing capability/governance machinery.

DO NOT CREATE:

VerdictAuthority
TrustAuthority
VerificationAuthority

unless repository evidence proves the existing authority system cannot express this.

The PRIMARY invariant belongs at canonical event admission.

Reason:

once an unauthorized verdict enters canonical history, every downstream consumer must remember that it is epistemically poisonous.

Therefore:

AUTHENTICATED PRINCIPAL
↓
EVENT REQUEST
↓
SCHEMA / TYPE VALIDATION
↓
CAPABILITY / PRODUCER AUTHORIZATION
↓
PROVENANCE VALIDATION
↓
CANONICAL ADMISSION
↓
ping_events.

For verdict-class events:

FAIL CLOSED BEFORE CANONICAL PERSISTENCE.

But first prove which existing component actually owns canonical admission in the LIVE path.

Do not assign responsibility based on class names.

Witness must ALSO refuse to upgrade an unauthorized verdict.

This is defense in depth, not the primary admission mechanism.

Witness must not mean:

"I observed a row saying VERIFIED."

Witness must mean something closer to:

"I independently established that this claim has the required evidence and authority for the thing I am attesting."

Determine what the existing Witness contract actually promises.

Do not silently strengthen its semantics beyond current design.

If Witness is intentionally only a notary:

rename/classify its output appropriately rather than pretending it is an independent verifier.

DO NOT TRUST:

source = "kernel"

actor = "kernel"

payload.kernelProduced = true

route name

event name.

Those are claims/identifiers.

Not proof.

Search existing runtime for reusable evidence:

authenticated principal
capability grant
mission ID
run ID
execution ID
causation ID
correlation ID
artifact/evidence digest
signed transition
worker identity
canonical event ancestry.

Find the SMALLEST existing combination that proves:

AUTHORIZED PRINCIPAL
+
AUTHORIZED CAPABILITY
+
AUTHORIZED EXECUTION
+
EXPECTED EVIDENCE
→ verdict event.

Do not invent cryptography if the existing execution/capability chain already proves this.

YES — USE THIS AS A DESIGN INVARIANT.

A bridge may transport:

identity
tenant
namespace
provenance
trust classification.

It may not silently upgrade:

UNVERIFIED → VERIFIED
UNAUTHORIZED → AUTHORIZED
TENANT → SYSTEM
EXTERNAL → KERNEL
UNKNOWN → GOVERNED.

Transport preserves or reduces trust unless a NEW verification operation produces evidence justifying an upgrade.

Audit EventToMissionBridge and every verdict-relevant bridge against this rule.

Preserve tenant provenance end-to-end.

A tenant-originated event must not become SYSTEM merely because an internal bridge transported it.

Trace:

HTTP principal
→ tenant
→ event
→ mission
→ worker
→ resulting event.

At every hop prove:

tenant identity preserved
actor preserved/derived legitimately
causation preserved
authorization context available where needed.

Do not fix this by copying arbitrary inbound headers.

Do not treat propagated metadata as authority.

OpenTelemetry and similar context propagation are useful for carrying execution context, but arbitrary propagated baggage has no built-in integrity guarantee.

Therefore:

trace IDs
baggage
headers
correlation IDs

may CONNECT evidence.

They do not AUTHORIZE verdicts.

PREFER:

existing ingress/governance admission seam
+
existing capability system
+
existing execution provenance
+
witness verification guard.

NOT:

new service
new authority
new database
new event bus
new identity model.

The patch should be boring.

Create the smallest safe test proving the actual vulnerability before fixing it.

AUTHORIZED API KEY
+
manually constructed verdict-shaped event
+
no qualifying verdict capability/provenance

CURRENT:
accepted / witnessed as authoritative.

AFTER:
REJECTED BEFORE CANONICAL ADMISSION

or, if architectural evidence proves canonical neutral storage is intentional:

PERSISTED AS NON-AUTHORITATIVE
+
IMPOSSIBLE FOR WITNESS/CONSUMERS TO UPGRADE.

PRIMARY PREFERENCE:

REJECT unauthorized verdict-class events before canonical persistence.

Do not force this preference if the existing event model explicitly requires neutral observation storage.

PROVE THE MODEL.

Use the forensic lane's existing corpus.

After patch:

7 weak cases:
REJECTED OR PROVABLY INERT

5 strong cases:
PASS UNCHANGED.

No weakening genuine pipeline behavior to make security tests green.

Run one real legitimate verdict path.

Capture:

principal
tenant
mission
run/execution
capability decision
evidence reference
verdict event
witness result.

That becomes the golden-path regression fixture.

Explicitly prove:

AUTHORIZED VERDICT + VALID EVIDENCE
→ WITNESS ACCEPTS

AUTHENTICATED BUT UNAUTHORIZED VERDICT
→ WITNESS REFUSES

AUTHORIZED CALLER + MISSING EVIDENCE
→ WITNESS REFUSES OR DOWNGRADES ACCORDING TO CURRENT CONTRACT

FORGED "kernel" LABEL
→ WITNESS REFUSES

Do not allow source-string spoofing.

DO NOT FIX THE 1.0 DEFAULT OR P2 0.85 IN THIS PATCH.

But record the architectural answer:

CONFIDENCE IS NOT AUTHORITY.

A confidence number cannot transform:

UNAUTHORIZED
into
AUTHORIZED

or:

UNVERIFIED
into
VERIFIED.

Later confidence cleanup should make confidence evidence-derived or explicitly unknown where evidence is absent.

Do not mix that migration into this security fix.

Do not redesign PostgreSQL now.

But record whether direct DB writers can bypass the canonical admission rule.

If yes:

classify them.

The long-term invariant is:

EVERY CANONICAL VERDICT WRITE HAS ONE AUDITABLE AUTHORITY PATH.

Database controls can provide defense in depth later.

Do not add triggers merely to compensate for unclear application authority.

Search for:

source ===
actor ===
namespace ===
event_type ===
metadata.kernel
metadata.verified
payload.verified
confidence === 1
confidence >=
"system"
"kernel"
"trusted"

in every verdict consumer.

Classify each use:

ROUTING
DISPLAY
IDENTIFICATION
AUTHORIZATION
TRUST DECISION.

Any string used as an authorization/trust decision is suspect until backed by authority evidence.

BUILD + TEST OFFLINE/CANDIDATE.

The current authorization does NOT include:

live restart
live image replacement
database mutation
trigger changes
credential changes
8080 swap.

Prepare the candidate and evidence.

Return for promotion authorization only if deployment would modify live state.

Do NOT hunt for credentials.

Do NOT dump secrets.

First determine whether the required proof can run against:

ephemeral Postgres
existing test fixture
local container
mocked admission seam
isolated scratch DB.

Prefer disposable test infrastructure.

If a specific existing staging credential is truly necessary:

STOP AND ASK NOLAN FOR THAT SPECIFIC ACCESS.

State:

SYSTEM:
PURPOSE:
MINIMUM PERMISSION:
WHY DISPOSABLE TEST INFRASTRUCTURE IS INSUFFICIENT:

Nothing more.

Separately:

the proven min-w-0 mobile fix is one line and already measured.

If commit isolation is safe:

commit ONLY that intended change with its regression evidence.

Do not sweep the 23 unrelated dirty files into it.

If isolation is not provable:

leave it untouched and report.

Return:

LIVE THREAT MODEL:
...

CANONICAL ADMISSION OWNER:
...

VERDICT CLASSIFICATION:
...

AUTHENTICATION OWNER:
...

AUTHORIZATION OWNER:
...

PROVENANCE REQUIRED:
...

TRUST-TRANSPORT INVARIANT:
PASS/FAIL

TENANT PRESERVATION:
PASS/FAIL

PRIMARY PATCH:
...

WITNESS DEFENSE:
...

WEAK CASES:
X/7 rejected-or-inert

STRONG CASES:
X/5 pass

GENUINE PIPELINE:
PASS/FAIL

DIRECT DB BYPASS:
YES/NO/UNKNOWN

TESTS:
...

FILES CHANGED:
...

NEW AUTHORITIES:
ZERO EXPECTED

LIVE MUTATION:
ZERO

UI ONE-LINER:
...

NEEDS FROM NOLAN:
NONE

or exactly the minimum missing access/decision.

A VALID API KEY MUST MEAN:

"I KNOW WHO YOU ARE."

NOT:

"I BELIEVE EVERY CLAIM YOU MAKE."

A VERDICT MUST MEAN:

"AN AUTHORIZED VERIFICATION PATH PRODUCED THIS CLAIM AND THE REQUIRED EVIDENCE EXISTS."

THE WITNESS MUST NOT LAUNDER CLAIMS INTO TRUTH.

THE BRIDGE MUST NOT LAUNDER TRUST.

THE EVENT TYPE MUST NOT LAUNDER AUTHORITY.

FIX THAT ONE INVARIANT CORRECTLY.

GO.

## Nolan's decisions on the adversarial questions

Canonical admission should own the primary invariant. Once an event has entered the canonical journal as an apparently ordinary REPLAY_VERIFIED-class event, you've created a permanent requirement that every future consumer understand hidden provenance rules. That's fragile. Sigstore's policy-controller follows the same broad pattern: identity/signature alone isn't sufficient; admission evaluates the authority and attestation policy before admitting the artifact.

Witness should be the second barrier, not the first. The critical distinction is whether PING's Witness means notary ("I saw this event") or verifier ("I independently verified the proposition"). The repository needs to answer that. If it's only a notary today, don't quietly give it stronger semantics. But it absolutely must not turn "authenticated caller asserted VERIFIED" into independent evidence of verification.

kernel-produced cannot be a string. source, actor, event type, route and run ID are identifiers or claims. A useful proof is a chain tying an authenticated principal to an authorized capability, execution/run, evidence/artifact, and causation leading to the verdict. in-toto is a useful analogy: the value comes from verifying both which functionary was authorized for a step and the signed evidence that the expected step occurred.

"Trust must not increase during transport" is the correct bridge invariant. Transport can carry a trust classification; it cannot manufacture one. Also don't make trace/baggage metadata the proof mechanism: OpenTelemetry explicitly warns that baggage has no built-in integrity checks and incoming context can be forged.

The confidence=1.0 and 0.85 issues are real but separate. My target model is that unknown confidence is absent/null rather than implicitly perfect, and meaningful confidence should ultimately be derived from evidence/policy rather than manufactured by an arbitrary caller. But changing confidence semantics in this security patch would expand the blast radius unnecessarily. First stop unauthorized verdicts from becoming truth.

The dead confidence adapter stays dead for now. If truly unreachable, don't burn the lane deleting it. Mark/test reachability if cheap; later either delete it or make activation require the same evidence-derived contract. Dead questionable code is technical debt; reachable trust laundering is the incident.

One more future-proofing point: if later you want database-level tenant isolation, PostgreSQL 18's RLS remains a legitimate defense-in-depth tool — when enabled, rows are subject to policies and absent policies default-deny for normal access. But don't use RLS or triggers to paper over an unclear event authority today.

What I need from Nolan right now: nothing. Build and falsify this in disposable/local infrastructure first. Only ask for access if the agent proves a specific staging credential is indispensable. And no live deployment is authorized by this message.
