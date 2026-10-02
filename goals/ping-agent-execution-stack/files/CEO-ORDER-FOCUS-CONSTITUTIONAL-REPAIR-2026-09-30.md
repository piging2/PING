PING/FYD — FOCUS
THE TESTING LADDER WORKED.
DO NOT START ANOTHER ARCHITECTURE WAVE.
DO NOT ADD ANOTHER AUTHORITY.
DO NOT EXPAND FEDERATION.
DO NOT POLISH THE WEBSITE.
WE HAVE ONE CONSTITUTIONAL BREAK AND THREE PRODUCT BREAKS.
FIX THEM IN THAT ORDER.
PROVEN DEFECT:
CanonicalBytes.serialize currently allows:
[1,2]
and
[12]
to collide because array element boundaries are absent.
That violates injectivity.
Therefore anything deriving identity/integrity from those bytes may be
affected.
DO NOT simply insert "," and redeploy.
FIRST ARCHAEOLOGY.
Trace EVERY caller and derivative of canonical serialization.
Search current tree + history for:
CanonicalBytes
serialize
canonicalize
canonical bytes
digest
hash
fingerprint
event_id
object_id
identity
signature
verify
witness
root
Merkle
dedupe
replay
cache key
proposal digest
approval binding.
Produce the actual blast radius.
For every consumer classify:
A — bytes only, ephemeral
B — hash persisted
C — identifier persisted
D — signature input
E — witness/root input
F — dedupe/idempotency key
G — replay comparison
H — external/protocol representation.
NO SPECULATION.
Preferred conceptual solution:
CanonicalBytesV1 = historical behavior
CanonicalBytesV2 = corrected injective behavior.
Do not mutate history invisibly.
Determine whether the existing envelope already carries enough version/
era/schema information to select the canonicalization contract.
If yes:
REUSE IT.
If no:
introduce the smallest explicit version discriminator at the correct
existing seam.
DO NOT create CanonicalizationAuthority.
OLD EVENTS MUST REMAIN VERIFIABLE UNDER THE RULES THAT CREATED THEM.
NEW EVENTS SHOULD USE V2 AFTER THE CUTOVER.
Verification conceptually becomes:
record
→ determine canonicalization version
→ canonicalize under that version
→ verify historical digest/signature/witness.
Never recompute historical V1 identities with V2 and silently call the
history corrupt.
Before cutover prove:
V1 historical corpus
→ still verifies
V2:
[1,2] != [12]
V2 deterministic:
same semantic input
→ same canonical bytes
across:
process
ordering where semantics permit
machine/runtime where practical.
Then prove all five currently failing surfaces become green through the
REAL implementation.
Not the what-if implementation.
BUG-0001 is evidence that canonicalization deserves hostile testing.
Do not stop at arrays.
Attack boundaries involving:
["1","2"] vs ["12"]
nested arrays
empty arrays
objects inside arrays
arrays inside objects
strings containing separators
Unicode
numbers
-0
null
booleans
escaping
nested structures.
Use property testing.
Do NOT invent a new serialization format casually.
If an established canonical representation is already part of PING or an
appropriate standard/library solves the exact required semantics, evaluate
it before expanding custom canonicalization.
But compatibility with existing PING history outranks aesthetic cleanup.
Before enabling V2:
OLD HISTORY VERIFICATION:
PASS
V1 GOLDENS:
PASS
V2 GOLDENS:
PASS
COLLISION REGRESSION:
PASS
PROPERTY TESTS:
PASS
METAMORPHIC:
PASS
REPLAY:
PASS
POSTGRES BOUNDARY:
PASS
SIGN/VERIFY:
PASS
PROPOSAL DIGEST BINDING:
PASS
WITNESS:
PASS
No silent rewrite of historical rows.
No destructive migration.
No changing persisted IDs merely because V2 looks cleaner.
After BUG-0001 is constitutionally closed:
AG-001
ASK-020
ASK-030.
These are more important to FYD users than another infrastructure sprint.
Current defect:
"What do you NOT know about this business?"
falls through because behavior depends on contiguous "do not".
That is brittle keyword routing masquerading as epistemic behavior.
Do not solve only by adding another regex.
Define the semantic intent required by Ask FYD:
KNOWN_FACT
EVIDENCE_REQUEST
UNKNOWN_LIMITS
CONTRADICTION
RELATIONSHIP_QUERY
OWNER_CORRECTION
CHANGE_PROPOSAL
etc., using the smallest set justified by the gold set.
Deterministic patterns can cover obvious forms.
Intelligence may classify genuinely ambiguous language.
But execution after classification remains deterministic.
Pin paraphrases:
"What don't you know?"
"What are you unsure about?"
"Where is the evidence incomplete?"
"What can't you verify?"
"Which facts are uncertain?"
They should reach the same epistemic behavior.
If user asks:
"Does the company charge $150?"
the string "$150" in the question is NOT evidence that it charges $150.
Hard invariant:
USER QUERY CONTENT
!=
SUPPORTED FACT.
Answer must distinguish:
SUPPORTED
CONTRADICTED
UNKNOWN.
A contradicted premise must never be repeated as factual merely because
the user supplied it.
If owner corrected a claim:
the stale source claim may remain as historical evidence,
BUT the current answer must respect the current owner state according to
the established provenance/visibility rules.
Never erase history.
Never let stale evidence silently override a current owner correction.
Prove:
source says A
owner corrects to B
Ask FYD answers B with appropriate provenance/status
history can still explain source A
regeneration does not resurrect A as current truth.
32 questions is enough to start.
Do not inflate it to 500 manually.
Every real failure becomes a new regression example.
Track at least:
claim support
evidence recall
forbidden claims
correct refusal
contradiction handling
owner-correction handling
privacy behavior.
JEV stays SHADOW.
It may:
evaluate
rerank
flag
compare.
It does NOT become truth.
Executable evidence remains the gate.
The architecture exists for this experience:
USER GIVES FYD EXISTING PRESENCE
↓
FYD UNDERSTANDS IT
↓
FYD SHOWS WHAT IT KNOWS
↓
USER ASKS QUESTIONS
↓
FYD ANSWERS FROM EVIDENCE
↓
USER CORRECTS IT
↓
FYD REMEMBERS THE CORRECTION
↓
USER SAYS WHAT THEY WANT
↓
FYD PROPOSES THE CHANGE
↓
USER APPROVES
↓
FYD CHANGES THE EXPERIENCE
↓
SOURCE CHANGES LATER
↓
FYD RECONCILES WITHOUT DESTROYING OWNER INTENT.
THAT is why the underlying machinery exists.
Do not justify PING because it is sophisticated.
Justify it only where it buys future optionality.
The same evidence-backed object graph can eventually project into:
FYD WEBSITE
FYD CIRCLE
SEARCH
FEED
ASK FYD
MOBILE
MCP
ACTIVITYPUB
ATPROTO
NOSTR
OTHER FUTURE PROTOCOLS.
The same capability system can eventually govern:
EDIT SITE
PUBLISH OBJECT
FOLLOW
REFERENCE
SEND REQUEST
SCHEDULE
PURCHASE
RUN AGENT
EXECUTE CAMPAIGN.
The same transition/evidence history can support:
WHY THIS?
WHO CHANGED THIS?
WHAT SOURCE CHANGED?
WHAT DID THE AGENT PROPOSE?
WHAT DID THE HUMAN APPROVE?
WHAT HAPPENED AFTERWARD?
THAT is useful optionality.
Anything that does not improve one of those shared primitives should have
to justify its existence.
The current ownership split is directionally correct:
Tenant/capability:
TenantOS
Mission/run/finding/event transition/outcome:
Mission Control canonical mission system
Judgment:
JEV
SiteSpec:
FYD website-building vertical
ORCA:
READ + PROPOSE.
NO PARALLEL TRUTH STORE.
Tests:
VERIFY.
NO SEMANTIC OWNERSHIP.
Do not add another owner merely because integration is difficult.
The stated gap is real:
tenant header asserting identity
!=
authorization.
Do not call tenant isolation secure until a malicious cross-tenant request
is denied by an authenticated authorization boundary.
The future proof must include:
Tenant A credential
→ Tenant B private resource
→ DENIED
not merely:
Tenant A accidentally asks for Tenant A namespace.
But do not let this interrupt BUG-0001 unless the migration itself crosses
tenant boundaries.
Respect the dependency:
FINDING-SET PERSISTENCE SEAM FIRST.
ORCA does not write around it.
If ORCA output cannot round-trip:
ORCA
→ canonical mission finding
→ persistence
→ replay
→ Mission Control read
losslessly,
the seam is still broken.
No UI work fixes that.
Keep the ladder.
It is already paying for itself.
T0 static
T1 unit
T2 properties
T3 metamorphic
T4 replay
T5 lifecycle/state model
T6 real Postgres integration.
Stryker:
keep on small constitutional/high-risk targets.
Fast-check:
keep.
Testcontainers:
only if isolation/reproducibility eventually earns its dependency cost.
Schemathesis:
wait for trustworthy OpenAPI.
Playwright:
activate when the designated FYD browser target is fixed.
Do not collect testing tools as trophies.
1. BUG-0001 BLAST-RADIUS ARCHAEOLOGY.
2. VERSIONED CANONICALIZATION DECISION.
3. IMPLEMENT V2 + HISTORICAL V1 VERIFICATION.
4. RUN ENTIRE LADDER.
5. AG-001.
6. ASK-020.
7. ASK-030.
8. RUN ASK FYD GOLD SET.
9. CLOSE FINDING-SET PERSISTENCE SEAM.
10. RESUME THE FYD OWNER LOOP.
FIRST BROKEN SEAM WINS.
BUG-0001 CALLERS:
...
PERSISTED DERIVATIVES:
...
V1 HISTORICAL VERIFICATION:
...
V2 CONTRACT:
...
MIGRATION/CUTOVER:
...
COLLISION PROPERTY:
...
FULL LADDER:
...
AG-001:
...
ASK-020:
...
ASK-030:
...
GOLD SET:
...
FIRST BROKEN SEAM:
...
NEXT:
...
THE TESTS JUST SAVED US FROM BUILDING ON A BROKEN IDENTITY PRIMITIVE.
USE THAT WIN.
DO NOT RESPOND BY BUILDING MORE ARCHITECTURE.
REPAIR THE CONSTITUTION.
THEN RETURN DIRECTLY TO THE USER EXPERIENCE.
EVERY DEEP PING PRIMITIVE MUST EARN ITS WEIGHT BY MAKING FYD:
MORE TRUSTWORTHY,
MORE REPLAYABLE,
MORE PORTABLE,
OR MORE CAPABLE.
OTHERWISE CUT IT.
GO.
