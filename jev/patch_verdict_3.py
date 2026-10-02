"""Verdict-authority fix, patch 3: update WIT-NEG-1 fixture to the genuine
ReplayWorker payload shape. The test's intent (verified replay -> attested)
is preserved; the fixture now carries the kernel execution evidence the
genuine producer always attaches (fingerprint, violations, authority block).
The old bare-{verified:true} shape is exactly the forgery the witness must
now refuse (see test_witness_adversarial.js).
"""
path = 'gateway/test_witness_negpath.js'
with open(path) as f:
    text = f.read()

old = """    payload: {
      documentId: 'doc_1',
      replay: {
        verified: true,
        reason: 'kernel_verified',
      },
      upstreamEventId: 'evt-replay-parent',
    },"""
new = """    payload: {
      documentId: 'doc_1',
      replay: {
        verified: true,
        reason: 'kernel_verified',
        fingerprint: 'fp-neg-1',
        violations: [],
      },
      // Genuine ReplayWorker authority evidence (see _buildAuthorityEvidence).
      // WIT-NEG-1 tests the legitimate attestation path, so the fixture must
      // carry the evidence the genuine producer always attaches.
      authority: {
        authority: 'ReplayWorker',
        provider: 'KernelReplayExecutionProvider',
      },
      upstreamEventId: 'evt-replay-parent',
    },"""
assert text.count(old) == 1, "WIT-NEG-1 fixture anchor not found"
text = text.replace(old, new)
with open(path, 'w') as f:
    f.write(text)
print("WIT-NEG-1 fixture updated to genuine producer shape")
