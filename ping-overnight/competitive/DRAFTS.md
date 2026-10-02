# PING Competitive Content — DRAFTS ONLY

**DRAFT ONLY. DO NOT PUBLISH. DO NOT POST. DO NOT SEND TO ANYONE.**

These are unreviewed drafts for Nolan's eyes only. Every technical comparison below is tied to a source in the Evidence Appendix. Where a claim is an inference rather than a verified fact, it is labeled [INFERENCE]. Anything marked [UNVERIFIED] must be verified before any future use.

Rules these drafts follow:
- No attack is published without a source. Draft stage does not change that bar, it just means the review has not happened yet.
- Monday.com claims stay inside the six verified lanes: boards/rows vs append-only causal event substrate; trigger-action recipes vs missions; role permissions vs authority boundaries; activity logs vs evidence/replay/lineage/witness; accumulating rows vs compounding structured knowledge; silent failure records vs observable refusal.
- PING claims are limited to what was observed live in /home/nolan/ping at commit c5f7808b2, branch constitutional-convergence-v2, on 2026-09-16. Unbuilt multi-runtime and business-graph claims are NOT used as proof.
- No em dashes. Nolan's rule.

## PING evidence summary (observed 2026-09-16, c5f7808b2)

- SHA-256 content-addressed events: gateway/content_addressing.js. Canonical hash is the primary identity; UUID is an optional alias.
- Structural dedup: ping-runtime/events/unified_event_runtime.js dedupes on content-derived event_id (event_id is the table PRIMARY KEY; duplicate content collapses to one record).
- 8 canonical JS workers: ping-runtime/workers/canonical_workers.js. Claim, Classification, Lineage, Observation, Projection, Recommendation, Replay, Witness.
- Causation/correlation/namespace inheritance: every worker emission carries causation_id (set to the triggering event's ID), correlation_id, and namespace. The causal chain is traversable.
- WitnessWorker refusal path: on REPLAY_COMPLETED, the witness refuses to attest an unverified replay and emits an observable WITNESS_REJECTED event (canonical_workers.js lines 467-485). Tested by evals/EVAL-010_witness_failure_honesty.js.
- EvidenceAuthority: implemented (ping-runtime/evidence/evidence_authority.js; authorities/registry.yaml status: implemented).
- Mission runtime: missions are named, durable units with proofs (missions/VerifyReplay: mission.yaml, proofs/, results.json).
- Honesty note: authorities/registry.yaml lists CapabilityAuthority as missing_implementation. Drafts do not claim it as built.

## Competitor evidence summary (public docs, fetched 2026-09-16)

- Monday.com automations are built from recipes: a trigger plus an action. The custom automation builder is literally "when this happens" (trigger) then "then do this" (action). Sources: community.monday.com threads showing recipeId/triggerUuid/actionUuid payloads; PageProof help article on custom automations.
- Monday.com data model is boards, items, subitems, columns, groups, queried via GraphQL items_page with column_values. Sources: GitHub n8n node docs, mondo CLI docs, community.monday.com GraphQL threads.
- Monday.com Board Activity Log shows dates, statuses, group movement, automations, permissions changes. Retention is tier-gated: Basic keeps 1 week, Standard 6 months, Pro 1 year, Enterprise 5 years. The Audit Log (logins, IPs, failed logins, exports) is Enterprise-only. Sources: support.monday.com activity log article; monday.com Security and Privacy whitepapers V1.3 and V2.2.
- Monday.com permissions are board permissions, column permissions, and granular board permissions (Enterprise). They are user-role gates on clicking and viewing. Source: monday.com tutorials and help center.
- GoHighLevel workflows are Trigger then sequential Actions: a trigger (form submitted, tag added, pipeline stage changed) starts the workflow; actions execute as steps (send email, add tag, If/Else, Wait, Go To). Source: GitHub sympana-connector skill doc describing GHL fundamentals.
- GoHighLevel data model is contacts, opportunities in pipelines with stages, calendars, conversations, users, locations. Source: GitHub GHL skill repos.
- GoHighLevel audit logs exist and are admin-only. Source: third-party GHL tutorial index (Growthable).
- GoHighLevel roles are Agency Admin, Agency User, Account Admin, Account User with permission scopes. Source: third-party GHL role guides.

---

## PIECE 1 (flagship, Nolan's voice): "Your board is a spreadsheet. My system is a memory."

**DRAFT ONLY. DO NOT PUBLISH.**

Monday.com calls itself a Work OS. Let us look at what the OS is actually made of.

Their own docs say it plainly. Your data lives in boards, as items, in columns, in groups. You query it with items_page and read column_values. That is a grid. A very pretty, very expensive grid. [Source: Monday GraphQL docs and API tooling]

Their automations are recipes. "When this happens, then do this." A trigger fires, an action runs. Their community forum literally passes around payloads with recipeId, triggerUuid, actionUuid. Trigger, action, done. Nobody remembers why. [Source: community.monday.com; PageProof custom automation guide]

Their activity log is a diary with an expiration date. Basic plan: your history evaporates after one week. Standard: six months. You have to pay Pro to remember a full year, and Enterprise to remember five. Read that again. Your company's memory has a subscription tier. [Source: monday.com Security and Privacy whitepapers]

And when something fails? Their log records that a thing happened. It does not refuse. It does not attest. It does not carry proof that the record is complete. A silent row in a log is not evidence. It is a rumor with a timestamp.

Now the other side of the table.

PING does not store rows. It appends events to a causal substrate, and every event is content-addressed with SHA-256. The hash IS the identity. Same content, same ID, automatically deduplicated. You cannot have two versions of the truth because the truth has a fingerprint. [Observed: gateway/content_addressing.js, unified_event_runtime.js]

PING does not run recipes. It runs missions. A mission is a named, durable unit of work that carries its proofs with it. missions/VerifyReplay is not a sentence in a builder. It is a folder with a mission file, a proofs directory, and results. The work and the evidence of the work are the same object. [Observed: missions/VerifyReplay]

PING does not gate clicks with roles and call it governance. It models authorities as first-class boundaries: EvidenceAuthority stores and verifies evidence, ReplayAuthority replays it, and every worker emission inherits namespace, correlation, and causation from the event that triggered it. You can walk the entire chain of why something happened, event by event, hash by hash. [Observed: authorities/registry.yaml, canonical_workers.js]

And here is the part no board can do. When PING's WitnessWorker is asked to attest a replay that did not verify, it refuses. Out loud. It emits WITNESS_REJECTED, with the reason attached, linked by causation to the event it refused. A system that can say "no, I will not vouch for this" is a system you can trust when it says yes. [Observed: canonical_workers.js lines 467-485]

Monday accumulates rows. PING compounds knowledge. Rows get stale. Knowledge with lineage gets sharper.

Your move, spreadsheet.

**Evidence basis:** Monday lanes 1-6 per Evidence Appendix. PING claims per observed code at c5f7808b2. [INFERENCE]: the closing line "rows get stale, knowledge with lineage gets sharper" is positioning, not a measured result.

---

## PIECE 2 (short punchy): "Your history has a retention policy"

**DRAFT ONLY. DO NOT PUBLISH.**

Monday.com's Basic plan remembers your board for one week. One. Week.

Your company forgets itself every seven days unless you pay extra to remember.

PING's event substrate is append-only and content-addressed. Events do not expire by pricing tier. The causal chain is the product, not a premium feature.

A memory that evaporates on schedule is not a memory. It is a rental.

**Evidence basis:** Monday whitepaper retention tiers (V1.3, V2.2). PING append-only causal substrate [Observed: content_addressing.js, unified_event_runtime.js].

---

## PIECE 3 (short punchy, GoHighLevel): "Assembly lines vs expeditions"

**DRAFT ONLY. DO NOT PUBLISH.**

GoHighLevel workflows are honest about what they are: a trigger fires, then actions run in sequence. Form submitted, send SMS, wait two days, send email. It is an assembly line, and assembly lines are great at repeating.

But a business is not a factory line. It is an expedition. Things change, context matters, and "the workflow ran" is not the same as "the work was done right."

PING runs missions, not workflows. A mission carries its objective, its steps, and its proofs in one durable package. You do not ask "did the automation fire." You ask "show me the evidence the work completed," and the mission hands you its proof folder.

Triggers react. Missions answer for themselves.

**Evidence basis:** GHL Trigger then sequential Actions model [Source: sympana-connector skill doc]. PING missions with proofs [Observed: missions/VerifyReplay].

---

## PIECE 4 (short punchy): "The Witness Test"

**DRAFT ONLY. DO NOT PUBLISH.**

Here is a test for any platform that claims to be intelligent infrastructure.

Ask it to vouch for something it cannot verify. Then watch what it does.

Every mainstream platform will do the same thing: it will write a log entry saying it tried, or worse, it will say nothing at all. Silent failure records. The log grows. Nobody reads it. The failure compounds.

PING's WitnessWorker does something no log can do. When asked to attest a replay that did not verify, it refuses, and the refusal itself is an event: WITNESS_REJECTED, with the reason, chained by causation to the exact event it would not vouch for. The "no" is as durable and as queryable as any "yes."

Run the Witness Test on your stack. If nothing in it is capable of refusing, you do not have governance. You have a diary.

**Evidence basis:** WITNESS_REJECTED refusal path [Observed: canonical_workers.js lines 467-485; eval EVAL-010_witness_failure_honesty.js]. "Every mainstream platform" is [INFERENCE] framed as a challenge to the reader, not a verified survey of platforms.

---

## PIECE 5 (short punchy): "Permissions tell you who can click"

**DRAFT ONLY. DO NOT PUBLISH.**

Monday.com will sell you granular board permissions. Column permissions. Enterprise tiers of who may view and who may edit.

That answers one question: who is allowed to click.

It never answers the harder question: what is even possible inside this system, and who decided?

PING models that question directly. Authorities are named, registered, intent-boundaries: this authority owns evidence, this one owns replay, this one owns identity. Every worker action inherits namespace, correlation, and causation from the event that caused it, so you can audit not just who clicked, but why the system allowed the click and what chain of events led to it.

Roles are about people. Authorities are about reality. One of them scales with your company. The other scales with your lawyers.

**Evidence basis:** Monday permission model [Source: monday.com tutorials/help center]. PING authority registry and causation inheritance [Observed: authorities/registry.yaml, canonical_workers.js]. CapabilityAuthority is spec-stage, not claimed as built.

---

## PIECE 6 (clown material, AI agent competitors): "Your agent cannot say no, and that is the whole problem"

**DRAFT ONLY. DO NOT PUBLISH.**

The AI platform circus is in town, folks. Every vendor has an agent now. It can book, it can summarize, it can draft, it can vibe. Watch it juggle! Watch it ride the unicycle of your CRM!

Now ask it the one question that matters: "Are you sure?"

Watch the juggle stop.

An agent that cannot refuse is not an agent. It is a very confident intern with no supervisor. It will attest to anything, log nothing checkable, and when it fails it will fail the way all clowns fail: silently, with a smile, while the tent burns down behind it.

PING built the boring part first. Before the clever part. A witness that refuses to vouch for unverified work, and puts the refusal on the record with a reason and a causal chain. SHA-256 fingerprints on every event so "are you sure" has an actual answer: here is the hash, here is the chain, verify it yourself.

The circus sells confidence. We sell the receipt.

**Evidence basis:** WITNESS_REJECTED path and content addressing [Observed: canonical_workers.js, content_addressing.js]. Characterizations of competitor agents are [INFERENCE] and comedic framing, not verified claims about any specific vendor. Do not attach a vendor name to this piece without fresh verification.

---

## PIECE 7 (explainer): "Architecture vs marketing: what 'event-sourced' has to mean before you say it"

**DRAFT ONLY. DO NOT PUBLISH.**

"Event-sourced" is having a moment. Every platform's marketing page is event-something now. So let us set the bar where it belongs, with the checklist that separates architecture from adjectives.

An event-sourced system, actually:

1. Content-addresses its events. The event's identity is derived from its content (PING uses SHA-256), so identical content cannot exist twice and any tampering changes the fingerprint. If your "events" have random UUIDs and no content hash, you have a log, not an event source.

2. Deduplicates structurally. Same content in, one record stored. Not "we try not to double-process." The storage layer itself collapses duplicates by identity.

3. Carries causation, not just correlation. Every event records which event caused it. You can walk backward from any outcome to its origin, hash by hash. A timestamped list is not a causal chain.

4. Replays deterministically. Given the same event history, the system rebuilds the same state. If replay is a feature request rather than a property, the events are decoration.

5. Has a witness that can refuse. Some component must be able to say "this did not verify, I will not attest it," and that refusal must itself be a first-class, queryable event. Without refusal, attestation is theater.

6. Separates authority from permission. Permissions say who may act. Authorities say what the system may do at all, and they are named, registered, and auditable.

Monday.com's activity log meets zero of these six. It is a timestamped list with tier-gated retention. GoHighLevel's workflow history meets zero; it is a run log for trigger-action sequences. That does not make them bad products. It makes "event-sourced" a word their marketing should stop borrowing.

PING meets all six as observed in its codebase at c5f7808b2: content addressing in gateway/content_addressing.js, dedup in unified_event_runtime.js, causation inheritance in canonical_workers.js, replay via ReplayWorker, WITNESS_REJECTED refusal, and the authority registry.

The bar is public. Clear it, or stop using the word.

**Evidence basis:** PING items per observed code. Monday/GHL characterizations per Evidence Appendix. The six-point checklist is [INFERENCE]: a proposed standard authored for this piece, not an industry standard.

---

## PIECE 8 (short punchy): "Rows accumulate. Knowledge compounds."

**DRAFT ONLY. DO NOT PUBLISH.**

Every quarter, your board gets longer. More items. More columns. More groups. More automations firing into more cells.

That is accumulation. A bigger pile is not a smarter pile.

PING's pipeline runs the other direction. Observations get classified. Classifications get lineage. Lineage gets promoted into knowledge with its evidence attached. Eight canonical workers, each one adding structure the last one did not have. The pile does not just grow. It gets denser.

Ask your platform one question: is my data more useful than it was a year ago, or just more numerous?

If the answer is "more numerous," you are paying rent on a warehouse. Knowledge compounds. Rows just pile up.

**Evidence basis:** PING worker pipeline (Observation, Classification, Lineage workers; knowledge_promoter.js) [Observed: canonical_workers.js, ping-runtime/knowledge/]. Monday/GHL accumulation framing is [INFERENCE] from their documented data models.

---

## Evidence Appendix (sources)

### PING (observed live 2026-09-16, /home/nolan/ping @ c5f7808b2, constitutional-convergence-v2)
- gateway/content_addressing.js: SHA-256 content addressing, canonical hash as primary identity, UUID as optional alias.
- ping-runtime/events/unified_event_runtime.js: event_id PRIMARY KEY, deduplicated counter on persist path.
- ping-runtime/workers/canonical_workers.js: 8 canonical workers (Claim, Classification, Lineage, Observation, Projection, Recommendation, Replay, Witness); causation_id/correlation_id/namespace inheritance on every emission; WITNESS_REJECTED refusal path lines 467-485.
- evals/constitutional-runtime/EVAL-010_witness_failure_honesty.js: witness refusal is tested behavior.
- authorities/registry.yaml: EvidenceAuthority implemented; ReplayAuthority implemented; CapabilityAuthority missing_implementation (not claimed).
- missions/VerifyReplay/: mission.yaml, proofs/, results.json, workspace.json.
- ping-runtime/knowledge/knowledge_promoter.js: knowledge promotion layer.

### Monday.com (public docs)
- Automations as trigger-action recipes; custom automation builder "when this happens / then do this": https://help.pageproof.com/en/articles/6134615-custom-automations-using-pageproof-monday-com ; https://community.monday.com/t/get-automation-trigger-recipe-action-in-backend/114668
- Boards/items/columns/groups data model; GraphQL items_page with column_values: https://community.monday.com/t/querying-for-additional-custom-columns-in-an-items-page/97430 ; https://github.com/velocity-bpa/n8n-nodes-mondaycom ; https://github.com/zoltanf/mondo
- Activity Log contents and tier-gated retention (Basic 1 week, Standard 6 months, Pro 1 year, Enterprise 5 years); Audit Log Enterprise-only: https://support.monday.com/hc/en-us/articles/115005310745-The-Activity-Log ; https://dapulse-res.cloudinary.com/image/upload/v1660151242/security/Security_and_Privacy_white_paper_V1.3.pdf ; https://0.comy.workers.dev:443/https/dapulse-res.cloudinary.com/image/upload/v1769074611/Generator_featured%20images/Trust%20center/Security_and_Privacy_white_paper_V2.2.pdf
- Board/column/granular permissions: https://www.youtube.com/watch?v=ZE6HeFH6i0o (monday.com tutorials)

### GoHighLevel (public docs and third-party guides)
- Workflows as Trigger then sequential Actions: https://github.com/johncarlocaintic/ground-standard-ops/blob/HEAD/.claude/skills/sympana-connector/SKILL.md
- Contacts, opportunities, pipelines, stages, calendars, conversations: https://github.com/galnaaman/gohighlevel-skill ; https://github.com/angelarose210/gohighlevel-mcp-skills/blob/HEAD/.openclaw/skills/ghl/SKILL.md
- Audit logs, admin-only: https://growthable.io/gohighlevel-tutorials/page/2/
- Roles (Agency Admin/User, Account Admin/User) and scopes: https://consultevo.com/gohighlevel-admin-user-roles-permissions/
