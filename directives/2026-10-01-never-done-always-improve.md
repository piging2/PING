# PING / FYD — NEVER DONE. ALWAYS IMPROVE.

Nolan directive, 2026-10-01 ~18:15 MDT. Filed verbatim.

KEEP GOING.
DO NOT START ANOTHER ARCHITECTURE WAVE.
WE HAVE A REAL REACHED DEFECT.
ATTACK IT.

Current evidence says:
THREE JOURNAL FILES EXIST.
CANONICAL GATEWAY: port 18199, proven canonical owner.
FORK: port 18200, no live consumers.
THIRD JOURNAL: dispatch / approvals / emit.py READ + APPEND HERE but canonical gateway cannot see those events.
THIS IS A TRUTH-SPLIT DEFECT.
Fix that before making Mission Control prettier.

Target invariant:
EVERY CANONICAL EVENT
↓
ONE REACHED JOURNAL AUTHORITY
↓
EVERY READER / PROJECTION.

No sync job. No reconciliation daemon. No journal adapter. No fourth store.

Before changing a writer: inventory every journal path. For each: absolute path, owner/caller, readers, writers, event count, first event, last event, unique event IDs, overlap, events existing nowhere else.

DO NOT DELETE THE FORKS. Determine whether either contains canonical events that never reached journal one. If unique legitimate events exist: PRESERVE THEM AS EVIDENCE. Do not silently merge history until event identity/order/authority has been proven. (Nolan correction: do not "retire the fork" until its unique history is characterized. A dead reader does not prove a dead journal. First inventory and classify; then make all future writes converge. Only afterward decide whether old files are archival evidence, invalid history, or safely disposable.)

Trace individually: dispatch, approvals, emit.py. For each prove:
BEFORE: writer reaches wrong journal.
SMALLEST PATCH: writer uses existing canonical journal owner/path/configuration.
AFTER: new event is visible through canonical gateway.
One semantic proposition per commit. Example: fix: route dispatch events through canonical journal → TEST → COMMIT; then fix: route approval events through canonical journal → TEST → COMMIT; then fix: route emit.py through canonical journal → TEST → COMMIT. Do not bundle them merely because the defect class is shared.

The especially dangerous defect is code claiming "no new store" while silently defaulting to another file. Remove that possibility. Canonical journal location must come from ONE existing configuration authority. If canonical configuration is unavailable: FAIL CLOSED. DO NOT: silently create ./journal.jsonl, silently fall back to another database, silently create a home-directory journal, silently use a test fixture. A missing canonical journal is an operational error. Not permission to invent another truth store.

After convergence deliberately attempt: dispatch, approval, emit with misleading working directory, environment, legacy default path, fork file present. They must STILL resolve to the canonical reached owner or fail closed. That prevents this exact defect from returning.

ONLY AFTER WRITERS CONVERGE: restore the served Mission Control process. Port 3100 currently being down is a reachability defect. Do not confuse DEV SERVER EXISTS with MISSION CONTROL SERVED. Prove: PROCESS → PORT → HTTP → CANONICAL GATEWAY → CANONICAL JOURNAL → PROJECTION → BROWSER. Then run ONE real mission. Use one harmless bounded mission. Prove the actual chain: HUMAN INTENT ↓ ORCA PROPOSAL ↓ AUTHORITY ↓ CAPABILITY ↓ PLACEMENT ↓ WORKER ↓ RESULT ↓ INDEPENDENT VERIFICATION ↓ OUTCOME ↓ LEARNING / UNKNOWN. Do not fabricate missing stages for the demo. If placement is not reached: show NOT PLACED / UNKNOWN. If verification does not exist: show UNVERIFIED. If learning is not reached: show NO LEARNING RECORDED. Mission Control becomes valuable precisely because it refuses to lie.

Do NOT expand TenantOS yet. Current useful fact: tenant::ping already exists on missions. Good. Use it. The next missing primitive is only: (tenant, required capability) → eligible execution target. When the real mission reaches that boundary, implement the smallest pure resolver: INPUT: tenant, required capabilities, candidate targets, policy, health. OUTPUT: eligible targets, selected target, decision evidence / rejection reasons. PLACEMENT DOES NOT EXECUTE. The existing execution authority executes. No new scheduler. No fake tenants. No distributed-control-plane project.

The unauthenticated /tenants write surface remains a real defect. Close it surgically. First reproduce unauthorized mutation. Then identify the existing authentication/authorization mechanism. Then require appropriate authority. Then rerun the SAME hostile request unchanged. Expected: DENIED. Commit that proposition separately. Do not build tenant administration around the fix.

FINISH THE OWNED VISUAL SLICE. COMMIT IT. Then stop visual expansion unless a reproduced defect exists. The art has one job: CONCEPT → PROOF. Continuity → real lifecycle/state. Evidence → real evidence. Knowledge → real objects/relationships. Do not add another illustration family. The next improvement after each beautiful section is not more copy. It is inspectable product state.

FYD remains: A PROJECTION OF PING UNDERSTANDING. Not a separate truth system. The important chain remains: SOURCE → OBSERVATION → EVIDENCE → OBJECT → RELATIONSHIPS → SITE SPEC → FYD. Owner customization modifies authorized presentation. It must not rewrite observed truth. Move this toward the center.

The interesting product is NOT: chatbot + website. It is: QUESTION + CURRENT OBJECT + RELATIONSHIPS + EVIDENCE + VISIBILITY + CAPABILITIES → EVIDENCE-BOUNDED ANSWER. The killer interaction remains: "How do you know?" SUPPORTED: answer + evidence. PARTIAL: known + unknown. CONFLICT: show disagreement. UNSUPPORTED: say evidence does not establish it. That behavior is more important than another marketing section.

YES: commit constantly. But the atomic unit is: ONE SEMANTIC PROPOSITION. Every writer: STATUS → BEFORE SHA → OWNED FILES → REPRODUCE → SMALLEST CHANGE → TEST → DIFF → COMMIT OWNED FILES → AFTER SHA. Writer gets redirected? COMMIT FIRST. Useful incomplete state? HONEST WIP COMMIT. No push. No reset. No clean. No absorbing another lane's files. COMMIT ≠ PROOF.

After several commits: give an independent auditor ONLY the SHAs. No writer narrative. Auditor must reconstruct: what each commit claims, why commit N follows N-1, test supporting it, failure it corrected, highest proof level, remaining UNKNOWN. If Git history cannot tell the experiment: our commits are too muddy.

"GREEN" DOES NOT MEAN STOP. GREEN MEANS: MOVE TO THE NEXT REACHED BOUNDARY. But NEVER expand sideways merely because something became green. Use: CLAIM ↓ CHEAPEST FALSIFICATION ↓ OBSERVATION ↓ FIRST BROKEN REACHED EDGE ↓ SMALLEST CORRECTION ↓ TEST ↓ COMMIT ↓ RE-RUN ↓ NEXT REACHED EDGE. That is the permanent development loop.

## NUMBERED ATTACK ORDER

1. Preserve visual owned work in semantic commits.
2. Inventory all journal paths/readers/writers.
3. Prove unique/overlapping history before touching old journals.
4. Converge dispatch → canonical journal.
5. Converge approvals → canonical journal.
6. Converge emit.py → canonical journal.
7. Add hostile no-fallback journal test.
8. Restore actual Mission Control on its intended served path.
9. Run ONE real bounded mission.
10. Display only reached mission truth.
11. Close unauthenticated /tenants mutation.
12. Let that mission tell us whether placement is now the first broken edge.
13. If yes, implement the tiny deterministic placement resolver.
14. Resume FYD owner loop / Ask FYD from reached canonical state.

NO: journal synchronization, journal replication architecture, new event store, new scheduler, new Mission Control truth store, new TenantOS service, fake tenant fleet, vector tenancy work, protocol expansion, provider expansion, architecture rewrite, visual redesign, pushes.

HARVEST EXISTING CODE BEFORE EVERY NEW MODULE.

## REPORT FORMAT

VISUAL COMMITS: ...
JOURNALS FOUND: ...
CANONICAL OWNER: ...
UNIQUE EVENTS IN FORKS: ...
DISPATCH: BEFORE / AFTER / SHA
APPROVAL: BEFORE / AFTER / SHA
EMIT: BEFORE / AFTER / SHA
FALLBACK HOSTILE TEST: PASS/FAIL
MISSION CONTROL PROCESS: ...
MISSION CONTROL → CANONICAL JOURNAL: PASS/FAIL
REAL MISSION: ...
ORCA: REACHED/UNREACHED
AUTHORITY: REACHED/UNREACHED
CAPABILITY: REACHED/UNREACHED
PLACEMENT: REACHED/UNREACHED
WORKER: REACHED/UNREACHED
VERIFICATION: REACHED/UNREACHED
OUTCOME: REACHED/UNREACHED
LEARNING: REACHED/UNREACHED
/TENANTS UNAUTHORIZED WRITE: DENIED/FAIL
FIRST BROKEN REACHED EDGE: ...
NEXT SEMANTIC PROPOSITION: ...
DIRTY FILES LEFT UNTOUCHED: ...
PUSHED: NO

NEVER DONE. ALWAYS IMPROVE. BUT IMPROVEMENT DOES NOT MEAN: BUILD MORE THINGS. IT MEANS: MAKE ONE MORE CLAIM TRUE. REMOVE ONE MORE DUPLICATE AUTHORITY. CLOSE ONE MORE BYPASS. CONNECT ONE MORE STRANDED IMPLEMENTATION. FALSIFY ONE MORE ASSUMPTION. TURN ONE MORE UNKNOWN INTO OBSERVED TRUTH. THEN COMMIT IT.

PING DOES NOT WIN BY HAVING THE MOST ARCHITECTURE. PING WINS WHEN: WHAT EXISTS IN THE WORLD → WHAT PING OBSERVES → WHAT PING BELIEVES → WHAT PING PROPOSES → WHAT A HUMAN AUTHORIZES → WHAT ACTUALLY EXECUTES → WHAT THE WORLD ACTUALLY DID → WHAT PING LEARNS IS ONE CONTINUOUS, INSPECTABLE, REPLAYABLE CHAIN. BUILD THAT CHAIN. NEVER STOP IMPROVING IT. GO.
