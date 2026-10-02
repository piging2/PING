# Connector intel - ticketing domain (reference platform: Freshdesk)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Tickets (id, subject, status, priority, source, requester, responder, tags, custom_fields), Conversations (replies; initiating message is in the ticket description), Notes, Contacts, Companies, Agents, Groups, Solutions. REST v2 at https://{domain}.freshdesk.com/api/v2.
Sources: https://developers.freshdesk.com/api/

## EVENTS
Webhooks via Admin > Workflows > Automations: trigger webhook on ticket create/update with configurable JSON payloads (ticket.id, status, subject, contact fields).
Sources: https://support.freshdesk.com/support/solutions/folders/272646

## CAPABILITIES
Ticket CRUD, replies/notes, assignment, priorities, SLAs, canned responses, knowledge base, satisfaction surveys, time entries. API available on paid plans.
Sources: https://developers.freshdesk.com/api/

## AUTHORIZATION
API key (basic auth with key as password). Permissions follow the agent role. Rate limits per plan.
Sources: https://developers.freshdesk.com/api/

## WEBHOOKS
Automation-triggered POSTs to configured URLs with ticket placeholders. No platform signature; authenticate with a shared secret in headers or URL token.
Sources: https://support.freshdesk.com/support/solutions/folders/272646

## POLLING
List tickets with page/per_page and updated_since filters, ordered by updated_at. Persist last poll timestamp.
Sources: https://developers.freshdesk.com/api/#list_all_tickets

## RATE-LIMITS
Per-plan rate limits documented in the API reference. 429 on excess; backoff. Verify current values in the docs.
Sources: https://developers.freshdesk.com/api/

## IDEMPOTENCY
No idempotency-key. Safe retry = check recent tickets (same requester + subject window) before create.
Sources: https://developers.freshdesk.com/api/

## EFFECTS
Creating tickets/replies (customer notifications), status changes, assignment. Reads are side-effect-free.
Sources: https://developers.freshdesk.com/api/

## REVERSIBILITY
Tickets deletable (with limits); replies immutable once sent. Status changes freely reversible.
Sources: https://developers.freshdesk.com/api/

## PROVENANCE
Ticket IDs stable; conversations carry created_at and user_id; ticket history via activities; webhook payloads include ticket.id and timestamps.
Sources: https://developers.freshdesk.com/api/

