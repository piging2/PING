# Lane B9 interim report: continuous security adversary

T+0 2026-09-28 14:26 MDT. This is an interim report; final due T+20 (2026-09-29 10:26 MDT).
Status of every claim below: HYPOTHESIS until replayed from a clean checkout.
Read-only throughout: no gateway contact beyond read-only observation, no scheduler
missions touched, no :3100 restart, no push, no JEV namespace registration touched,
no production writes of any kind. All repros run against scratch copies.

No em dashes are used in lane-authored prose. Verbatim upstream source copies retain
their original bytes for fidelity.

## 1. Reaper liveness: CONFIRMED LIVE at byte level (was UNKNOWN)

The earlier observation left one gap: scheduler liveness was confirmed but the exact
violating reaper bytes inside the running container were not directly observed. That
gap is now closed, read-only, via docker exec against the live `ping-gateway`
container (image ping-gateway:repair-cert-20260924, observed 2026-09-28):

- `/app/ping-runtime/orchestration/mission_scheduler.js:168`:
  `const reaped = await this._missionRuntime.reapExpiredLeases();`
  called on every 5-second poll after lease renewal for the scheduler's own
  `_processing` set (line 151 comment: renewal must run BEFORE reap).
- `/app/ping-runtime/orchestration/mission_runtime.js:277-285`:
  the violating reaper verbatim: UPDATE ping_missions SET status='created',
  assigned_to=NULL, lease_until=NULL, claimed_at=NULL, retry_at=NOW()
  WHERE status IN ('running','assigned') AND lease_until IS NOT NULL
  AND lease_until < NOW() RETURNING mission_id.

Verdict: the reaper that silently re-dispatches unknown-outcome work is LIVE in the
running container, byte-identical in behavior to the host worktree method. Combined
with B4 T6 (effect success followed by terminal journal-write failure leaves the
mission RUNNING with total evidence loss), the composed shape is: a mission whose
outcome is unknown sits RUNNING in the DB, its lease expires, the live reaper flips
it to created, and it is re-dispatched with no reconciliation marker. The
reaper-vs-HOLD design gap (AGENTS.md) is the same shape for held missions.

Falsifier: a clean-checkout replay showing the live image's reaper consults journal
terminal state before flipping, or a guard that marks re-dispatched missions for
reconciliation. Neither was observed.

## 2. Journal write-authority forgery: FAIL (new repro)

Repro: `~/workspace/ping-24h/repro/scratch/b9-journal-authority-forgery.mjs`
(runs on B4's real scratch copy of mc-dispatch.ts at HEAD 0264d517: real
appendDispatchEvent, mintEventId, loadJournalEvents, projectMissions).

- Attack A (capability forgery via the real append API): a second
  MC_AGENT_AUTHORIZED with a divergent summary is APPENDED (dedupe key is only
  kind|missionId|eventType|summary) and the projector adopts the forged
  capabilities_granted ['text.summarize','exec.shell','network.egress'] and the
  forged work_order_id. The projector performs zero adapter binding
  (projectMissions: `m.capabilities_granted = d.capabilities_granted`).
- Attack B (raw file forgery, no API at all): a hand-written JSON line with a
  random event_id is loaded by loadJournalEvents (no event-type allowlist, no
  event_id verification, no signature) and flips a mission from UNKNOWN
  (RECONCILIATION IN PROGRESS) to SUCCEEDED with a forged output_digest; the
  reconciliation_state clears with no marker.

Verdict: file write access to the journal IS authority to grant capabilities and
to decide mission outcomes. The only defense is OS file permissions. This composes
with B4 T7/T8 (divergent terminal summaries accepted; late success overwrites
UNKNOWN): the journal has no writer authentication, so "reconciliation" claims
rest on a file any local writer can edit.

Falsifier: a deployed writer-authenticity mechanism (signed events, append-only
via a capability-checked API, projector allowlist of writer identities).

## 3. Approval surface: digest substitution HOLDS, attribution FAILS (new repro)

Repro: `~/workspace/ping-24h/repro/b9-approval/b9-approval-attribution.py`
(real mc-approval/approval_request.py, stdlib-only, read-only copy; event sink
stubbed, which does not affect the authorization logic under test).

- Control: authorize with a wrong digest is refused (digest_mismatch), no state
  change. The primitive compares expected_digest == rec["proposal_digest"]
  exactly; route.ts additionally enforces 64-char lowercase hex. Digest
  substitution attacks FAIL CLOSED. This control is real and tested.
- Attack: with the CORRECT digest (visible via the unauthenticated GET
  /api/mc/approvals?proposal_id=) and approver_identity='nolan:demo-owner'
  (the route's default, taken verbatim from the caller body), the transition
  is APPROVED and the record shows decided_by='nolan:demo-owner'. A second
  proposal approved as 'mallory:lan-attacker' records that string verbatim.

The route (src/app/api/mc/approvals/route.ts) has NO caller authentication:
middleware.ts does no auth, and only dispatch + tenant-gate use
x-mc-caller-key. Observed read-only: :3100 listens on *:3100 (all interfaces),
not localhost-only. So anyone reaching the port can approve any recorded
proposal AS Nolan, and the journal's "who approved" is self-certified. WHAT is
bound by the digest; WHO is not bound at all.

Falsifier: the deployed route authenticates the caller and binds
approver_identity to the authenticated principal instead of the request body.

## 4. Digest-authority confusion: FAIL (new repro, from B8's dimension 5)

Repro: `~/workspace/ping-24h/repro/b9-digest/b9-digest-confusion.mjs`
(verbatim digest.ts copy; verbatim extract of dev-signer.canonicalizeJson).

digest.ts claims "lanes import, never re-implement", but dev-signer ships a
second canonicalizer used for owner event ids. They differ on undefined-valued
keys: digest.ts emits "key":null; dev-signer drops the key. Demonstrated:
{"action":"publish","site":"happy-place","reason":undefined,"seq":3} digests to
29ee1b6b... under digest.ts and 4e507a15... under dev-signer. A control payload
without undefined keys digests identically under both, proving the divergence
is exactly the undefined rule.

Consequence: one logical record carries two valid "canonical" digests. The
one-authority claim is FALSE, and digest-keyed identity spanning owner-event
ids (dev-signer) and packet/proposal digests (digest.ts) is unsound: the same
record can hold two identities, splitting idempotent dedupe.

Falsifier: a single canonicalizer on every digest path, or normalization of
undefined-valued keys before hashing on all paths.

## 5. Mission Control fabricated reconciliation: FAIL (code-grounded)

From B7 (consumed) plus my own read of the projector in mc-dispatch.ts
(worktree copy, lines 122-129, 150-161, 187-189):

- The projector defaults any mission without reconciliation_state to
  'RECONCILIATION IN PROGRESS' at lines 187-189.
- The UI hardcodes 'OUTCOME UNKNOWN - RECONCILIATION IN PROGRESS'.
- No reconciler exists anywhere in the dispatch slice (B4 confirmed; B7
  confirmed; my read found no reconciliation writer).

The phrase fabricates activity: it presents an in-progress reconciliation that
no code performs. A focused repro against B4's real scratch projector
(emit MC_RUN_UNKNOWN without reconciliation_state, project, observe the
manufactured state) is queued for the next session.

Falsifier: a reconciler implementation that reads reconciliation_state and
advances it, or removal of the default.

## 6. ContextPack residuals: three repros executed (from summary)

Repros: `~/workspace/ping-24h/repro/b9-ctxpack/` (real compiler, graph,
digest modules; verbatim branch catch logic; documented test-reader seam).

- Error-detail leak: a synthetic reader ENOENT exposes
  /var/lib/ping/journal/overlays/happy-place.jsonl in the HTTP response and
  MC_RUN_FAILED payload; a long failure leaks an internal URL despite
  300-char truncation (output was 326 chars: route prefix + exactly 300 raw
  exception chars). Falsifier: typed public error codes before emission.
- Retraction TOCTOU: packet P1 (pre-retraction) keeps the retracted claim
  while P2 drops it; digests differ. Bounded: the route sends only `prompt`
  to the executor and the envelope carries only context_pack_id, so impact
  is stale audit evidence, not stale claim execution. Falsifier: revalidation
  at execution/completion, or no pre-completion publication.
- Question steering: the raw dispatch prompt is echoed into packet.question
  and steers which public claims are included; owner-private data never
  appeared; viewer stayed visitor. Narrative framing, not an exfiltration
  oracle. Falsifier: fixed relevance question, or question-independent
  composition.

Provenance caveat (standing): harness modules were copied from the Pig
worktree at HEAD 0264d517, not yet proven byte-identical to the ContextPack
branch (decision-fabric/contextpack-wire-2026-09-28 @ 9a555021) versions.
SHA-256 comparison against 9a555021 is queued; if different, replace from
git archive and rerun.

## 7. Wave B consumption status

- B7 (Mission Control): consumed. Fabricated reconciliation + HTTP-200 health
  false positive confirmed at code level; focused projector repro queued.
- B4 (recovery torture): consumed. New work built on it (journal forgery
  repro reuses its scratch lib); its prototypes (resume token, quiescence
  gate) are B4's own, not PING mechanisms, so there is nothing new to attack
  there beyond B4's tests.
- B1 (decision surface): consumed. Led to the approval attribution attack;
  digest substitution tested and holds.
- B5 (worker replaceability): consumed. D5 (stdout brace-scan divergence) and
  the adversarial Hermes envelope-override run are consumed as prior art; no
  new mechanism introduced for B9 to attack.
- B3 (reached path): consumed. Confirms no route-level idempotency at the
  branch commit (missionId embeds request timestamp; duplicate POSTs mint new
  missions) and that the dispatch packet records nothing about authority
  posture (capabilities: [] in, empty packet.capabilities out).
- B8 (portability): consumed. Led to the digest-confusion repro (dimension 5)
  and confirms the namespace-extension governance FAIL (dimension 6), which
  is the live jev incident's root shape (already held for Nolan's word).
- B6 (business intel): consumed. Survey only; no new attackable mechanism.
- B10 (falsifier): still in watch state; no content to attack yet.

## 8. Standing constraints honored

No production writes; gateway untouched operationally; the three JEV
scheduler missions untouched; no :3100 restart; no push; JEV namespace
registration untouched (still held for Nolan); UNKNOWN never collapsed
(the reaper byte gap was closed by observation, not inference); no em dashes
in authored prose; lane 13 findings consumed, not redone.

## Next

1. SHA-256 bind of b9-ctxpack modules against 9a555021; rerun on mismatch.
2. Mission Control fabricated-reconciliation repro via B4's scratch projector.
3. run.sh + README for all repro dirs.
4. Continue attacking new Wave B landings (B2, B10) as they arrive.
5. Final report at T+20 with per-claim falsifiers.
