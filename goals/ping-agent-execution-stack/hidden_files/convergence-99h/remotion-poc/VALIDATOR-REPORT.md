# Remotion POC — Final Claim Validator Report

Date: 2026-09-30. Hard invariant: NO CLAIM may appear in frame or narration
without a claim-ledger binding.

## How the validator enforces the invariant
`validate-final.cjs` (Pig: `/tmp/remotion-poc/validate-final.cjs`) runs AFTER the
MP4 render and checks three groups against `ledger.json` (built from the live
`ping_events` CLAIM_CREATED query):

1. Rendered sentences (`video/src/data/scenes.json` — the exact data the Remotion
   composition imports and renders; no claim text is hardcoded in the .tsx):
   - scene.claim_id exists in the ledger;
   - scene.event_id equals the ledger record's event_id;
   - scene.sentence is an exact substring of the ledger record's claim_text;
   - scene.created_at / scene.source equal the ledger record's fields exactly;
   - scene.binding_hash present (sha256 of claim_id|event_id|sentence);
   - rendered word list == bound sentence word list (no injected words);
   - the scene's narration MP3 exists.
2. Narrated sentences (`script.json`, the SCRIPT GATE output):
   - every segment carries a non-empty binding {claim_id, event_id};
   - the sentence is verbatim in the bound ledger record's claim_text;
   - the sentence has a corresponding rendered scene.
3. Coverage: every ledger claim produced at least one rendered scene
   (nothing silently dropped).

Any violation prints `[RULE] detail` and exits 1 → artifact REJECTED.
Clean run prints VALIDATOR_PASS with counts and exits 0.

## Verification results (sandbox dry run, synthetic fixture, 2026-09-30)
- Fixture: 3 synthetic CLAIM_CREATED records → 6 narration segments.
- `validate-final.cjs` → **VALIDATOR_PASS** (scenes=6, script_segments=6,
  ledger_claims=3), exit 0.
- `validate-final.cjs --tamper-test` (injects one unbound sentence
  "This sentence was never in any claim ledger." with a fake claim_id) →
  **VALIDATOR_FAIL** `[SCENE_CLAIM_UNKNOWN] scene 999 claim_id not in ledger:
  claim:FAKE`, exit 1. The negative control proves the validator is not vacuous.
- Supporting stages all green on the fixture: build-ledger (3 rows),
  script-gate (6/6 sentences verbatim + bound), verbatim TTS (6 MP3s, Meta AI
  Smooth voice), timestamps (sentence boundaries MEASURED via ffprobe,
  total 14.888s; word boundaries ESTIMATED proportionally, flagged
  estimated:true), gen-scenes (460 frames @30fps, 1280x720).

## Known coverage boundary (honest)
The validator proves the *input text* of every frame and every narration track
is verbatim-bound. It does not speech-to-text the rendered audio to confirm the
TTS engine pronounced the verbatim sentence (TTS output fidelity is trusted to
the provider; a back-check is possible future work, not built here). It also
does not OCR the MP4; the MP4 is a deterministic function of scenes.json +
audio through the Remotion renderer.

## Pending (blocked on Pig reachability, 2026-09-30 ~16:15-16:30 MDT blackout)
Run the identical pipeline on the Pig against the REAL ledger
(`SELECT payload FROM ping_events WHERE event_type='CLAIM_CREATED'
ORDER BY created_at DESC LIMIT 5` via `docker exec ping-gateway`),
render the real MP4, and re-run the validator for the real PASS/FAIL verdict.
All Pig-side scripts are staged at `/tmp/remotion-poc/` (sandbox originals);
only the claim query + npm install + render + validate remain.
