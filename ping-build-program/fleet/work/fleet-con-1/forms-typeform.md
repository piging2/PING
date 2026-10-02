# Connector intel — Forms domain (reference platform: Typeform)

Mapped from public docs; implementation stays data-driven. Provider: Typeform.
REST API, base https://api.typeform.com.

## OBJECTS
Forms (id, title, fields with 24+ question types: short_text, long_text,
multiple_choice, dropdown, yes_no, legal, rating, opinion_scale, nps, email,
phone_number, website, date, number, file_upload, payment, group, matrix,
statement), Responses (response_id = UUID, stable per submission; answers[],
hidden{}, calculated scores), Workspaces, Themes, Images, Webhooks (per-form
tag). Responses shared across all forms on an account (plan quota).
Sources: https://github.com/autohive-ai/autohive-integrations/blob/HEAD/typeform/README.md ;
https://github.com/agent-skills-hub/agent-skills-hub/blob/HEAD/tools/integrations/typeform.md

## EVENTS
Response submissions are the events. Push: per-form webhooks (below).
Pull: /forms/{form_id}/responses with since/before date filters, completed
filter, page_size up to 1000; incremental cursor = submitted_at. No separate
bulk-export endpoint: the responses endpoint IS the export. Hidden fields
(URL query params) arrive in response.hidden for correlation.
Sources: https://github.com/bdunk881/paperclipai/blob/HEAD/skills/typeform/SKILL.md ;
https://github.com/rohan-flutterint/airbyte/blob/HEAD/docs/integrations/sources/typeform.md

## CAPABILITIES
Forms list/get/create/update/delete (Create API); responses list/delete;
workspaces CRUD; themes CRUD; images list/get/delete; webhooks list/get/
create/delete per form. Reads first; form deletion is destructive (see
REVERSIBILITY).
Sources: https://github.com/autohive-ai/autohive-integrations/blob/HEAD/typeform/README.md ;
https://github.com/genostack/airbyte/blob/HEAD/docs/integrations/sources/typeform.md

## AUTHORIZATION
OAuth 2.0; personal API tokens (access tokens expire after 1 week per
integration research — verify current token lifetimes at build). API Token
used as bearer. Scopes requested at OAuth grant.
Sources: https://github.com/autohive-ai/autohive-integrations/blob/HEAD/typeform/README.md ;
https://github.com/dalgot4d/airbyte/blob/HEAD/docs/integrations/sources/typeform.md

## WEBHOOKS
Configured per form: PUT /forms/{form_id}/webhooks/{tag} with {url, enabled,
secret, verify_ssl}. Tag is operator-chosen; one form can have multiple tagged
webhooks (fan-out). Signature: Typeform-Signature header = "sha256=<base64>"
of body keyed by per-webhook secret — verify before processing. Must return
2xx within 30s; auto-disabled after sustained failures; retried on 5xx for
~24h. Replay safety: dedupe by response_id (stable UUID).
Sources: https://github.com/bdunk881/paperclipai/blob/HEAD/skills/typeform/SKILL.md ;
https://github.com/jackie-lgtm/aj-projects-skills/blob/HEAD/skills/sales/sales-typeform/SKILL.md

## POLLING
Responses endpoint with since/before + completed filter + page_size (max 1000)
as the polling surface; cursor = latest submitted_at (mark last_run_at to the
latest submitted_at observed). Separate call per form: enumerate form IDs
first. Webhooks primary, responses-poll the reconciliation layer.
Sources: https://github.com/bdunk881/paperclipai/blob/HEAD/skills/typeform/SKILL.md ;
https://github.com/rohan-flutterint/airbyte/blob/HEAD/docs/integrations/sources/typeform.md

## RATE LIMITS
Documented: 2 requests/second per account across Create and Responses APIs;
burst budget allows short spikes; 429 returns Retry-After. Webhooks & embed
are push-based with no rate limits. Sources: https://developer.typeform.com/get-started/#rate-limits
(cited in https://github.com/rohan-flutterint/airbyte/blob/HEAD/docs/integrations/sources/typeform.md) ;
https://github.com/bdunk881/paperclipai/blob/HEAD/skills/typeform/SKILL.md

## IDEMPOTENCY
No native idempotency-key documented in retrieved sources. Webhook handlers
dedupe by response_id (stable UUID per submission); form-create retries are
not replay-safe — reconcile by listing/searching forms before re-create.
Followup: verify at build.
Sources: WEBHOOKS citations; none found for native key — documented as
undocumented.
