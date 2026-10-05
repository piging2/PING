# Muse Meta setup

Updated October 4, 2026 (America/Denver). Graph API v26.0.

**Status: ADMIN system user and persistent token verified; setup remains incomplete for unrestricted production messaging and Instagram assignment.** All available main-business assets except Instagram have saved Full Access. Three Pages have GB messaging tokens and subscriptions. Muse has not yet been connected to a supplied Claude/Muse application runtime or secret store.

## IDs and saved access

| Asset | ID | Result |
|---|---|---|
| Main business Nolan Geske | 1014469657064951 | Nolan Full Access → Everything; business unverified |
| Personal business Nolan;Geske | 1300523497380358 | Business unverified; catalog owner |
| GB app | 1641669927306725 | Business type; Development mode; Muse Full Access |
| Dev app | 488334400494939 | Muse Full Access |
| How To Be Popular Page | 342501052618187 | Muse Full Access; Page token and conversations verified |
| PING Social Page | 1262592440277855 | Connected to GB; messaging token verified; business sharing awaiting approval |
| Go Save The Ocean Page | 2066967230285181 | Connected to GB; messaging token verified; business sharing pending |
| Instagram @nolanpigi | 17841400771094478 | Linked to How To Be Popular; profile read succeeds; fresh login required for assignment |
| Instagram console asset | 101655092744560 | UI asset ID, not Graph IG profile ID |
| Ad account f | act_2150184975883343 | Muse Full Access; API account_status=1 |
| Catalog Products for Nolan personal catalog | 5477376785683835 | Shared from personal to main business with Manage everything; Muse Full Access |
| WhatsApp test WABA | 1118784990598434 | Provisioned; Muse Full Access; API MANAGE task verified |
| WhatsApp test phone | 1328215300384258 | +1 555-632-1993; test account, up to five verified recipients |
| System user Muse (console ID) | 61595067782723 | Admin access |
| System user Muse (GB app-scoped Graph ID) | 122098243161502259 | ADMIN verified via business/system_users and debug_token |

Meta rejected `claude-muse-admin` for too many hyphens and also rejected `Claude Muse Admin`. The accepted name is **Muse**. Do not create a duplicate. Graph calls should use `/me` or the app-scoped ID rather than assuming the console ID works everywhere.

No pixels/datasets or domains were found in the inspected main-business console. `/1014469657064951/owned_pixels` returns an empty list. The main business has one owned ad account and no client ad accounts. The UI's selected ad asset ID 120247496041170711 is not the account ID to use in Graph calls.

## Credentials and expiration

Windows equivalent of the requested `/tmp` is `C:\tmp`. Credentials were saved locally, with no raw credentials printed in chat or this shareable report.

| Credential | Local file | Verified state |
|---|---|---|
| GB ADMIN system-user token | C:\tmp\muse_admin_token.txt | Valid SYSTEM_USER; 44 granted scopes; expires_at=0; data_access_expires_at=0 |
| How To Be Popular Page token | C:\tmp\PAGE_TOKEN.txt | Derived from Muse token; Page conversation read succeeds |
| PING Social Page token | C:\tmp\PAGE_TOKEN_1262592440277855.txt | Valid PAGE token; expires_at=0; data access renewal 2027-01-03 01:59:54 UTC |
| Go Save The Ocean Page token | C:\tmp\PAGE_TOKEN_2066967230285181.txt | Valid PAGE token; expires_at=0; same data access renewal date |
| GB App Secret | C:\tmp\META_APP_SECRET.txt | Retrieved from Basic settings after normal password confirmation |
| Webhook verification token | C:\tmp\META_VERIFY_TOKEN.txt | Random value; accepted in Meta webhook setup |
| Webhook callback | C:\tmp\META_WEBHOOK_URL.txt | Public HTTPS callback below |

The private requested file `C:\tmp\MUSE_SETUP.md` also contains the GB App Secret. Keep that private. This outputs copy references its credential file instead.

“Never” means no scheduled token expiry; Meta can still revoke access. The extra Page tokens originate from Nolan's login and need data-access renewal. A system-user ADMIN role and selected scopes do not bypass app access levels or business verification.

## Completed changes

- ✅ Accepted the separately approved non-discrimination policy and created Muse with ADMIN role.
- ✅ Assigned How To Be Popular, f, both apps, catalog and test WABA with Full Access.
- ✅ Shared catalog 5477376785683835 from business 1300523497380358 to 1014469657064951 with Manage everything; catalog product read now succeeds (empty catalog).
- ✅ Marketing API, Messenger, Instagram, WhatsApp, Webhooks, Facebook Login for Business and App Events are present in GB.
- ✅ Accepted separately approved Product Catalog Terms and generated the Never-expiring system-user token, selecting all 43 offered scopes. public_profile is automatically granted, giving 44 total.
- ✅ Accepted separately approved WhatsApp Business and Meta Cloud API Hosting terms; provisioned test WABA/phone.
- ✅ Connected all three visible Pages to GB using Nolan's approved messaging authorization, saved Page credentials and subscribed all three to messaging events.
- ✅ Registered active app-level Page, Instagram and WhatsApp webhook subscriptions and subscribed the WABA to GB.
- ✅ Retrieved GB App Secret and ran token debugging and asset checks.

Pages API and Business Management API are used through Graph endpoints and permissions; they were not separate Add Product tiles. Facebook Login's customer-facing redirect URI configuration awaits a real Muse redirect URL. App Events is added; SDK/event integration in Muse itself is not implemented by adding the product.

## Webhook

Callback: `https://moderate-sport-clark-above.trycloudflare.com/webhook`

Running components: stdlib Python server on 127.0.0.1:8080 and official Cloudflare cloudflared Quick Tunnel. PIDs are in `C:\tmp\META_WEBHOOK_PROCESSES.json`.

Source: `meta_webhook.py` in this outputs folder and C:\tmp. Event log: `C:\tmp\meta-webhook-events.jsonl`. Request metadata log: `C:\tmp\meta-webhook-events.requests.jsonl`. The receiver verifies SHA-256 signatures using the GB secret before logging JSON.

- Page fields: messages, messaging_postbacks, message_deliveries, message_reads, messaging_handovers.
- Instagram object fields: messages, messaging_postbacks, messaging_seen, message_reactions, comments.
- WhatsApp Business Account object: messages.

HTTPS challenge returned HTTP 200 with the requested challenge. A synthetic correctly signed POST returned 200 EVENT_RECEIVED and was logged; an invalid signature returned 403. Meta's dashboard sample send was attempted, but its arrival was not observed in the receiver log. Do not claim real end-to-end delivery from that button alone.

This is temporary hosting. The computer and both processes must remain running; a restarted Quick Tunnel can change URL. Replace it with a stable, always-on HTTPS Muse endpoint and update all three app subscriptions before production. The receiver currently logs events; it does not itself invoke Claude or send replies.

The Webhooks dashboard explicitly warns that an unpublished app receives only dashboard test webhooks and no production data, including from admins/developers/testers. Publishing, applicable review and a real test conversation remain necessary.

## API verification

Raw credential-redacted results are in META_VERIFICATION.json, META_EXTRA_VERIFICATION.json, META_ASSET_VERIFICATION.json, META_MESSAGING_VERIFICATION.json, META_WEBHOOK_VERIFICATION.json and WEBHOOK_SECURITY_TEST.json in this outputs folder.

| Check | Result |
|---|---|
| GET /me/permissions | 200; all 44 listed permissions granted |
| GET /debug_token | 200; valid GB SYSTEM_USER; no scheduled expiry |
| GET /me/businesses | 200, empty list; use explicit business/system-user asset edges |
| GET /1014469657064951/assigned_users | 400; field does not exist on Business in this API; not a missing grant |
| GET /1014469657064951/system_users | 200; Muse ADMIN, app-scoped ID above |
| GET /me/assigned_pages?business=1014469657064951 | 200; Page has MANAGE, MESSAGING, CREATE_CONTENT, MODERATE, ANALYZE, ADVERTISE and additional tasks |
| GET /me/assigned_ad_accounts?business=1014469657064951 | 200; f has MANAGE, ADVERTISE, ANALYZE, DRAFT |
| GET /me/assigned_product_catalogs?business=1014469657064951 | 200; personal catalog assigned |
| GET /342501052618187/conversations using Page token | 200; existing FB conversations returned |
| GET /342501052618187/conversations?platform=instagram | Meta error -2/subcode 2534084; existing non-role threads require Advanced Access to instagram_manage_messages |
| GET /17841400771094478?fields=id,username | 200; nolanpigi |
| GET /5477376785683835/products | 200, empty list |
| GET /1118784990598434/assigned_users | 200; Muse MANAGE |
| GET /1118784990598434/phone_numbers | 200; test phone ID above |
| POST Page and WABA subscribed_apps | 200, success true |
| GET /1641669927306725/subscriptions | 200; all three objects active with the expected fields, v26.0 |
| GET f/campaigns and f/ads | 200, empty lists; the screenshot's four campaigns could not be found in this account |

Initial calls using the console system-user ID for assigned_ad_accounts/catalogs failed. Using `/me` resolved those checks. Those historical errors remain in the logs for accuracy.

## How Muse uses the access

Configure Muse's backend to read the appropriate local credential (or migrate it to Muse's private secret store). System-user bearer authenticates business, catalog, ad-account and WABA calls. Page bearer authenticates Page messaging; the linked Page token is the Facebook Login route for Instagram calls. This establishes API access, not a browser login or a separate human Claude account. No invitation email was supplied.

The following are Bash/curl examples. On Windows use the credential files at C:\tmp and `curl.exe`, or run the examples from a shell that mounts those files. Replace recipient/adset/creative placeholders with valid IDs. Send examples were not executed: no eligible fresh test recipient or WhatsApp recipient number was supplied.

```bash
SYSTEM_TOKEN="$(cat /tmp/muse_admin_token.txt)"
PAGE_TOKEN="$(cat /tmp/PAGE_TOKEN.txt)"
GRAPH="https://graph.facebook.com/v26.0"

# Facebook Page reply to an eligible recipient's Page-scoped ID.
curl -X POST "$GRAPH/342501052618187/messages" \
  -H "Authorization: Bearer $PAGE_TOKEN" -H "Content-Type: application/json" \
  -d '{"messaging_type":"RESPONSE","recipient":{"id":"ELIGIBLE_PSID"},"message":{"text":"Hello from Muse"}}'

# Instagram DM using Facebook Login / linked Page token; blocked readiness noted above.
curl -X POST "$GRAPH/17841400771094478/messages" \
  -H "Authorization: Bearer $PAGE_TOKEN" -H "Content-Type: application/json" \
  -d '{"recipient":{"id":"ELIGIBLE_INSTAGRAM_SCOPED_ID"},"message":{"text":"Hello from Muse"}}'

# Create a paused ad using a real existing ad set and creative.
curl -X POST "$GRAPH/act_2150184975883343/ads" \
  -H "Authorization: Bearer $SYSTEM_TOKEN" \
  --data-urlencode 'name=Muse test ad' --data-urlencode 'status=PAUSED' \
  --data-urlencode 'adset_id=EXISTING_ADSET_ID' \
  --data-urlencode 'creative={"creative_id":"EXISTING_CREATIVE_ID"}'

curl "$GRAPH/5477376785683835/products?fields=id,name,retailer_id" \
  -H "Authorization: Bearer $SYSTEM_TOKEN"

curl "$GRAPH/me/permissions" -H "Authorization: Bearer $SYSTEM_TOKEN"
curl "$GRAPH/me/assigned_pages?business=1014469657064951" \
  -H "Authorization: Bearer $SYSTEM_TOKEN"

# Token debug using the app bearer; do not print either credential.
APP_SECRET="$(cat /tmp/META_APP_SECRET.txt)"
curl -G "$GRAPH/debug_token" --data-urlencode "input_token=$SYSTEM_TOKEN" \
  -H "Authorization: Bearer 1641669927306725|$APP_SECRET"
```

See Meta's [Instagram Facebook Login token collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-b9dac9f7-5415-4659-bcfd-795298a07e91) and the app's Messenger/Webhooks setup notices for the corresponding access requirements. Messaging still follows recipient eligibility and product rules; an ADMIN token cannot initiate arbitrary DMs.

## Remaining blockers and required inputs

1. **Instagram login:** complete @nolanpigi reauthentication in the open Instagram/business flow. Every Instagram assignment switch remains disabled until this succeeds. Then assign Everything to Muse and repeat messaging checks.
2. **Two additional Pages:** approve the prepared business-sharing terms/disclosure for PING Social and Go Save The Ocean; then save Full Access sharing and assign them to Muse. Their current Page messaging tokens already work for reads but are not permanent system-user assignments.
3. **Review/verification:** supply the business's real legal details and verification documents, privacy policy/data-deletion URLs and functioning Muse experience for applicable App Review/Advanced Access. GB remains Development mode. Its Messenger UI allows development messaging to app-role users, but public users need Review; webhook UI separately requires publishing for production delivery.
4. **Production WhatsApp:** supply and verify a real business phone number and eligible test recipient. The provisioned test phone is not a production business number.
5. **Permanent hosting/Muse integration:** supply a stable HTTPS endpoint/runtime and connect the credentials/event processing to Muse. Current receiver only logs events.
6. **Actual send test:** supply an eligible app-role recipient who has started a fresh conversation. Existing old conversations were not messaged. A successful conversation GET alone is not proof of delivery.
7. **Ad errors:** the requested October 30 terms banner was absent from inspected payment settings. No banner acceptance or campaign fix is claimed. f has no payment method and API returns no campaigns/ads; identify the account containing the screenshot's four campaigns before fixing their real errors.

## Granted scopes

All 43 selectable scopes were selected. public_profile was granted automatically. `pages_messaging_subscriptions` was not offered; it is not claimed as granted.

```text
read_insights,
publish_video,
catalog_management,
private_computation_access,
threads_business_basic,
ads_mcp_management,
pages_manage_cta,
pages_manage_instant_articles,
pages_show_list,
read_page_mailboxes,
ads_management,
ads_read,
business_management,
pages_messaging,
instagram_basic,
instagram_manage_comments,
instagram_manage_insights,
instagram_content_publish,
leads_retrieval,
whatsapp_business_management,
instagram_manage_messages,
attribution_read,
page_events,
commerce_account_read_settings,
commerce_account_manage_orders,
commerce_account_read_orders,
commerce_account_read_reports,
pages_read_engagement,
pages_manage_metadata,
pages_read_user_content,
pages_manage_ads,
pages_manage_posts,
pages_manage_engagement,
whatsapp_business_messaging,
instagram_shopping_tag_products,
instagram_branded_content_brand,
instagram_branded_content_ads_brand,
manage_app_solution,
pages_utility_messaging,
paid_marketing_messages,
whatsapp_business_manage_events,
instagram_manage_contents,
facebook_branded_content_ads_brand,
public_profile
```
