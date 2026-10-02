# PING/FYD Business Connector Contract

**Version:** 1.0 (draft) | **Status:** design spec, implementable | **Scope:** every connector (provider-side) and every adapter (PING-side) in the business-connectors wave.

## 0. Standing rules (non-negotiable)

1. A connector **declares** capabilities; it **never grants itself any**. Capabilities are requested from the host/governor and are granted or denied there.
2. Observation / evidence / event / object / intent / capability / projection / memory are distinct layers. A connector produces **observations**; the adapter records **evidence**; the object model is derived downstream.
3. **Owner intent does not mutate historical evidence.** Corrections layer on top; history is immutable.
4. **Provider auth is not canonical identity.** Facebook auth, OAuth tokens, and API keys prove access to a provider account, never ownership of a business.
5. **Business-name matching does not prove control.** Name similarity is an INFERRED link at best.
6. Facts, visibility, and presentation are separate. A connector's job is facts only.
7. **UNKNOWN is preferable to manufactured certainty.** When in doubt, grade UNKNOWN.
8. Provider data is **hostile input** until sanitized and verified (see §3).

---

## 1. Connector declaration (mandatory)

Every connector ships a machine-readable declaration. A connector without a complete declaration is DISABLED and may not fetch.

### 1.1 CAPABILITIES (what it can do)

Enumerate each capability as: `verb + object + scope`. Verbs from a closed set: `read`, `search`, `subscribe`, `webhook-receive`, `write` (write requires separate elevated grant and is DENIED by default for all v1 connectors).

Example shape per capability: `{ capability: "read.reviews", provider_objects: ["review"], max_window: "90d", realtime: false }`.

### 1.2 AUTH REQUIREMENTS (what it needs, who grants it)

- `credential_type`: oauth2 / api-key / session-cookie / none(public).
- `granted_by`: one of `business-owner`, `platform-operator`, `public-no-auth`. Named party, never "the system".
- `scopes`: exact OAuth scopes or permission list requested. Least privilege; unused scopes are a defect.
- `consent_record`: where the grant is stored and how it is re-verified (token refresh path, re-consent trigger).
- Rule: a credential granted by `business-owner` authorizes reads **about that owner's business only**; it never authorizes reads about other businesses and never confers business identity (§2.6).

### 1.3 RATE BUDGET

- `calls_per_window`: hard number, e.g. `200/hour`, `10000/day` per provider account or per API key.
- `burst`: max calls per minute.
- `backoff_policy`: on 429 / 5xx: exponential backoff with jitter, base delay, max delay, max attempts (bounded; never infinite).
- `retryable_statuses`: explicit list. 4xx (except 408/429) are non-retryable.
- The connector enforces its own budget first; the governor enforces globally (§6). Both must hold.

### 1.4 DATA SHAPE (typed schema of raw provider payload)

- Full typed schema of every field the connector reads: field name, type, optionality, max length, provider documentation link.
- `lossy_fields`: fields the provider truncates, paginates, or redacts (mark them; never silently pad).
- Raw payloads are stored verbatim (bytes + content hash) before normalization so adapters can re-run.

### 1.5 FRESHNESS

- `poll_cadence`: how often the connector polls (e.g. `6h`, `24h`). Webhook-capable connectors state `realtime: true` plus fallback poll cadence.
- `staleness_tolerance`: max acceptable age per data type (reviews: 24h; hours-of-operation: 7d; menus: 30d). Past tolerance, the adapter marks the value STALE but keeps it.
- `revalidation_triggers`: events that force a fresh fetch (owner correction filed, conflicting evidence from another provider, webhook signal, manual request). Triggers are requests to the governor, not self-authorized fetches.

### 1.6 FAILURE MODES (enumerated)

Each connector must name its behavior for: `provider-down`, `rate-limited`, `malformed-response`, `auth-expired`, `partial-success`, `tos-change`. For each: detection signal, connector action, emitted state (§5), and whether already-ingested evidence is affected (never: evidence is immutable, §4).

### 1.7 COST

- `cost_per_call`: in USD or quota units. Zero-cost connectors state `0` explicitly.
- `quota_cost`: which provider quota the call consumes (some providers bill different endpoints differently).
- `monthly_budget_cap`: hard stop; the governor halts the connector at the cap (§6).

---

## 2. Adapter normalization

The adapter maps raw provider payloads into PING's typed object model. **Every normalized field** carries a provenance envelope:

```
provenance: {
  provider:        "<provider id>",     // e.g. "google-business-profile"
  source_record_id: "<provider's id for this record>",
  fetched_at:      "<ISO-8601>",
  fetch_attempt_id: "<uuid of the fetch>",
  connector_version: "<semver>"
}
confidence: DIRECT | DERIVED | INFERRED | OWNER_ASSERTED | CONFLICTING | UNKNOWN
```

### 2.1 Confidence grade assignment

- **DIRECT**: the provider asserts this fact about the business itself (e.g. GBP "business hours" as listed by the verified owner in GBP). Provider-asserted, not independently verified.
- **DERIVED**: computed from direct data by deterministic rule (e.g. "open now" from hours + clock). Record the rule id.
- **INFERRED**: heuristic or model-based (e.g. cuisine type inferred from menu text, name-match linking). Record the method.
- **OWNER_ASSERTED**: stated by the business owner through PING (correction, onboarding answer). Never downgraded by provider data; conflicts are marked, not resolved silently.
- **CONFLICTING**: two or more sources disagree and no resolution rule fired. Both values are kept.
- **UNKNOWN**: no usable data. Always explicit, never null-by-accident.

### 2.2 Conflicting values across providers

Keep **both** (all) values, each with its own provenance and confidence. Mark the field CONFLICTING. Never silently merge, average, or pick "the newer one". Resolution happens only via: (a) owner assertion (layers on top, §2.4), or (b) an explicit, logged resolution rule with a recorded rationale. Unresolved conflicts surface in projections as "sources disagree", never as a single confident value.

### 2.3 Missing data

Missing is **UNKNOWN**, never fabricated, never defaulted, never interpolated from "similar businesses". The adapter records `field: UNKNOWN, reason: "provider returned no value" | "field not in schema" | "fetch failed"`. Downstream projections must render UNKNOWN as absent/unknown, not as zero or empty.

### 2.4 Owner corrections

An owner correction is a **new observation** with confidence OWNER_ASSERTED, layered over existing evidence. It does not edit, delete, or overwrite prior evidence. The object model keeps the full stack: provider said X at T1 (DIRECT, provider P), owner says Y at T2 (OWNER_ASSERTED). Projections prefer OWNER_ASSERTED for display; evidence queries return the whole stack. If provider data later contradicts the owner, the field becomes CONFLICTING with the owner value still displayed-first.

### 2.5 Identity: provider ids are NOT canonical identity

- Each provider's business id (GBP place id, Facebook page id, Yelp biz id) is stored as a **link record**: `{ ping_business_id, provider, provider_business_id, link_confidence, link_method, linked_at }`.
- `link_confidence` uses the same grade set. Name/address/phone matching yields at most INFERRED. Owner-confirmed linking yields OWNER_ASSERTED. A Facebook page id obtained via Facebook auth proves control of a Facebook page, not identity of the business; linking it to a PING business object is a separate, graded step.
- Canonical identity is the PING business object id, assigned at object creation, stable across provider churn. If a provider id changes or a listing is deleted, the link record is marked stale; the business object survives.
- Two provider ids never merge two PING business objects without OWNER_ASSERTED confirmation or operator review. Duplicate candidates are flagged, not auto-merged.

### 2.6 Visibility separation

The adapter records facts only. Whether a fact is shown to the public, to the owner, or to nobody is a **visibility** decision owned by a different layer, never by the connector or adapter. Adapters must not filter fields for "sensitivity"; they grade and pass through.

---

## 3. Hostile input rules

All provider payloads are untrusted until they pass these gates. Sanitization happens **before** normalization, and failures are recorded as evidence (a failed-sanitization observation), not silently dropped.

| Data type | Rule |
|---|---|
| Text fields (names, descriptions, reviews) | Strip all HTML/JS; allow plain text only. Reject or escape `javascript:`, event handlers, `<script>`, `<iframe>`. Unicode-normalize; reject mixed-script spoofing on business names (flag for review). |
| Reviews | Treat as untrusted third-party claims: confidence at most INFERRED for factual content; never let one review override DIRECT provider facts. Rate reviews per-author; flag review-bomb patterns (volume spike + new accounts) as evidence, not truth. |
| Listings / claimed profiles | A "claimed" badge from a provider is provider-asserted only (DIRECT that the provider shows the badge; INFERRED that the claim is legitimate). Spoofed listings are expected; cross-check name+address+phone before linking (§2.5). |
| URLs / links | Follow max **3** redirects, same-registrable-domain preferred; reject redirect chains ending at a different domain than the listing claims without flagging. Fetch with timeout 10s. Never fetch `file://`, localhost, or private IPs (SSRF guard). |
| OAuth flows | Verify `state` parameter, exact redirect URI match, issuer, audience, and token signature. Never accept tokens via URL fragment forwarding or copy-paste as equivalent to a completed flow. Phishing-shaped consent screens (lookalike domains) fail closed. |
| Payload size | Hard caps: single record **256 KB**, single fetch response **5 MB**, text field **10 KB** (truncate with `truncated: true` marker, never silent). Oversized payloads are rejected with a recorded observation, not partially ingested. |
| Binary / media | Never execute; store by content hash; serve through the controlled media pipeline only. Reject mismatched content-type/extension. |

Verification requirement: any field that will be **displayed publicly** or used in **outreach copy** must be DIRECT or OWNER_ASSERTED, or carry an explicit "unverified" marker in the projection. INFERRED data never ships to the public unlabeled.

---

## 4. Lifecycle

States: `DISABLED` → `AUTHORIZED` → `DEGRADED` → `SUSPENDED` → `REVOKED`. Plus terminal `RETIRED`.

Allowed transitions:

- `DISABLED → AUTHORIZED`: declaration complete and valid, auth granted and verified, governor admits it.
- `AUTHORIZED → DEGRADED`: provider errors or rate-limit hits exceed threshold; connector keeps serving cached evidence, stops new fetches until healthy.
- `DEGRADED → AUTHORIZED`: sustained healthy window (per declaration, default 24h clean).
- `AUTHORIZED → SUSPENDED`: auth expired, ToS change unacknowledged, operator hold, or safety tripwire. No fetches; cached evidence remains readable.
- `SUSPENDED → AUTHORIZED`: auth renewed / ToS acknowledged / hold released.
- `AUTHORIZED|DEGRADED|SUSPENDED → REVOKED`: owner or operator revokes consent. **All fetching stops immediately; credentials are destroyed.**
- `REVOKED → DISABLED`: connector may be re-declared and re-authorized from scratch; history does not auto-restore.
- Any state → `RETIRED`: provider shut down or connector decommissioned. Terminal.

**Evidence on revocation: evidence is not erased.** Already-ingested evidence remains in the evidence plane, marked `source_revoked_at`. Projections stop using revoked-source data for *new* public display after revocation (visibility layer decision), but historical evidence stays queryable for audit, dispute, and owner review. Deleting history would destroy the audit trail; revocation stops the future, not the past. Owner data-deletion requests are handled by the privacy layer, not by the connector lifecycle.

---

## 5. Failure contract

Every fetch attempt reports exactly one terminal state, recorded with `fetch_attempt_id`:

- `NOT_STARTED`: governor never dispatched it (deferred, budget exhausted, connector not AUTHORIZED). Not an error; eligible for later dispatch.
- `STARTED`: fetch in flight. Stale `STARTED` older than 2× timeout is reaped as `OUTCOME_UNKNOWN`.
- `SUCCEEDED`: provider returned a schema-valid response. Partial payloads are SUCCEEDED with `partial: true` + missing-field list, never silently complete.
- `FAILED`: terminal failure with typed reason (`provider-down`, `rate-limited`, `malformed-response`, `auth-expired`, `tos-change`, `sanitization-rejected`, `oversized`). FAILED is recorded as evidence; the connector follows its declared failure-mode behavior (§1.6).
- `OUTCOME_UNKNOWN`: the request was sent but no definitive response arrived (timeout, connection reset, ambiguous 5xx). **This is the important one.**

### OUTCOME_UNKNOWN → reconciliation, not retry storms

- Never blind-retry an OUTCOME_UNKNOWN fetch: the write may have landed provider-side (duplicate reviews, double charges, double webhook registrations).
- Reconciliation path: (1) idempotency keys on every mutating call; (2) read-back check — query provider state and compare against intended outcome; (3) only if read-back is impossible, mark the field UNKNOWN with reason `outcome-unknown` and schedule **one** bounded reconciliation pass per 24h, jittered.
- Retry budget: max 3 attempts per fetch across all states, then the attempt is closed as FAILED or OUTCOME_UNKNOWN and the connector reports up. Retry storms are a defect; the governor kills connectors that exceed their declared backoff policy.

---

## 6. Rate/cost governor

One governor bounds all connectors. N connectors × M businesses must never exceed provider quotas or the monthly budget.

### 6.1 Mechanism

- **Token buckets per (provider, credential):** capacity = declared `calls_per_window`; refill on the provider's window. No borrowing across providers.
- **Global cost ledger:** every call decrements USD/quota budget; hard stop at `monthly_budget_cap`. When the cap hits, all non-critical fetches become NOT_STARTED until next cycle. No debt, no overdraft.
- **Admission:** a connector fetches only when: state is AUTHORIZED (or DEGRADED for cache-refresh of critical fields), bucket has tokens, cost ledger has room, and the governor dispatched it.

### 6.2 Under contention

When demand exceeds tokens/budget, the governor applies, in order:

1. **Priority tiers:** `owner-requested` > `freshness-triggered` (staleness breach) > `reconciliation` > `routine-poll` > `backfill`. Lower tiers defer first.
2. **Fairness across businesses:** round-robin within a tier; no single business starves others. Per-business per-connector daily ceiling.
3. **Deferral, not queue buildup:** deferred fetches return NOT_STARTED with `next_eligible_at`. Queues are bounded (default 1000); overflow drops lowest-tier items first and records the drop.
4. **Degradation signal:** sustained contention (>1h) emits a governor health event so operators can raise budgets or cut connectors. The governor never silently slows the system.
5. **Kill switch:** any connector exceeding its declared rate budget 3× in an hour is SUSPENDED automatically pending review. Safety tripwires outrank throughput.

### 6.3 What the governor does NOT do

It does not interpret payloads, resolve conflicts, grant capabilities, or touch evidence. It bounds. Interpretation belongs to adapters; authority belongs to the host/operator.
