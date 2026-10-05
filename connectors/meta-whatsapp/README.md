# Meta / WhatsApp — Muse system-user setup (2026-10-04)

Consolidated 2026-10-04 from Nolan's Codex session (session cwd
`C:\Users\nolan\Documents\Codex\2026-10-04\i`, rollout
`rollout-2026-10-04T19-26-52-01a109ab-...jsonl`). Shareable; contains NO
raw secrets. Credential values live ONLY in the C:\tmp files listed under
"Token storage"; they were NOT copied here.

## Business and app identities

| Asset | ID | State |
|---|---|---|
| Main business "Nolan Geske" | 1014469657064951 | Unverified; Nolan Full Access |
| Personal business "Nolan;Geske" | 1300523497380358 | Unverified; catalog owner |
| GB app | 1641669927306725 | Business type, Development mode; Muse Full Access |
| Dev app | 488334400494939 | Muse Full Access |
| System user "Muse" (console ID) | 61595067782723 | ADMIN |
| System user "Muse" (app-scoped Graph ID) | 122098243161502259 | ADMIN verified via business/system_users + debug_token |
| Ad account "f" | act_2150184975883343 | Muse Full Access; API account_status=1; no campaigns/ads returned |
| Catalog "Products for Nolan" | 5477376785683835 | Shared main business Manage everything; Muse Full Access; empty |

Use `/me` or the app-scoped Graph ID in calls; the console ID does not work
everywhere. Meta rejected the names "claude-muse-admin" and "Claude Muse
Admin" — the accepted name is **Muse**. Do not create a duplicate.

## WhatsApp (test, under business 1014469657064951)

- Test WABA: 1118784990598434 — Muse MANAGE verified
- Test phone: 1328215300384258 — +1 555-632-1993; test account, up to five
  verified recipients
- Terms accepted: Facebook Terms for WhatsApp Business + Meta Hosting Terms
  for Cloud API (separately approved by Nolan in-session)
- Not a production number. No production WhatsApp yet (needs real business
  phone + eligible recipient).

## Pages

| Page | ID | State |
|---|---|---|
| How To Be Popular | 342501052618187 | Muse Full Access; Page token + conversations verified; Instagram @nolanpigi linked |
| PING Social | 1262592440277855 | Connected to GB; messaging token verified; business sharing APPROVAL PENDING |
| Go Save The Ocean | 2066967230285181 | Connected to GB; messaging token verified; business sharing APPROVAL PENDING |

All three have messaging tokens and Page + app-level webhook subscriptions
(Page fields: messages, messaging_postbacks, message_deliveries,
message_reads, messaging_handovers).

## Instagram

- @nolanpigi — IG profile ID 17841400771094478; profile read 200, linked to
  How To Be Popular
- Assignment controls disabled until fresh login. Nolan must complete
  @nolanpigi reauthentication in the Instagram/business flow; then assign
  Everything to Muse and repeat messaging checks.
- Existing non-role conversations require Advanced Access to
  instagram_manage_messages (error -2 / subcode 2534084).

## Muse system-user token

- File reference only: `C:\tmp\muse_admin_token.txt`
- Valid SYSTEM_USER, no scheduled expiry (expires_at=0, data_access_expires_at=0)
- 44 granted scopes: 43 selected + public_profile automatic
- `pages_messaging_subscriptions` was not offered; NOT claimed
- Extra Page tokens (PING Social, Go Save The Ocean) came from Nolan's login;
  data access renewal 2027-01-03 01:59:54 UTC
- App Secret: `C:\tmp\META_APP_SECRET.txt` (file ref only)

## Granted scopes (44)

read_insights, publish_video, catalog_management, private_computation_access,
threads_business_basic, ads_mcp_management, pages_manage_cta,
pages_manage_instant_articles, pages_show_list, read_page_mailboxes,
ads_management, ads_read, business_management, pages_messaging,
instagram_basic, instagram_manage_comments, instagram_manage_insights,
instagram_content_publish, leads_retrieval, whatsapp_business_management,
instagram_manage_messages, attribution_read, page_events,
commerce_account_read_settings, commerce_account_manage_orders,
commerce_account_read_orders, commerce_account_read_reports,
pages_read_engagement, pages_manage_metadata, pages_read_user_content,
pages_manage_ads, pages_manage_posts, pages_manage_engagement,
whatsapp_business_messaging, instagram_shopping_tag_products,
instagram_branded_content_brand, instagram_branded_content_ads_brand,
manage_app_solution, pages_utility_messaging, paid_marketing_messages,
whatsapp_business_manage_events, instagram_manage_contents,
facebook_branded_content_ads_brand, public_profile

## Token storage references (FILE PATHS ONLY — values never leave C:\tmp)

| Credential | File |
|---|---|
| GB ADMIN system-user token | `C:\tmp\muse_admin_token.txt` |
| How To Be Popular Page token | `C:\tmp\PAGE_TOKEN.txt` |
| PING Social Page token | `C:\tmp\PAGE_TOKEN_1262592440277855.txt` |
| Go Save The Ocean Page token | `C:\tmp\PAGE_TOKEN_2066967230285181.txt` |
| GB App Secret | `C:\tmp\META_APP_SECRET.txt` |
| Webhook verify token | `C:\tmp\META_VERIFY_TOKEN.txt` |
| Webhook callback URL | `C:\tmp\META_WEBHOOK_URL.txt` |
| Webhook process PIDs | `C:\tmp\META_WEBHOOK_PROCESSES.json` |
| Private full setup copy (contains app secret) | `C:\tmp\MUSE_SETUP.md` |

Muse's backend reads these local credentials (or a migrated Muse secret
store). System-user token = business/catalog/ad/WABA calls; Page tokens =
Page messaging and the Instagram Facebook-Login route. No send examples were
executed (no eligible recipient supplied).

## Webhook

- Callback: `https://moderate-sport-clark-above.trycloudflare.com/webhook`
- Server: `outputs/meta_webhook.py` (stdlib Python, 127.0.0.1:8080) +
  official cloudflared Quick Tunnel. PIDs in
  `C:\tmp\META_WEBHOOK_PROCESSES.json`.
- Verification: HTTPS challenge 200 with requested challenge; synthetic
  correctly signed POST 200 EVENT_RECEIVED and logged; invalid signature 403.
  Subscriptions active on Page, Instagram, and WABA objects (app-level).
- Event logs: `evidence/meta-webhook-events.jsonl`,
  `evidence/meta-webhook-events.requests.jsonl` (metadata only, no secrets).
- TEMPORARY hosting: both processes and the computer must stay running; a
  restarted Quick Tunnel can change the URL. Replace with a stable always-on
  HTTPS Muse endpoint and update all three app subscriptions. Receiver logs
  events only; it does not invoke Claude or send replies.
- Meta dashboard sample send was attempted twice; receipt NOT observed. Do
  not claim real end-to-end delivery from that button.

## What is in this directory

- `outputs/` — shareable Codex artifacts: MUSE_SETUP.md, META_*.json
  (credential-redacted), WEBHOOK_SECURITY_TEST.json,
  META_CONTINUATION_LOG.json, META_AUDIT_LOG.md, meta_webhook.py (source)
- `work/` — session scripts: verify_meta.py, configure_all_webhooks.py,
  configure_messaging.py, check_webhook.py, test_signed_webhook.py,
  read_scopes.py, check_assets.py, check_extra.py, write_setup.py,
  finish_log.py, tunnel.stderr.log
- `evidence/` — webhook event logs + screenshots
  (whatsapp-provisioned.jpg, muse-token-review.jpg,
  muse-final-admin-access.jpg, muse-three-pages-connected.jpg)

## Pending items (Nolan decisions / inputs)

1. Instagram login: Nolan completes @nolanpigi reauthentication; then assign
   Everything to Muse and repeat messaging checks.
2. Two additional Pages: approve business-sharing terms/disclosure for PING
   Social and Go Save The Ocean; then save Full Access sharing and assign to
   Muse.
3. Review/verification: real legal business details, verification documents,
   privacy policy + data-deletion URLs, functioning Muse experience; App
   Review / Advanced Access as applicable. GB is Development mode.
4. Production WhatsApp: real business phone number + eligible recipient.
5. Permanent hosting/Muse integration: stable HTTPS endpoint, credentials and
   event processing wired into Muse.
6. Actual send test: eligible app-role recipient with a fresh conversation.
   GET 200 on conversations is not delivery proof.
7. Connect Muse token to a Muse application runtime/secret store (not done).
8. Ads: f has no payment method and no campaigns via API; find the account
   holding the screenshot's four campaigns before fixing ad errors.
