# PING Social: Client Reporting Template (Q7)

Decision-first metrics. Fill these BEFORE any pilot starts so every experiment
has its falsification numbers ready. No template, no pilot.

## Per reporting period (weekly during pilots, monthly in steady state)

| Metric | Value | Source | Notes |
|---|---|---|---|
| Total inbound calls | | Quo call log | split business-hours / after-hours |
| Missed calls | | Quo call log | |
| Missed calls answered by text-back | | Quo auto-reply log | Q1 mechanism |
| Missed-call -> conversation rate | | conversations / missed calls | Q1 falsification metric |
| Conversations started | | Quo SMS threads | |
| Booked jobs from speed-to-lead | | client job records | Q1 booking lift vs pre-period |
| Review requests sent | | ledger | Q3 mechanism |
| Reviews gained (period) | | GBP | Q3 falsification metric |
| Average rating (period end) | | GBP | |
| Referral asks sent | | ledger | Q6, combined with Q3 touch |
| Referrals received | | client records | |
| Reactivation messages sent | | ledger | Q5 mechanism |
| Reactivated bookings | | client job records | Q5 falsification metric |
| Estimated revenue influenced | | client records | never invented; mark UNKNOWN when unverifiable |

## Pre-period baseline (fill before the pilot)

Same metrics for the equivalent pre-pilot window. The pilot is judged on
DELTA vs baseline, not on absolute numbers.

## Decision the report must answer

"Should this capability stay on, be fixed, or be killed?" If the report
cannot answer that, it is collecting vanity metrics. Kill threshold for
each experiment lives in `arbitrage-queue.md`; the report exists to check
it.

## Rules

- Known vs inferred vs unknown applies to revenue claims. An influenced
  dollar is INFERRED at best; mark it so.
- Customer annoyance reports and any compliance/policy event are red rows:
  they pause the pilot regardless of the numbers.
- One page. If it does not fit on one page, it is not a report, it is a
  dashboard. (See: the Marketing Circus.)
