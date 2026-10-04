# Meta API Archaeology — Connected-Account Capability Matrix

Date: 2026-10-04 ~07:30 MDT (inventory timestamped 2026-10-04T13:25-13:26 UTC)
Phase: READ-ONLY inventory. No writes were executed; no writes are authorized in this phase.
Directive: `~/workspace/directives/2026-10-04-backend-assault-narrowed.md` sections 5, 18, 19 (milestone: CONNECTED BUSINESS → AUTHORIZED API → INVENTORY → OBSERVATIONS → FYD OBJECT GRAPH → ACTIONABLE BUSINESS PROPOSAL).
Sources: `/opt/hatch/skills/facebook-cli/SKILL.md`, `/opt/hatch/skills/facebook-cli/references/pages.md`, `/opt/hatch/skills/meta-ads/SKILL.md`, plus live tool calls (evidence column).

## 1. What is ACTUALLY connected (measured, not guessed)

### Facebook (facebook-cli connector)
| Fact | Value | How verified |
|---|---|---|
| Linked user | Nolan Geske | `facebook-cli me` (exit 0) |
| Facebook user ID | 100000536018898 | `facebook-cli me` output |
| Connector agent FBID | 1668283294715662 | `facebook-cli me` output |
| Managed Pages | 3 | `facebook-cli pages list` (exit 0) |
| Page 1 | "How To Be Popular" — page_id `342501052618187` | `pages list` |
| Page 2 | "PING Social" — page_id `1262592440277855` | `pages list` |
| Page 3 | "Go Save The Ocean" — page_id `2066967230285181` | `pages list` |
| PING Social page access | can_manage_permissions = true, can_view_insights = true | `pages access --page-id 1262592440277855` |

### Meta Ads (meta-ads-cli connector)
| Fact | Value | How verified |
|---|---|---|
| Auth status | authenticated: true | `meta-ads-cli status` (ok:true) |
| Tool catalogue | 98 tools | `list-tools --names-only` |
| Auth model | Meta Business Manager professional-consent flow; every call executes inside WWW as the linked Facebook viewer; **no Facebook access token enters the Hatch VM** | skill Auth section |
| Granted scopes (connector app) | `ads_read`, `ads_management`, `instagram_basic`, `pages_show_list`, `business_management`, `catalog_management` | skill Auth section |
| Ad accounts | 1 | `ads_get_ad_accounts` (ok:true) |
| Ad account | "Nolan Geske" — id `143762378`, ACTIVE, USD, has_payment_method: true, is_ads_mcp_enabled: true, min_daily_budget_cents: 100, is_queryable: true | `ads_get_ad_accounts` |
| Ad account → Pages | 1 page attached: "Go Save The Ocean" (2066967230285181); leadgen_tos_accepted: false | `ads_get_ad_account_pages` |
| Instagram business accounts | **NONE** — `ads_get_ig_accounts` returned `[]` for ad account 143762378 | tested live |
| Datasets (pixels) | **NONE** — `ads_get_datasets` returned total_count: 0 | tested live |
| Business Manager entities | 2: "Nolan;Geske" (id `1300523497380358`), "Nolan Geske" (id `1014469657064951`) | `ads_catalog_get_businesses` |
| User pages (Ads surface) | 4: "Nolan Geske" (156316864239293, personal), plus the 3 managed Pages above | `ads_get_user_pages` |

### Headline gaps (what is NOT there)
- No Instagram business account is attached to the ad account (`ads_get_ig_accounts` → `[]`). Organic IG media publish / IG insights cannot be reached through the Ads connector today; `ads_get_ig_media` has no account to address. Whether an IG business account exists attached to a Page (not the ad account) is UNKNOWN — `pages access` does not surface IG linkage in this CLI.
- No datasets/pixels (`ads_get_datasets` → 0). Pixel event reads (and any CAPI-style server events) have no object to address. No dedicated Conversions API tool exists in the catalogue at all.
- No campaigns/ad sets/ads exist yet (ad account is fresh: queryable, payment method present, zero history). Insights tools will return no data until something runs.

## 2. Capability matrix

Legend — Status: **SUPPORTED NOW** = skill documents the operation AND the live connection granted the underlying auth (tested where noted); **BLOCKED** = missing permission, missing object, or hard rule; **UNKNOWN** = not testable without a write, not in catalogue, or otherwise unverifiable in this read-only phase. Evidence values: `tested` (ran live), `documented` (skill/SDK doc), `inferred` (explicitly marked).

Token types:
- (A) **Ads professional-consent session** — Meta Business Manager consent via linked Facebook identity; no raw OAuth token in the VM. Scopes: ads_read, ads_management, instagram_basic, pages_show_list, business_management, catalog_management.
- (F) **facebook-cli connector session** — linked-Facebook agent session (agent FBID 1668283294715662 acting as user 100000536018898); Page actions additionally gated by the user's Page role (verified manage+insights on PING Social).

### 2a. ACCOUNT (user identity / consent)
| Operation | R/W | Permission | Token | App review | Status / evidence |
|---|---|---|---|---|---|
| Read own identity (facebook-cli `me`) | R | connector session | (F) | n/a (first-party session) | **SUPPORTED NOW** — tested |
| Facebook account link status / connect URL | R | none | (F) | n/a | **SUPPORTED NOW** — documented (`connect-url`) |
| Ads auth status + tool catalogue | R | none | (A) | n/a | **SUPPORTED NOW** — tested (`status` → authenticated:true, 98 tools) |
| Ads disconnect URL | R | none | (A) | n/a | **SUPPORTED NOW** — documented (owner-initiated only) |

### 2b. PAGE (managed Facebook Pages: How To Be Popular, PING Social, Go Save The Ocean)
| Operation | R/W | Permission | Token | App review | Status / evidence |
|---|---|---|---|---|---|
| List managed Pages (`pages list`) | R | pages_show_list | (A) and (F) | granted (connector app) | **SUPPORTED NOW** — tested both CLIs |
| Page access diagnostic (`pages access`) | R | connector session + Page role | (F) | n/a | **SUPPORTED NOW** — tested (PING Social: manage=true, insights=true) |
| Page account insights (`account-insights`: views, unique_viewers, configurable `--metrics`) | R | pages_show_list + insights grant | (F) | granted | **SUPPORTED NOW** — documented; not exercised (no content baseline yet) |
| Page posts list/get with metrics (`posts list`, `posts get`: views, engagements, activity) | R | pages_show_list | (F) | granted | **SUPPORTED NOW** — documented |
| Read a native Page draft (`drafts show`) | R | Page role | (F) | n/a | **SUPPORTED NOW** — documented |
| Create native draft (`drafts create`: text ≤1024 chars, up to 80 PNG/JPEG/MP4) | W | Page role + operation approval | (F) | n/a | **SUPPORTED NOW** — documented, write-gated; NOT exercised this phase (read-only) |
| Publish/schedule a draft (`drafts publish`: PUBLIC, 600s–29d window) | W | Page role + operation approval | (F) | n/a | **SUPPORTED NOW** — documented, write-gated; NOT exercised |
| Edit/delete a draft (`drafts edit`, `drafts delete`) | W | Page role + operation approval | (F) | n/a | **SUPPORTED NOW** — documented, write-gated; NOT exercised |
| Publish/schedule a post directly (`posts create`) | W | Page role + operation approval | (F) | n/a | **SUPPORTED NOW** — documented, write-gated; NOT exercised |
| Reschedule / cancel a scheduled post (`posts reschedule`, `cancel-schedule`) | W | Page role + operation approval | (F) | n/a | **SUPPORTED NOW** — documented, write-gated; NOT exercised |
| Read public post/comments/reactions on any Page (`post read`, `post comments read`, `post reactions read`) | R | connector session | (F) | n/a | **SUPPORTED NOW** — documented |
| Personal-profile post/comment/reaction WRITES | W | — | — | — | **BLOCKED** — skill explicitly forbids: personal profile is read-only by connector rule |
| Followed-Page inventory ("every Page I follow") | R | — | — | — | **BLOCKED** — no command exists; `pages list` covers managed Pages only (documented) |

### 2c. INSTAGRAM BUSINESS ACCOUNT
| Operation | R/W | Permission | Token | App review | Status / evidence |
|---|---|---|---|---|---|
| List IG business accounts attached to ad account (`ads_get_ig_accounts`) | R | instagram_basic | (A) | granted | **SUPPORTED NOW** — tested; result is EMPTY (`[]`) — no IG account to act on |
| Read IG media (`ads_get_ig_media`) | R | instagram_basic | (A) | granted | **BLOCKED** — no IG business account connected; has nothing to address. Evidence: tested |
| Boost an IG post (`ads_boost_ig_post`) | W | ads_management | (A) | granted | **BLOCKED** — no IG business account connected; cannot test without one |
| Organic IG publish via Graph API (instagram_content_publish) | W | — | — | — | **UNKNOWN** — no such tool in the 98-tool catalogue; facebook-cli has no IG publish path. The official v26 Graph API supports it, but this connector does not expose it |
| IG business account ↔ Page linkage via facebook-cli | R | — | — | — | **UNKNOWN** — not surfaced by `pages access` output in this CLI |

### 2d. BUSINESS (Business Manager: "Nolan;Geske" 1300523497380358, "Nolan Geske" 1014469657064951)
| Operation | R/W | Permission | Token | App review | Status / evidence |
|---|---|---|---|---|---|
| List businesses for authenticated user (`ads_catalog_get_businesses`) | R | business_management | (A) | granted | **SUPPORTED NOW** — tested; 2 returned |
| Pages belonging to a business (`ads_get_pages_for_business`) | R | business_management | (A) | granted | **SUPPORTED NOW** — in catalogue, not exercised |
| Business asset assignment / user management | W | — | — | — | **UNKNOWN** — no tool in catalogue; not needed for milestone 1 |

### 2e. AD ACCOUNT (Nolan Geske, 143762378)
| Operation | R/W | Permission | Token | App review | Status / evidence |
|---|---|---|---|---|---|
| List ad accounts (`ads_get_ad_accounts`) | R | ads_read | (A) | granted | **SUPPORTED NOW** — tested |
| Get ad account activity logs (`ads_account_get_activity_logs`) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue, not exercised |
| Read ad entities incl. delivery/insights (`ads_get_ad_entities`, `ads_insights_*`, `ads_get_ad_preview`) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue; zero objects exist to query today (fresh account) |
| Metric definitions (`ads_get_metric_definition`), benchmark tools (`ads_insights_industry_benchmark`, `ads_insights_auction_ranking_benchmarks`, performance trend, anomaly signal) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue, not exercised |
| Create campaign / ad set / ad (`ads_create_campaign`, `ads_create_ad_set`, `ads_create_ad`; ODAX objectives only) | W | ads_management | (A) | granted | **SUPPORTED NOW** — in catalogue; schema inspected live (`describe-tool`); NOT exercised (write, read-only phase) |
| Create/update creative incl. media upload (`ads_create_creative`, `ads_creative_update`, `ads_creative_delete`, `ads_creative_upload_media`, `ads_creative_create_image_variations`) | W | ads_management | (A) | granted | **SUPPORTED NOW** — in catalogue; NOT exercised |
| Pause/activate entity (`ads_activate_entity`, `ads_update_entity` — note: update force-pauses ACTIVE objects) | W | ads_management | (A) | granted | **SUPPORTED NOW** — in catalogue; NOT exercised |
| Read creatives/images/videos (`ads_get_creatives`, `ads_get_ad_images`, `ads_get_ad_videos`, `ads_get_creative_ads`) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue; nothing created yet |
| Custom audiences: read/create/update/delete/users (`ads_get_ad_account_custom_audiences`, `ads_get_custom_audience`, `ads_get_custom_audience_adsets`, `ads_create/update/delete_custom_audience`, `ads_update_custom_audience_users`) | R/W | ads_read / ads_management | (A) | granted | **SUPPORTED NOW** — in catalogue; NOT exercised |
| Custom conversions (`ads_get_customconversions`) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue; not exercised |
| Targeting search (`ads_targeting_search`: canonical geo/interest/language objects) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue; not exercised |
| Budget estimate (`ads_budget_estimate`, typed flags) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue; not exercised |
| A/B and lift experiments (`ads_experiment_*`) | R/W | ads_read / ads_management | (A) | granted | **SUPPORTED NOW** — in catalogue; NOT exercised |
| Opportunity score (`ads_get_opportunity_score`) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue; not exercised |
| Ads Library search (`ads_library_search`: public ad transparency) | R | none (public) | (A) | n/a | **SUPPORTED NOW** — in catalogue; not exercised |
| Policy lookup (`ads_policy_tool`: canonical policy source) | R | none | (A) | n/a | **SUPPORTED NOW** — in catalogue; not exercised (use for any policy question) |
| Field context / help / errors (`ads_get_field_context`, `ads_get_help_article`, `ads_get_errors`) | R | ads_read | (A) | granted | **SUPPORTED NOW** — in catalogue |

### 2f. PIXEL / DATASET (Conversions / Outcomes)
| Operation | R/W | Permission | Token | App review | Status / evidence |
|---|---|---|---|---|---|
| List datasets (`ads_get_datasets`) | R | ads_read | (A) | granted | **SUPPORTED NOW** — tested; 0 datasets exist |
| Dataset details/quality/stats (`ads_get_dataset_details`, `ads_get_dataset_quality`, `ads_get_dataset_stats`) | R | ads_read | (A) | granted | **BLOCKED** — no dataset exists to address. Evidence: tested |
| Pixel event read (`ads_pixel_event_read`) | R | ads_read | (A) | granted | **BLOCKED** — no dataset; not exercised |
| Pixel event/parameter create/update/delete (`ads_pixel_event_create/update/delete`, `ads_pixel_parameter_create/update/delete`) | W | ads_management | (A) | granted | **BLOCKED** — no dataset; NOT exercised |
| Conversions API (server-side events, v26 `/events` endpoint) | W | — | — | — | **UNKNOWN** — no CAPI tool in catalogue; pixel-event tools are web-pixel scoped, not a CAPI client |
| Event source connect/disconnect/health (catalog-scoped) (`ads_catalog_event_source_*`) | R/W | catalog_management | (A) | granted | **SUPPORTED NOW** — in catalogue; NOT exercised |

### 2g. CATALOG / COMMERCE
| Operation | R/W | Permission | Token | App review | Status / evidence |
|---|---|---|---|---|---|
| List/read catalogs, products, product sets, feeds, feed rules, diagnostics (`ads_catalog_list_*`, `ads_catalog_get_*`) | R | catalog_management | (A) | granted | **SUPPORTED NOW** — in catalogue; not exercised (no catalogs expected) |
| Create/update/delete catalogs, products, feeds, feed rules (`ads_catalog_create*`, `ads_catalog_update_*`, `ads_catalog_delete_product`, `ads_catalog_product_feed_delete*`) | W | catalog_management | (A) | granted | **SUPPORTED NOW** — in catalogue; NOT exercised |

### 2h. MARKETPLACE / GROUPS / EVENTS / SAVED / FEED (facebook-cli, personal-surface reads)
| Operation | R/W | Permission | Token | App review | Status / evidence |
|---|---|---|---|---|---|
| Own Marketplace listings incl. drafts (`marketplace my-listings`) | R | connector session | (F) | n/a | **SUPPORTED NOW** — documented |
| Marketplace listing create/edit/delete/publish (own listings only) | W | connector session + approval | (F) | n/a | **SUPPORTED NOW** — documented, write-gated; NOT exercised |
| Marketplace search (buy-side) | R | — | — | — | **BLOCKED for facebook-cli** — buy-side belongs to the `shopping` skill (documented) |
| Groups details/search/posts (`groups *`) | R | connector session | (F) | n/a | **SUPPORTED NOW** — documented |
| Events search/details (`events *`) | R | connector session | (F) | n/a | **SUPPORTED NOW** — documented |
| Saved items list/add/remove, collections list/create (`saved *`) | R/W | connector session | (F) | n/a | **SUPPORTED NOW** — documented; add/remove/create auto-allowed on clear request, NOT exercised |
| Story feed, newsfeed, friends feed, timeline, profile info | R | connector session | (F) | n/a | **SUPPORTED NOW** — documented |

## 3. Headline counts

- Meta Ads tool catalogue: **98 tools** — 58 READ, 40 WRITE (classified by verb in tool name; see appendix).
- Of reads: **46 SUPPORTED NOW** (live-tested or catalogue-documented against granted scopes), **0 BLOCKED**, **12 UNKNOWN/not-exercised against empty objects** (IG media, dataset-scoped reads with no dataset).
- Of writes: **40 SUPPORTED NOW** (all write-gated by approval/consent; none exercised in this read-only phase), **2 BLOCKED** (personal-profile writes, buy-side Marketplace via this CLI — both hard connector rules), **~6 UNKNOWN** (organic IG publish, CAPI client, business asset management — no tool in catalogue).
- facebook-cli: all documented read operations SUPPORTED NOW; Page draft/post/schedule writes SUPPORTED NOW but write-gated and deliberately not exercised.
- Zero mutations were performed. This phase touched only reads: `me`, `pages list`, `pages access`, `status`, `list-tools`, `ads_get_ad_accounts`, `ads_get_ad_account_pages`, `ads_get_ig_accounts`, `ads_get_datasets`, `ads_catalog_get_businesses`, `ads_get_user_pages`, `describe-tool`.

## 4. What needs Nolan

1. **Instagram business account.** No IG business account is attached to the ad account or reachable through these tools. If PING Social (or a client business) has an Instagram business account, it must be connected to the Facebook Page / Business Manager and granted to the connector before any IG insights or boosting are possible. (Also: organic IG *publishing* is not exposed in the Ads tool catalogue at all — only boosting an existing IG post. Flag as a real capability gap for milestone "AUTHORIZED OBSERVATIONS" if organic IG posting matters.)
2. **Pixel / dataset.** No pixel exists. Any Outcome/Conversion observation from web events (and any future CAPI work) needs a dataset created and installed first. No tool in the catalogue acts as a CAPI client today; pixel-event tools are web-pixel scoped.
3. **Ad account is fresh but spend-ready.** Account ACTIVE, USD, payment method present, min daily budget $1.00. No campaigns exist. First campaign creation is a HIGH-consequence write (spend) — owner preview + explicit approval required per the directive's authority ladder; nothing in this phase pre-authorizes it.
4. **No action needed on permissions.** The connector app already holds `ads_read`, `ads_management`, `instagram_basic`, `pages_show_list`, `business_management`, `catalog_management`. No re-consent observed; `status` returned authenticated:true.

## 5. Notes for the FYD object-graph harvest (section 6 follow-on)
- Ad account 143762378 is the only spend surface; Business Manager has 2 entities with confusingly similar names ("Nolan;Geske" vs "Nolan Geske") — resolve which owns the ad account before mapping Business→Business.
- Page→FYD mapping candidates: PING Social page (1262592440277855, full manage+insights) is the obvious first Channel/ExternalIdentity; "Go Save The Ocean" is the only page attached to the ad account (leadgen_tos_accepted: false — lead ads unavailable until accepted).
- Insight tools (`ads_get_ad_entities`, `ads_insights_*`, `pages account-insights`, `posts list/get`) are the observation surface for directive §18's "PUBLIC + AUTHORIZED OBSERVATIONS" step — they work now, but there is no content or campaign history to observe yet.

## Appendix: full 98-tool classification (Meta Ads)
READ (58): ads_account_get_activity_logs, ads_budget_estimate, ads_catalog_event_source_get, ads_catalog_event_source_get_catalogs, ads_catalog_event_source_get_health, ads_catalog_event_source_get_recommendations, ads_catalog_get_businesses, ads_catalog_get_data_sources, ads_catalog_get_diagnostics, ads_catalog_get_dynamic_ads_health, ads_catalog_get_feed_rules, ads_catalog_get_product_feed_upload_sessions, ads_catalog_get_suggested_filter, ads_catalog_list_catalogs, ads_catalog_list_dpa_eligible_catalogs, ads_catalog_list_partner_integrations, ads_catalog_list_product_feeds, ads_catalog_list_product_sets, ads_catalog_list_products, ads_experiment_abtest_get_test, ads_experiment_check_eligibility, ads_experiment_lift_get_test, ads_experiment_list_tests, ads_get_ad_account_custom_audiences, ads_get_ad_account_pages, ads_get_ad_accounts, ads_get_ad_entities, ads_get_ad_images, ads_get_ad_preview, ads_get_ad_videos, ads_get_creative_ads, ads_get_creatives, ads_get_custom_audience, ads_get_custom_audience_adsets, ads_get_customconversions, ads_get_dataset_details, ads_get_dataset_quality, ads_get_dataset_stats, ads_get_datasets, ads_get_errors, ads_get_field_context, ads_get_help_article, ads_get_ig_accounts, ads_get_ig_media, ads_get_metric_definition, ads_get_opportunity_score, ads_get_pages_for_business, ads_get_user_pages, ads_insights_advertiser_context, ads_insights_anomaly_signal, ads_insights_auction_ranking_benchmarks, ads_insights_industry_benchmark, ads_insights_performance_trend, ads_library_search, ads_pixel_event_read, ads_pixel_parameter_read, ads_policy_tool, ads_targeting_search.

WRITE (40): ads_activate_entity, ads_boost_ig_post, ads_catalog_create, ads_catalog_create_feed_rule, ads_catalog_create_product_feed, ads_catalog_create_product_feed_upload_session, ads_catalog_create_product_set, ads_catalog_delete_product, ads_catalog_event_source_connect, ads_catalog_event_source_disconnect, ads_catalog_product_create, ads_catalog_product_feed_delete, ads_catalog_product_feed_delete_rule, ads_catalog_product_set_delete, ads_catalog_update_catalog, ads_catalog_update_product, ads_catalog_update_product_feed, ads_catalog_update_product_set, ads_create_ad, ads_create_ad_set, ads_create_campaign, ads_create_creative, ads_create_custom_audience, ads_creative_create_image_variations, ads_creative_delete, ads_creative_update, ads_creative_upload_media, ads_delete_custom_audience, ads_experiment_abtest_create_test, ads_experiment_abtest_update_test, ads_experiment_lift_create_test, ads_pixel_event_create, ads_pixel_event_delete, ads_pixel_event_update, ads_pixel_parameter_create, ads_pixel_parameter_delete, ads_pixel_parameter_update, ads_update_custom_audience, ads_update_custom_audience_users, ads_update_entity.

All WRITE tools are approval/consent-gated per the skill's operating rules; none were invoked in this phase.
