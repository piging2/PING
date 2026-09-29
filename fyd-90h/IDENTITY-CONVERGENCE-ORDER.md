# PING / FYD — IDENTITY AUTHORITY CONVERGENCE NOW

(Binding order from Nolan Geske, 2026-09-29 ~15:12 MDT. Verbatim.)

Nolan's standing lesson: IT DOESN'T MATTER WHO CREATED THEM. Always search
the ENTIRE repo including ALL WORKTREES before a new sprint to make sure
there is not a similar semantic capability overlapping an authority
capability. Always do it right from first principles.

EIGHT COMPETING IDENTITY-AUTHORITY IMPLEMENTATIONS IS UNACCEPTABLE.

STOP OPTIONAL HARVEST IMPLEMENTATION.

DO NOT CREATE ANOTHER IDENTITY SYSTEM.
DO NOT MASS-RENAME IDs.
DO NOT MIGRATE PRODUCTION DATA JUST TO MAKE THE CODE LOOK CLEAN.

THE OBJECTIVE IS:

ONE SEMANTIC AUTHORITY
+
COMPATIBILITY ADAPTERS
+
EXPLICIT SPECIALIZED IDENTIFIERS WHERE THEY ARE ACTUALLY DIFFERENT.

============================================================
FIRST — FORENSICALLY CLASSIFY ALL 8
============================================================

Enumerate every implementation. For EACH record:

PATH / LANGUAGE / EXPORT / CALLERS / INPUTS / OUTPUT FORMAT /
DETERMINISTIC? / CRYPTOGRAPHIC? / PERSISTED? / EVENT-REFERENCED? /
PUBLIC API? / WORKFLOW-SCOPED? / TEST COVERAGE / LIVE-DORMANT-DEAD /
SEMANTIC PURPOSE.

Then answer the critical question:

ARE THESE ACTUALLY EIGHT IDENTITY AUTHORITIES?

Or are some merely: artifact IDs / workflow IDs / execution IDs /
classification IDs / external-provider IDs / legacy helpers /
cryptographic identity utilities?

DO NOT collapse semantically different identifiers merely because they
contain the word "identity."

============================================================
DEFINE THE ONE CONTRACT
============================================================

PING needs ONE authority for: "WHAT IS THE STABLE PING IDENTITY OF THIS
ENTITY?"

That contract must explicitly distinguish:

PING IDENTITY

from:

provider identity / workflow identity / mission/run/execution ID /
artifact ID / object ID / key ID / external account claim.

Do not let those collapse into one namespace.

============================================================
PRESERVE EXISTING COMPATIBILITY
============================================================

Previous convergence work already discovered that legacy JS identity IDs
have compatibility-sensitive formatting.

DO NOT casually change: type_hash16, or any other persisted/
event-referenced format.

First prove exact live formats from code + tests + persisted usage.

If the canonical implementation must preserve legacy generation:
PRESERVE IT.

A prettier identifier is not worth breaking: events / replay /
references / projections / dedupe / stored objects.

============================================================
HUMAN CRYPTOGRAPHIC IDENTITY IS A SEPARATE CONCERN
============================================================

Do not confuse: deterministic internal ID generation with portable
cryptographic identity.

The canonical identity contract may compose: stable PING identifier +
controller/public key + verification methods where appropriate.

But key custody/signing is NOT justification for another IdentityAuthority.

Reuse the proven Ed25519/JWK/signature machinery.

Private keys never enter: public objects / ping_events / browser
projections / agent context / logs.

============================================================
CHOOSE THE SURVIVOR BY CALL GRAPH, NOT AESTHETICS
============================================================

The survivor is the implementation already closest to the actual live
authority path and compatibility contract.

Do NOT select based on: newest code / nicest TypeScript / best filename /
most ambitious abstraction.

Trace actual callers. Trace actual persisted identifiers. Trace replay.
Trace tests. Then choose.

============================================================
CONVERGENCE SHAPE
============================================================

TARGET:

                 IdentityAuthority
                        |
          +-------------+-------------+
          v             v             v
     resolve/create   verify       describe
          |             |
          +------|------+
                 v
          stable PING identity

Legacy callers -> COMPATIBILITY ADAPTER -> IdentityAuthority

Provider adapters -> IdentityClaim / ExternalIdentity -> PING Identity

Workflow-scoped identifiers remain workflow identifiers.

DO NOT route semantically unrelated IDs through IdentityAuthority.

============================================================
NO BIG-BANG REWRITE
============================================================

Converge one caller family at a time. For each duplicate:

1. prove semantics
2. prove callers
3. compare outputs against survivor
4. add characterization test
5. redirect caller
6. run targeted tests
7. run canonical gate
8. prove replay/projection compatibility where relevant
9. mark old implementation deprecated
10. delete only when zero callers and no compatibility requirement remain.

============================================================
ADD A SHADOW EQUIVALENCE HARNESS
============================================================

For duplicates claiming equivalent semantics: run OLD and CANONICAL
against the same fixture corpus. Record: INPUT / OLD OUTPUT / CANONICAL
OUTPUT / MATCH-INTENTIONAL-DIFFERENCE.

If they disagree: DO NOT "normalize" automatically. Classify why.
Possible outcomes: BUG / LEGACY CONTRACT / DIFFERENT SEMANTICS /
DEAD IMPLEMENTATION.

This harness prevents convergence from silently reminting identities.

============================================================
AUTHORITY RULE
============================================================

After convergence there must be ONE permitted import boundary for PING
identity decisions. Enforce it mechanically if practical. No feature code
may import deprecated identity implementations directly. CI/test should
fail when a new direct dependency is introduced. The eight implementations
must not slowly become nine again.

============================================================
EXTERNAL IDENTITIES ARE CLAIMS, NOT AUTHORITIES
============================================================

Website: sameAs -> provider account
ATProto: DID
Nostr: public key
ActivityPub: Actor URI
Facebook: provider account ID

These do NOT mint competing PING identities. They become evidence-backed
identity claims associated with a PING identity:

PING Identity
   |-- IdentityClaim -> Website
   |-- IdentityClaim -> ATProto DID
   |-- IdentityClaim -> Nostr pubkey
   |-- IdentityClaim -> ActivityPub Actor
   +-- IdentityClaim -> Facebook account.

That preserves future optionality across every social network.

============================================================
DO NOT CREATE THESE
============================================================

NO: SocialIdentityAuthority / FYDIdentityAuthority /
ProviderIdentityAuthority / HumanIdentityAuthority /
WorkflowIdentityAuthority replacement / IdentityGraphAuthority.

Use: ONE PING IDENTITY AUTHORITY plus typed objects/claims/adapters where
semantics differ.

============================================================
PROVE THE PRODUCT STILL WORKS
============================================================

This convergence is infrastructure debt removal. It earns its keep only if
FYD survives. After each meaningful convergence stage prove:

Website A -> same identity/object IDs
Website B -> same identity/object IDs
SiteSpecs -> same semantic output
renderer -> green
Ask FYD context -> unchanged identity semantics
events/replay -> unchanged.

NO product regression for architecture cleanliness.

============================================================
THE STOP CONDITIONS
============================================================

STOP before mutation if convergence would require: reminting persisted IDs
/ rewriting canonical history / production DB migration / changing event
identity semantics / breaking replay / changing signature ownership /
unknown key custody / overwriting dirty work from another lane.

Escalate with exact evidence. Do not bulldoze through compatibility.

============================================================
THEN DELETE THE DUPLICATION
============================================================

Once a duplicate has: ZERO LIVE CALLERS / ZERO REQUIRED COMPATIBILITY
CALLERS / CHARACTERIZATION COVERAGE / CANONICAL REPLACEMENT PROVEN

DELETE IT.

Do not leave eight deprecated authorities forever. But deletion follows
proof.

============================================================
DELIVERABLE
============================================================

IDENTITY IMPLEMENTATIONS FOUND: 8 / corrected exact count
ACTUALLY IDENTITY AUTHORITIES: ...
SEMANTICALLY DIFFERENT ID UTILITIES: ...
CANONICAL SURVIVOR: ...
WHY: ...
PERSISTED FORMAT: ...
EVENT/REPLAY DEPENDENCIES: ...
CALLERS BEFORE: ...
CALLERS CONVERGED: ...
COMPATIBILITY ADAPTERS: ...
DEPRECATED: ...
DELETED: ...
SHADOW EQUIVALENCE: PASS/FAIL
CANONICAL TEST: ...
FYD TWO-WEBSITE REGRESSION: PASS/FAIL
REPLAY: PASS/FAIL
NEW DIRECT DUPLICATE IMPORT GUARD: PASS/FAIL
REMAINING IDENTITY DEBT: ...

============================================================
MOST IMPORTANT RULE
============================================================

COLLAPSE AUTHORITY. DO NOT COLLAPSE SEMANTICS.

ONE COMPONENT DECIDES WHAT A PING IDENTITY IS.

EVERYTHING ELSE EITHER: USES IT, ADAPTS TO IT, OR IS PROVEN TO BE A
DIFFERENT KIND OF IDENTIFIER.

NO NINTH IMPLEMENTATION. CONVERGE NOW.
