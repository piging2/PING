# Escaped likes: FB pass 173 (2026-10-01)

Two ineligible likes escaped before the operator killed the worker. They are
preserved here as actual outcomes per the CEO order. They are not reversed.

## Like 1

- Post: https://facebook.com/groups/2803047646497352/permalink/4090528661082571/
- Descriptor: CO BizNet: WATER EXTRACTION IS WHERE RESTORATION STARTS
- Intent: d779cc7028d044cab31ce62f6f131d0e (pass fb-20261001-052817)
- Observation: 2026-10-01T05:35:51.920209+00:00, terminal EXECUTED
- Why it was ineligible: nameless CO BizNet promo (thin no-name fail-closed
  precedent); group is statewide, not corridor-local.
- New authority verdict on replay: INELIGIBLE [OUTSIDE_CORRIDOR, THIN_NO_NAME].

## Like 2

- Post: https://facebook.com/groups/2803047646497352/permalink/4090481474420623/
- Descriptor: CO BizNet: We prefer building our fences in a 3 phase
- Business: Litto's Fencing (www.littosfencing.com, 720-461-4790,
  facebook page @[100078208931038:2048:Litto's Fencing])
- Intent: e0df416b010d4b67bf57431dd3da238f (pass fb-20261001-052817)
- Observation: 2026-10-01T05:35:51.944184+00:00, terminal EXECUTED
- Why it was ineligible: CO BizNet statewide group; Litto's Fencing is a
  Denver-metro business (verified out-of-corridor, pass-170/172).
- New authority verdict on replay: INELIGIBLE [OUTSIDE_CORRIDOR].

## Reversal assessment

The facebook-cli skill exposes no unlike/retract capability; reversal would
require driving the Pig browser worker to click "unlike" on the two posts,
which is a new external effect Nolan has not authorized. Recommendation: do
not reverse. The likes are ordinary, non-spammy likes on real business posts;
the harm was a policy violation (engaging outside the corridor from an
ineligible pool), not a harmful contact. Both post IDs are now in the engaged
history, so the never-re-engage rule prevents any repeat engagement, and both
are covered by the new eligibility data (CO BizNet -> out; Litto's Fencing ->
out-of-corridor business). Reversing would also rewrite the incident record
the replay and audit depend on. Leave the record intact.

## The 31 that did not escape

31 intents from the same pass remain open in EXECUTION and were never
attempted. They are not re-dispatched; the next pass's refuse filter closes
them as UNKNOWN_EXECUTION (fail closed, per the orphan model). No re-dispatch:
re-dispatching would double-engage and fight the ledger.
