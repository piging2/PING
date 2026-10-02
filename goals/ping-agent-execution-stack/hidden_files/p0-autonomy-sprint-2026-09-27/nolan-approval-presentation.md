# Approval requested: FYD Emergency Services patch (Happy Place)

## The decision
Approve the exact-digest-bound presentation patch for the Happy Place homepage, section home:Services:2?

## The consequence
Approving applies the new Emergency Services heading and copy to the Happy Place homepage and records a canonical MC_APPROVAL_APPROVED event; denying leaves the site unchanged and records MC_APPROVAL_DENIED. Nothing has been applied yet.

## The evidence
- Proposal: p0prop-ac04480a6d1809fd
- Digest (sha256 of the exact canonical bytes): 5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa
- Status: WAITING_APPROVAL
- Validation: PASS on all 6 checks (section anchor, canonical envelope, mission binding, FYDPresentation contract types, real object id resolution, no unverified claims)
- Lineage: the original agent proposal failed all 5 semantic checks; revision 1 fixed the structure but kept an immediacy claim; revision 2 passed everything. Revision budget of 2 used in full.
- What changes: heading "Emergency Services" with copy "Get in touch with us for urgent repairs at Happy Place Carpentry LLC. We're always ready to help, but we can't promise response speed or ranking.", featuring the Restoration service object.
- Evidence link (proposal view, live on :3100): http://localhost:3100/api/mc/approvals?proposal_id=p0prop-ac04480a6d1809fd

## Your call
APPROVE or DENY. To execute either, POST to http://localhost:3100/api/mc/approvals with:
{"proposal_id":"p0prop-ac04480a6d1809fd","digest":"5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa","decision":"approve"}
or the same body with "decision":"deny". A wrong digest is refused with no state change.
