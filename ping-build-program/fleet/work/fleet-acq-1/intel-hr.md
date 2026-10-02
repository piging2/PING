# Connector intel - hr domain (reference platform: BambooHR)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Employees (employee id, fields like firstName/lastName/jobTitle/department/workEmail/status), time off, benefits, reports, applicant tracking. REST at https://api.bamboohr.com/api/gateway.php with company subdomain. API key auth.
Sources: https://documentation.bamboohr.com/docs ; https://documentation.bamboohr.com/reference

## EVENTS
Event-based webhooks: employee.created, employee.updated (with changedFields), employee.deleted. Field-based (global) webhooks monitor configured fields. Payloads in JSON or form encoding.
Sources: https://documentation.bamboohr.com/docs/event-based-webhooks ; https://documentation.bamboohr.com/docs/global-webhooks

## CAPABILITIES
Employee directory, custom reports, time-off balances/requests, onboarding, performance. Write surface is narrower than read; check the API reference per resource.
Sources: https://documentation.bamboohr.com/docs ; https://documentation.bamboohr.com/reference

## AUTHORIZATION
API key per user (basic auth with key as password). Permissions follow the key owner's BambooHR role. Webhook management needs admin.
Sources: https://documentation.bamboohr.com/docs/getting-started

## WEBHOOKS
Event-based (recommended) or field-based payloads POSTed to HTTPS URLs. Signed with SHA-256 HMAC (X-BambooHR-Signature + X-BambooHR-Timestamp headers); reject stale timestamps. Global webhooks via admin UI; permissioned webhooks via POST /webhooks/.
Sources: https://documentation.bamboohr.com/docs/event-based-webhooks ; https://documentation.bamboohr.com/docs/global-webhooks

## POLLING
Employee directory list and custom reports for snapshots; track lastChanged timestamps client-side. No cursor-based sync API; reports with changed-since filters are the polling pattern.
Sources: https://documentation.bamboohr.com/docs ; https://documentation.bamboohr.com/reference

## RATE-LIMITS
Rate limits published in BambooHR developer documentation; exceeding returns errors. Verify current values in the docs before hard-coding.
Sources: https://documentation.bamboohr.com/docs

## IDEMPOTENCY
No idempotency-key. Employee updates keyed by employee id are naturally idempotent; check-before-create on employee number/email for safe retry.
Sources: https://documentation.bamboohr.com/docs ; https://documentation.bamboohr.com/reference

## EFFECTS
Employee record writes, time-off approvals, webhook configuration. Reads are side-effect-free.
Sources: https://documentation.bamboohr.com/docs

## REVERSIBILITY
employee.deleted webhook exists; deleted records are recoverable per BambooHR retention, not via API undelete. Field changes are overwritten, not versioned, by the API.
Sources: https://documentation.bamboohr.com/docs/event-based-webhooks

## PROVENANCE
Employee id stable; changedFields on update events names what changed; timestamps on payloads; custom reports give as-of snapshots.
Sources: https://documentation.bamboohr.com/docs/event-based-webhooks

