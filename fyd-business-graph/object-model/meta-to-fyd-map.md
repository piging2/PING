# Meta Object Model → FYD/PING Mapping

Binding: `~/workspace/directives/2026-10-04-backend-assault-narrowed.md` §6.
Posture: map, do not copy blindly. Meta-native fields are quarantined in the adapter.
PING core never learns Facebook ontology.

Research basis: Meta Graph API + Marketing API v26.0 reference docs (fetched 2026-10-04),
cross-checked against `developers.facebook.com` official references (Business updated Apr 5 2026,
Ad Set updated Sep 21 2026, Ad Creative updated Aug 6 2026) and corroborating community mirrors.
Field lists are grounded in those docs; see Sources at the bottom.

## Ownership legend

- OWNED: PING/FYD already owns this concept. Meta data normalizes into it.
- EMERGING: concept is being defined in `fyd-business-graph/` now; this row is a proposal.
- NEW: genuinely new concept for FYD (or adapter-only). Does not exist in the graph yet.
- ADAPTER-ONLY: no FYD counterpart by design; lives entirely behind the adapter.

## The mapping table

### 1. Meta Business → FYD Business — OWNED

Meta Business (`/{business-id}`): represents a specific business on Facebook.
Grounded fields: `id`, `name`, `created_time`, `updated_time`, `verification_status`
(enum: verified/pending/not_verified/...), `vertical`/`vertical_id`, `timezone_id`,
`primary_page` (Page), `profile_picture_uri`, `link`, `two_factor_type`,
`created_by`/`updated_by` (BusinessUser|SystemUser), `payment_account_id`.
Edges: `owned_pages`, `owned_instagram_accounts`, `instagram_business_accounts`,
`owned_pixels`/`adspixels`, `owned_apps`, `event_source_groups`, `owned_product_catalogs`,
`business_users`, `system_users`, `agencies`, `clients`, `owned_businesses`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| `name` → FYD Business identity. PING owns identity/ownership. | `id` (Meta business id) |
| `vertical` → industry classification on the Business object | `payment_account_id`, `two_factor_type` |
| `verification_status` → trust signal on the identity claim | `created_by`/`updated_by`, `block_offline_analytics` |
| `timezone_id` → operating context | `profile_picture_uri`, `link` (render hints, not identity) |
| `owned_*` edges → FYD relationships: Business `claims`→ExternalIdentity, `runs`→Campaign | all edge traversal, token scoping, user/role plumbing |

Notes: the Meta Business is the asset container, not a second business entity.
There is exactly one FYD Business; the Meta Business id becomes an ExternalIdentity claim on it.

### 2. Page → ExternalIdentity (+ Channel behavior in adapter) — OWNED concept

Page (`/{page-id}`): the business's public presence on Facebook.
Grounded fields: `id`, `name`, `category`/`category_list`, `about`, `description`,
`phone`, `email`, `website`, `location`, `hours`, `fan_count`, `followers_count`,
`picture`, `link`, `tasks` (ANALYZE/ADVERTISE/MODERATE/CREATE_CONTENT).
Edges: `feed`, `posts`, `leadgen_forms`, `insights`, `ratings`, `conversations`,
and the `instagram_business_account` field linking the IG account.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| handle + display name → ExternalIdentity(platform=facebook_page) — ExternalIdentity is already a PING graph concept (coppersmith graph: ExternalIdentity + links_to) | `id` (page id), page access token |
| `category`, `about`, `description` → business description evidence | `tasks`, `category_list` ids |
| `phone`, `email`, `website`, `location`, `hours` → Business contact/location facts | `picture` URLs (media refs stay adapter-side until media policy resolves) |
| `fan_count`/`followers_count` → Observation (audience size metric, timestamped) | subscribed_fields/webhook plumbing |
| published posts → Content objects via the Content/projection path, not raw | `feed`/`posts` pagination cursors |

Notes: publishing/scheduling (POST /{page-id}/feed) is Channel behavior and lives in the
adapter behind the campaign compiler's capability check. There is no PageAgent —
directive §23: BUSINESS INTELLIGENCE → ACTION PLAN → CHANNEL ADAPTERS.

### 3. Instagram account (IG User) → ExternalIdentity (+ Channel behavior in adapter) — OWNED concept

IG User (`/{ig-user-id}`, ShadowIGUser, v26.0): Instagram Business/Creator account.
Grounded fields: `id`, `username`, `name`, `biography`, `website`, `followers_count`,
`follows_count`, `media_count`, `profile_picture_url`, `ig_id`, `legacy_instagram_user_id`,
`shopping_review_status`, `is_published`, `has_profile_pic`.
Edges: `media`, `insights` (account metrics: reach, views, accounts_engaged, likes,
comments, shares, saves, replies, total_interactions, follows_and_unfollows,
profile_links_taps; demographics: follower_demographics age/city/country/gender;
media-level: comments/likes/saved/shares/views/reach/follows/profile_visits),
`stories`, `tags`, `content_publishing_limit`, `business_discovery`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| `username` + display name → ExternalIdentity(platform=instagram) | `id` (IG user id), `ig_id`, `legacy_instagram_user_id` |
| `biography`, `website` → business description evidence | `profile_picture_url`, `shopping_review_status` |
| `followers_count`, `media_count` → Observation (timestamped metrics) | `business_discovery` query plumbing, `content_publishing_limit` quota state |
| published media → Content objects (caption, timestamp, permalink) | media pagination cursors, `like_count_hidden` handling |
| insights metrics → Observation/Metric (see row 9) | IG insight metric-name enums, breakdown plumbing |

Notes: `business_discovery` (third-party professional-account lookup) is an adapter
read path only; discovered accounts never become canonical without an owner claim.

### 4. Campaign → Campaign (CampaignSpec) — EMERGING

Campaign (`ad-campaign`, v26): defines the objective, contains ad sets.
Grounded fields: `id`, `name`, `account_id`, `objective` (OUTCOME_* enums:
OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS,
OUTCOME_APP_PROMOTION, OUTCOME_SALES), `status`/`configured_status`, `effective_status`,
`buying_type` (AUCTION/FIXED_CPM/RESERVED), `bid_strategy`,
`daily_budget`/`lifetime_budget` (minor units, i.e. cents for USD), `budget_remaining`,
`spend_cap`, `special_ad_category`/`special_ad_categories`, `special_ad_category_country`,
`smart_promotion_type`, `boosted_object_id`, `source_campaign_id`, `start_time`/`stop_time`,
`created_time`/`updated_time`, `adlabels`, `issues_info`.
Edges: `adsets`, `ads`, `insights`, `copies`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| `objective` → FYD campaign intent vocabulary (mapped, not copied: OUTCOME_LEADS → "acquire leads") | `id`, `account_id`, `source_campaign_id`, `boosted_object_id` |
| `name` → campaign label (owner-facing) | `bid_strategy`, `buying_type`, `smart_promotion_type` |
| time window (`start_time`/`stop_time`) → CampaignSpec window | `special_ad_categories`, `special_ad_category_country` (compliance plumbing) |
| budget constraint (`daily_budget`/`lifetime_budget`/`spend_cap`, normalized to currency units) → CampaignSpec budget constraint (feeds authority-ux spend tiers) | raw minor-unit representation, `budget_remaining` computation |
| `effective_status` lifecycle → campaign state (draft/active/paused/ended) | `status` vs `configured_status` vs `effective_status` tri-state, `issues_info`, `adlabels` |

Notes: this row is a PROPOSAL until CampaignSpec lands (`fyd-business-graph/campaign-spec/`
is empty; directive §8 says harvest before defining). The adapter must translate
Meta's objective enum into FYD intent terms — PING core never sees OUTCOME_SALES.

### 5. AdSet → Audience + DeliveryPlan — PARTIALLY OWNED / NEW

AdSet (v26.0, updated Sep 21 2026): ads sharing budget, schedule, bid, targeting.
Grounded fields: `id`, `name`, `campaign_id`, `daily_budget`/`lifetime_budget` (cents),
`budget_remaining`, `bid_amount`, `bid_strategy` (LOWEST_COST_WITHOUT_CAP /
LOWEST_COST_WITH_BID_CAP / COST_CAP / LOWEST_COST_WITH_MIN_ROAS), `bid_info`,
`bid_constraints`, `bid_adjustments`, `billing_event`, `optimization_goal`, `targeting`
(`geo_locations`, `age_min`/`age_max`, `genders`, `interests`, `behaviors`,
`facebook_positions`, `publisher_platforms`, `custom_audiences`), `promoted_object`,
`attribution_spec`, `start_time`/`end_time`, `adset_schedule`, `pacing_type`,
`dsa_beneficiary`/`dsa_payor` (EU), `configured_status`/`effective_status`, `issues_info`.
Edges: `ads`, `insights`, `copies`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| `targeting` semantics → Audience definition (geo/demo/interest in FYD terms; directive §4 graph already has Campaign `targets`→Audience) | `targeting` JSON verbatim, `billing_event`, `bid_amount`/`bid_info`/`bid_constraints`/`bid_adjustments` |
| `optimization_goal` → delivery intent (mapped, e.g. LEAD_GENERATION → "generate leads") | `optimization_goal` enum string, `attribution_spec` |
| budget + schedule → DeliveryPlan (adapter-side execution plan: how much, when, how fast) | minor-unit budgets, `pacing_type`, `adset_schedule` dayparts |
| `promoted_object` page/pixel refs → relationship to ExternalIdentity, not raw ids | `promoted_object` JSON, `dsa_beneficiary`/`dsa_payor`, `issues_info` |

Notes: DeliveryPlan is the genuinely new sub-concept: the deterministic execution plan
the campaign compiler produces and the adapter enforces. Audience is partially owned
(directive §4 names it); the Meta targeting DSL never enters PING core.

### 6. Ad → Creative + Distribution binding — EMERGING / ADAPTER

Ad (`adgroup`, v26): individual ad in an ad set. Data for an ad: creative elements +
measurement info. Grounded fields: `id`, `name`, `adset_id`, `campaign_id`,
`creative` (nested AdCreative), `status`/`effective_status`, `bid_amount`,
`tracking_specs`, `conversion_specs`, `created_time`/`updated_time`.
Edges: `adcreatives`, `insights`, `leads` (lead ads), `previews`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| the binding itself → Distribution receipt: this Creative, to this Audience, in this window, with this spend | `id`, `adset_id`, `campaign_id` |
| `effective_status` + insights → delivery state observations | `tracking_specs`, `conversion_specs`, `bid_amount` overrides |
| `previews` → owner preview artifact (feeds approval UX) | preview generation plumbing |

Notes: an Ad has no standalone FYD identity; it is the compiled artifact of
CampaignSpec → adapter. Its canonical trace is the receipt, not the object.

### 7. AdCreative → Creative — EMERGING

AdCreative (updated Aug 6 2026): defines the ad's appearance and content.
Grounded fields: `id`, `name`, `object_story_spec` (`page_id` + one of `link_data` /
`photo_data` / `video_data` / `text_data` / `template_data`; `link_data` carries
`image_hash`/`picture`, `link`, `message`, `name`, `description`, `call_to_action`,
`child_attachments[]`), `object_story_id`, `effective_object_story_id`, `object_type`,
`image_hash`, `image_url`, `thumbnail_url`, `video_id`, `asset_feed_spec`
(bodies/titles/descriptions/images/videos/call_to_action_types),
`degrees_of_freedom_spec`, `url_tags`, `instagram_permalink_url`, `status`, `title`, `body`.
Edges: `previews`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| message/headline/link/CTA text → Creative content (what the business says) | `object_story_spec` verbatim, `image_hash`/`video_id` (account-scoped asset refs) |
| media assets → content-addressed FYD media refs (own hash, own provenance per media policy) | `image_url`/`thumbnail_url` CDN URLs, `asset_feed_spec`, `degrees_of_freedom_spec` |
| `url_tags` semantics → tracking intent ("this link is measured") | `url_tags` verbatim, `instagram_permalink_url` |
| creative ↔ campaign link → Campaign `uses`→Creative | `object_story_id`/`effective_object_story_id`, `status` |

Notes: Meta image_hash/video_id are account-scoped; copying a campaign across accounts
requires re-upload (proven pattern). FYD Creative references media by content, and the
adapter resolves to account-scoped handles at compile time.

### 8. Leadgen Form + Lead → Lead — NEW

Leadgen form (`/{page-id}/leadgen_forms`): the object a lead ad points at.
Grounded form fields: `id`, `name`, `status`, `leads_count`, `questions`,
`privacy_policy`, `follow_up_action_url`, `locale`.
Lead (`/{form-id}/leads`, `/{ad-id}/leads`): `id`, `created_time`, `ad_id`, `form_id`,
`field_data` [{name, values[]}] (field names defined by the form builder — map by name,
never position), `custom_disclaimer_responses`.
Webhook (`leadgen` field): `leadgen_id`, `page_id`, `form_id`, `adgroup_id`, `ad_id`,
`created_time`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| `created_time` → received timestamp | `id`, `form_id`, `ad_id`/`adgroup_id` |
| mapped contact answers (name/email/phone → canonical contact fields) | raw `field_data` name/value pairs, `custom_disclaimer_responses` |
| source campaign/ad → relationship Campaign `produces`→Lead | form `questions` schema, `privacy_policy`, `follow_up_action_url`, `locale` |
| lead → FYD Lead object (new; received->Lead per directive §4) | webhook subscription plumbing, `leads_count` |

Notes: (a) PII boundary is UNKNOWN — see open questions; raw answers must not enter
the canonical graph until the FYD-010/privacy rule is settled. (b) Writes are
at-most-once: the API has no idempotency key; a retried create makes a second form.
The adapter must list-before-create and dedupe by name. (c) Lead retrieval needs a
Page token with `leads_retrieval`, not just the ad-account token.

### 9. Insights edges → Observation / Metric — OWNED

Marketing API `/insights` (levels: ad, adset, campaign, account): dedupes across child
objects, supports async reports. Grounded metric fields: `date_start`/`date_stop`,
`impressions`, `reach`, `frequency`, `clicks`, `unique_clicks`, `inline_link_clicks`,
`outbound_clicks`, `spend` (dollar string, NOT cents), `cpm`, `cpc`, `cpp`, `ctr`,
`actions` [{action_type, value}], `action_values`, `cost_per_action_type`,
`cost_per_conversion`, `conversions`, `conversion_values`, `purchase_roas`,
`video_p25/50/75/100_watched_actions`, `video_avg_time_watched_actions`.
Breakdowns: country, publisher_platform, platform_position, device_platform, age, gender.
Params: `date_preset` / `time_range`, `level`, `time_increment`, `attribution` context.
Also: Page `/{page-id}/insights` and IG User `/insights` edges (separate metric namespaces).

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| metric name → normalized FYD metric vocabulary (e.g. spend, impressions, reach) | Meta metric-name strings, `date_preset` plumbing |
| value + unit + window → Observation (timestamped, attributed to Campaign/Ad/Channel) | `spend`-as-string parsing, minor/major unit conversions |
| `actions[]` entries → Outcome observations (see row 10) | `action_type` enum strings, breakdown enums |
| trend/delta → Learning input (directive §2: observations feed learning) | async report cursors, `x-business-use-case-usage` rate-limit headers |

Notes: empty `data: []` means no activity in the window, not an error — the adapter
must record that as an (empty) observation, never as a failure. Attribution context
(7d click / 1d view default in 2026) travels with every metric observation.

### 10. Conversion (insights actions / custom conversions) → Outcome — OWNED

Conversions surface as `actions[]`/`conversions` in insights and as Custom Conversion
objects tied to pixel/CAPI events. PING owns outcomes (2000-hour program: PING owns
"outcomes/learning"; directive §11: outcome history is the moat).

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| conversion type → FYD Outcome type (lead, booking, purchase, call — mapped vocabulary) | `action_type` strings (`offsite_conversion.fb_pixel_lead`, etc.) |
| count + value + currency → Outcome (value, time, evidence link to the observation) | `cost_per_action_type`, `action_values` raw arrays |
| Campaign `produces`→Conversion relationship | custom conversion ids, `issues_info` flag state |

Notes: the Outcome is canonical; the Meta attribution of it is an Observation about
the Outcome. Never let Meta's action_type strings become FYD outcome types.

### 11. Custom Audience → AudienceReference — PARTIALLY NEW

CustomAudience (`/act_{id}/customaudiences`). Grounded fields: `id`, `name`,
`description`, `account_id`, `subtype` (CUSTOM, LOOKALIKE, ...), `approximate_count_lower_bound`/
`approximate_count_upper_bound` (-1 for inactive lookalikes), `customer_file_source`,
`data_source` {type, sub_type}, `delivery_status` {code, description} (200 ready / 300
too small / 400+ unusable), `operation_status`, `external_event_source` (pixel id),
`is_value_based`, `lookalike_audience_ids`, `lookalike_spec`, `rule`, `retention_days`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| `name`/`description` → Audience label | `id`, `account_id` |
| kind (customer-list / lookalike / engagement-based) → Audience kind | `subtype`, `data_source`, `customer_file_source` |
| size estimate → Audience property | `approximate_count_*_bound`, `delivery_status`, `operation_status` |
| seed relationship (lookalike → source audience) → AudienceReference graph edge | `lookalike_spec`, `lookalike_audience_ids`, `rule` JSON, `retention_days`, `external_event_source` |

Notes: AudienceReference is the handle FYD holds; the audience itself (membership,
hashes) never leaves Meta. Uploading customer lists (hashed PII) is an adapter
operation under owner approval — same PII boundary question as leads.

### 12. Pixel / Conversions API event → OutcomeObservation — OWNED mechanics

CAPI event (POST `/{PIXEL_ID}/events`). Grounded fields: `event_name` (standard:
Purchase, Lead, CompleteRegistration, PageView, AddToCart, InitiateCheckout, ... or
custom), `event_time` (unix seconds), `event_id` (dedup key shared with browser pixel),
`event_source_url`, `action_source` (website, app, phone_call, chat, physical_store...),
`user_data` (`em`, `ph`, `fn`, `ln`, `ct`, `st`, `zp`, `country`, `external_id` —
SHA-256; `client_ip_address`, `client_user_agent`, `fbp`, `fbc` — never hashed),
`custom_data` (`value`, `currency`, `content_ids`, `content_type`, `order_id`),
`opt_out`, `data_processing_options` (LDU), `test_event_code`.

| Canonical FYD (why) | Adapter-private (quarantined) |
|---|---|
| `event_name` → mapped FYD outcome/observation type | raw `event_name` strings, custom event names |
| `event_time` → observation timestamp | `event_id` dedup plumbing (kept as receipt id, not identity) |
| `custom_data.value`/`currency` → outcome value | full `user_data` (hashed PII stays adapter-side; matching quality is Meta's problem) |
| `event_source_url` → source context | `action_source`, `test_event_code`, `data_processing_options`, pixel id |

Notes: CAPI is the write path for outcomes FYD already knows (a booked job, a sale).
FYD records the Outcome; the adapter forwards a CAPI event so Meta can attribute.
Hashed PII is transient in the adapter and never persisted canonically.

### 13. Ad Account → (adapter-only container) — ADAPTER-ONLY

Not in the directive's table but required by §5's inventory (ACCOUNT/PAGE/IG/BUSINESS/
AD ACCOUNT). Grounded: `act_{id}` account id, `account_status`, currency, timezone,
spend limits. This is a billing/ownership container with no FYD counterpart by design.

| Canonical FYD | Adapter-private (everything) |
|---|---|
| none — referenced only as the scope in which adapter operations run | account id, `account_status`, currency, timezone, `default_dsa_payor`/`default_dsa_beneficiary`, funding source |

## Genuinely new vs already-owned

Already-owned by PING/FYD (Meta data normalizes in, no new concept):
Business, ExternalIdentity (Page, IG), Observation/Metric (insights),
Outcome (conversions), OutcomeObservation mechanics (CAPI).

Emerging (being defined now; these rows are proposals, not ratified):
Campaign/CampaignSpec, Audience (partially), Creative, Distribution receipt.

Genuinely new (no FYD counterpart; introduce deliberately or keep adapter-side):
Lead (new object), DeliveryPlan (adapter execution plan), AudienceReference (handle),
Ad Account container (adapter-only), asset-ownership traversal (adapter-only).

## Open questions (UNKNOWN, not guessed)

1. CampaignSpec not yet defined. `fyd-business-graph/campaign-spec/` is empty and
   directive §8 says harvest before defining. Rows 4–7 are proposals against a
   concept that does not exist yet. The Meta Campaign→FYD Campaign mapping cannot be
   ratified until CampaignSpec's fields (objective, offer refs, audience query,
   channels, budget, window, creative refs, success metric, approval policy) are fixed.
2. Canonical metric vocabulary. No PING metric/observation schema was found in the
   workspace search. Row 9 assumes a normalized FYD metric vocabulary exists to map
   Meta's metric names into. If it does not, defining it is prerequisite work, not
   adapter work.
3. Lead/audience PII boundary. Leads carry raw PII (`field_data`); custom-audience
   uploads carry hashed PII. The FYD-010 privacy gate and the pre-launch PII rule are
   unsettled for this path. Until resolved, raw lead answers and audience membership
   data stay quarantined in the adapter and never enter the canonical graph.
4. SocialIdentity vs ExternalIdentity. Directive §4's graph says Business
   `claims`→SocialIdentity, but the FYD handoff records SocialIdentityAuthority as
   previously rejected, and the live business graph uses ExternalIdentity + links_to.
   This map uses ExternalIdentity (established). The §4 wording needs reconciliation.

## Sources

- Meta Business reference (updated Apr 5 2026):
  https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/business
- Meta Ad Set reference v26.0 (updated Sep 21 2026):
  https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-campaign
- Meta Ad Creative reference (updated Aug 6 2026):
  https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-creative
- Meta IG User reference v26.0:
  http://developers.facebook.com/docs/graph-api/reference/shadow-ig-user/?locale=en_US
- Meta v26.0 changelog (Jul 29 2026):
  https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/
- Pages API getting started (v26.0):
  https://developers.facebook.com/documentation/pages-api/getting-started
- Lead ads retrieval + leadgen forms skills (api-evangelist, verified against specs):
  https://github.com/api-evangelist/facebook-lead-ads/blob/HEAD/skills/facebook-lead-ads-retrieve-leads.md
- Leadgen webhooks: https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/?locale=en_US
- CAPI parameter reference (narayan-metaflow, usetyton, aburton-stack corroborating):
  https://github.com/narayan-metaflow/metaflow-marketing-skills/blob/HEAD/skills/meta-ads-tracking-setup/references/capi-event-parameters.md
- Custom Audience fields (cassiorox mirror of official docs + funnel.io):
  https://github.com/cassiorox/claudepro/blob/HEAD/.claude/skills/meta-ads/references/meta-docs/custom-audience.md
- Insights metric reference (oliverames/meta-mcp-server):
  https://github.com/oliverames/meta-mcp-server/blob/HEAD/docs/marketing-api/insights-metrics.md
- FYD concept grounding: `~/workspace/fyd/handoff/2026-09-22-master-context-handoff.md`
  (ExternalIdentity + links_to; SocialIdentityAuthority rejected; CampaignSpec intent),
  `~/workspace/fyd-business-graph/authority-ux/authority-ux.md` (draft CampaignSpec refs).
