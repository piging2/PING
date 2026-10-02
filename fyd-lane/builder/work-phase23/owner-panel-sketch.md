# Build owner panel: design sketch (integrate after reading build-client.tsx on the Pig)

## Placement
New client component: src/app/build/[siteId]/owner-panel.tsx (owned surface).
Integrated into the existing build page/client with a clearly labeled section.
The shared AskFydWidget (src/fyd/components/ask-fyd-widget.tsx) is OUTSIDE the
single-writer surfaces: do not modify it. If it accepts an endpoint prop, pass
`/api/fyd/ask/[siteId]` from the build client. If not, leave the widget as-is
and note the gap rather than changing shared ownership without coordination.

## Visible labeling (no em dashes)
A banner at the top of the panel:
"DEMO OWNER CONTEXT. Mutations here run as a seeded demo actor. No owner
identity was verified. Not a production owner API."

## State machine
idle -> proposing (POST stage=propose {text})
  -> proposed (render preview)
  -> approving (POST stage=approve {command, baseStateDigest, baseViewDigest, patchDigest})
  -> applied (show receipt: eventId, resultDigest, actor label) | stale (409: show
     STALE PROPOSAL, which digest moved, offer "Draft a fresh proposal")
  -> error (400s: show message, stay on proposal)

## Proposal preview contents (from propose response)
- Actor disclosure line (demoNote)
- Command description (describeCommand)
- Before/after: preview.changes[] entries (field, from, to)
- Evidence impact: evidenceImpact summary
- Capability impact: capabilityImpact list
- Digests (truncated to 12 chars): base state, base view, patch
- Approve button (one tap) + "Discard" button

## Revert
A "Revert last change" affordance: sends stage=propose with text
"Revert phone correction" (or the last applied field), then the same approve flow.
After revert, show the restored value.

## API contract (from overrides route)
POST /api/fyd/objects/[objectId]/overrides
propose request:  { stage: "propose", text: string }
propose response: { ok, demoOwnerContext, demoNote, actorDisclosure, proposal: { command, description, preview },
                    digests: { baseStateDigest, baseViewDigest, patchDigest }, capabilityImpact, chain }
approve request:  { stage: "approve", command, baseStateDigest, baseViewDigest, patchDigest }
approve response: { ok, demoOwnerContext, demoNote, approval: { tenantId, actor, baseStateDigest,
                    baseViewDigest, patchDigest, approvedAt, eventId, resultDigest }, view }
errors: { ok:false, code, error, demoOwnerContext, demoNote }
  codes: tenant_mismatch(400), invalid_tenant(400), missing_digest(400),
         tampered_command(400), stale_proposal(409)

## Ask FYD trusted endpoint
Point the build Ask widget at /api/fyd/ask/[siteId] (route-derived tenant).
Keep mode="visitor" (owner mode grants nothing by design).
