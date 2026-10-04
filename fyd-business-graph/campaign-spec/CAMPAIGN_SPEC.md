# CampaignSpec: the campaign compiler

Binding: `~/workspace/directives/2026-10-04-backend-assault-narrowed.md` sections 7, 8, 12, 13, 18, 19, 23.
Spec: `campaign-spec.schema.json` (JSON Schema; exactly 9 top-level fields; `additionalProperties: false` everywhere).

CampaignSpec is the marketing analogue of SiteSpec: a typed, channel-free intermediate
representation. AI converts "Get me more commercial HVAC customers around Grand Junction"
into a typed proposal; software executes the proposal. The pipeline stops at APPROVAL.
Execution is a later phase and is never implied by a proposal.

## The pipeline

```
PLAIN ENGLISH -> INTENT -> CampaignSpec -> VALIDATION -> AUDIENCE QUERY ->
ACTION PLAN -> CAPABILITY CHECK -> PREVIEW -> APPROVAL -> (stops)
```

### PLAIN ENGLISH -> INTENT (intelligence)
The owner speaks or types. An LLM extracts a structured intent (goal, subject,
constraints) from plain language. Output is not prose: it is the first typed form.

### INTENT -> CampaignSpec (intelligence)
An LLM drafts a CampaignSpec from the intent PLUS business-graph evidence. Every
field must be filled or explicitly marked: `offer_refs` resolve to real
BusinessGraph node ids (no invented ids); `audience_query` is structured, never
prose; `channels` are enum values; `creative_refs` point at Creative nodes or
`new:<concept-slug>` drafts. The LLM may cite evidence; it may not invent it.

### VALIDATION (software)
Deterministic. Must be code, never the LLM:
1. JSON Schema validation against `campaign-spec.schema.json`.
2. Semantic rules (checked in `campaign-spec-validate.py` or its successor):
   - every `offer_refs` id resolves to a Service or Offer node in the target BusinessGraph;
   - every `creative_refs` id resolves to a Creative node, or matches `new:<concept-slug>`;
   - `time_window.end > time_window.start`;
   - `budget.amount_usd == 0` implies no channel may require spend (else reject);
   - `success_metric.window` is a bounded window, never open-ended.
A failed rule returns a typed rejection with the rule name; the LLM may revise and
re-submit. Rejection is not a conversation.

### AUDIENCE QUERY (software)
The structured `audience_query` is executed as a query against the business
graph and audience stores. LLM may propose query parameters; only code runs them.
Deduplication, suppression lists, and exclusion rules execute here, in code.

### ACTION PLAN (software)
A deterministic plan compiler turns (CampaignSpec, channel set) into an ordered
action list. Each action is `{kind, target, spend_usd, audience_size, reversible,
external}`. No LLM. The plan is the input to the authority gate.

### CAPABILITY CHECK (software)
Per channel, the compiler looks the operation up in the capability matrix
(`meta-archaeology/capability-matrix.md` and its successors): SUPPORTED NOW /
BLOCKED / UNKNOWN. UNKNOWN means do not promise; BLOCKED means drop the channel
from the plan and say so in the preview. The proposal must never claim a
capability the matrix does not grant (e.g. conversion tracking with no pixel,
organic IG publish with no IG business account, lead ads with
`leadgen_tos_accepted: false`).

### PREVIEW (software)
A rendered owner-facing artifact from (spec, evidence, plan, capability results):
WHY / AUDIENCE / CHANNEL / MESSAGE direction / EXPECTED ACTION / EVIDENCE with
graph node/edge citations and capability-matrix marks per channel. Message is a
direction (angle, claims with evidence refs), never final copy.

### APPROVAL (human + software)
The owner approves or denies. The compiler runs every planned action through
`authority-ux/authority_tiers.py` `classify()` and records the tier and required
check. Rules from the tiers file:
- any `spend_usd > 0` is at minimum HIGH (explicit authorization);
- spend >= 500, audience >= 10000, or external+irreversible is VERY HIGH
  (explicit bounded approval: scope + limit + expiry);
- unknown action kinds fail closed.
`approval_policy.min_tier` in the spec must be >= the highest tier of any planned
action. After approval the compiler STOPS. Execution is a later phase.

## The deterministic-marketing rule (directive section 12)

Stages marked intelligence MAY use an LLM. Stages marked software MUST be code.
The table:

| Question | Stage | Who |
|---|---|---|
| What did the owner mean? | INTENT | intelligence |
| Which segment and why? | INTENT -> CampaignSpec | intelligence |
| Draft the message direction | CampaignSpec | intelligence |
| Create N message variants | creative draft | intelligence |
| Analyze why conversion dropped | post-campaign learning | intelligence |
| Is the spec well-formed and grounded? | VALIDATION | software |
| Find customers who requested HVAC work but never booked | AUDIENCE QUERY | software |
| Deduplicate recipients / suppression / frequency caps | AUDIENCE QUERY | software |
| Calculate budget, pacing, action plan | ACTION PLAN | software |
| Is this channel operation supported now? | CAPABILITY CHECK | software |
| Classify consequence / required approval | APPROVAL (gate) | software |
| Send approved campaign | execution phase | software |

## No channel-specific brains (directive section 23)

There is no FacebookAgent, InstagramAgent, EmailAgent. The architecture is:

```
BUSINESS INTELLIGENCE -> ACTION PLAN -> CHANNEL ADAPTERS
```

Meta's objective enums (OUTCOME_LEADS, OUTCOME_SALES, ...) never enter PING core;
the Meta adapter maps `objective: acquire_leads` to OUTCOME_LEADS at compile
time, keeps bid strategies, targeting JSON, and account-scoped asset handles
private (see `object-model/meta-to-fyd-map.md` rows 4-7: canonical vs
adapter-private). Five channels must not create five competing brains.

## Harvest note (directive section 8)

Before defining, the workspace was searched for existing campaign concepts:
- CampaignSpec appears only as a proposal elsewhere: directive section 8
  (minimum fields), `object-model/meta-to-fyd-map.md` rows 4-7 (Campaign ->
  Campaign/CampaignSpec, EMERGING, "this row is a PROPOSAL until CampaignSpec
  lands"), `authority-ux/authority-ux.md` (draft CampaignSpec in tier examples;
  "The campaign compiler calls classify(action) for every planned action"),
  `business-graph/coppersmith-graph.json` (a `sample:` Campaign node completing
  the graph shape).
- `goals/ping-agent-execution-stack/files/CEO-ORDER-ECOSYSTEM-HARVEST-2026-09-30.md`
  places CampaignSpec at "LAYER 4 EXPERIENCE IR (SiteSpec / future FeedSpec /
  CampaignSpec)" -- the same experience-IR reading this spec adopts.
- No typed CampaignSpec schema existed anywhere; no duplicate was collapsed.
The `sample:` Campaign node in the graph shape is consistent with this spec's
edge map (Campaign `targets`->Audience, `uses`->Creative, `publishes_to`->Channel,
`promotes`->Offer, `produces`->{Engagement, Lead, Conversion}, `costs`->Spend).
