# Self-audit 2026-10-02: collision guard name-match is a hypothesis, not a verdict

## Production evidence (this pass)
- check-prospect-collision.py fired on "Miller Concrete" for the d-segment-deep-dive candidate (Delta, 970-712-8492, phone-only, 19337 F Rd).
- The existing pipeline row with that exact name is a DIFFERENT business: "Miller Concrete | Montrose | colorado-concrete-polishing.com; 970-497-6473" (concrete polishing, Montrose).
- A naive name-match drop would have silently discarded a qualified Delta prospect; a naive merge would have corrupted the Montrose row.
- Same pattern prior pass (2026-09-30 d distill): "Precise Lee Fences & Security" name-hit resolved as same business as "Precise Lee Fences"; "Alpine Fencing & Supplies" resolved as same as existing SENT row. Resolution went both directions by evidence.

## Invariant (SPECIFY)
On a guard name-hit, the name match is a HYPOTHESIS, never a verdict. Before staging or dropping, resolve identity with at least two of (trade, city, phone, website, SOS address). If the evidence distinguishes them, stage the new row with a "(Town)" disambiguator suffix plus a dedupe note naming the differing business; if the evidence conflates them, enrich the existing row or leave it. Never silently drop a qualified candidate on a bare name match.

## Status
SPECIFY done here. TEST (unit cases in check-prospect-collision.py test suite) and AUTOMATE (guard emits near-miss-vs-match classification) deferred to a dev lane; no machinery changed this pass.
