# EVALUATION adapter-01: submitProposal object_create branch

Status: EVALUATED, NO PATCH PROPOSED. Dependency: agent01 owns the file
(src/lib/ping/ping-object-reader.ts is an event-append path). Logged for the
coordinator; agent01 decides.

## WHY (evaluated)

The object_create branch of submitProposal creates PUBLIC objects as the
viewer identity with no owner/grant/capability check, unlike the object_update
branch which enforces controllerId === viewerId. Question: is this an
unambiguous capability correction?

## EVIDENCE

- ping-constitutional src/lib/ping/ping-object-reader.ts submitProposal:
  object_create accepts {objectId?, schema, content}, verifies the proposal
  digest, then submits a signed event as the viewer identity. No
  grant/controllership precondition.
- The practice lane's identity model: POST /api/ping/identity issues dev
  identities to anyone holding the local dev keys; createIdentity on the core
  is likewise open (gateway/routes/identities.js). Creating public objects is
  the lane's stated purpose (practice UI).
- Integrity holds: the proposal digest is still verified, so the created
  object matches the approved proposal bytes. What is absent is an
  authorization precondition, and the lane's design treats "any practice
  identity may publish public objects" as its threat model (dev identities,
  demo journal).

## CONCLUSION

Not an unambiguous-evidence correction. The missing check is consistent with
the lane's documented threat model; adding one would be a product/policy
decision (e.g. "only controller-of-site may create objects"), not a bug fix.
No diff is warranted under the patch-target rule. Recorded here so the
convergence wave can see the reasoning; if the threat model changes, the
minimum change is a controller-or-grant precondition on the object_create
branch mirroring the object_update branch.
