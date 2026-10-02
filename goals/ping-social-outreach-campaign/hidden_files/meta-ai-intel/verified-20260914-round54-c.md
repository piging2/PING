# Meta AI ingest verification — Round 54, c-review-complaint-signals
File: `20260914-210437-c-review-complaint-signals.md` (job 20260914-210437-c)
Ingest time: 2026-09-14 ~17:15 MDT
File check: REAL ANSWER (10 numbered businesses, ~11k chars). Prompt-injection scan: clean, no instructions followed; all content treated as data.

## Duplicate exclusions (leads.md / pipeline.md / canonical JSONL / archive)
- Rescue 1 Plumbing (GJ) — pipeline dup; also on this pass's negative-signal list. EXCLUDE.
- Peterson Plumbing, Heating, Cooling & Drain (GJ) — leads + pipeline dup. EXCLUDE.
- Falcon Plumbing & Heating (GJ) — leads + pipeline dup. EXCLUDE.
- Snipps Heat and Air (Montrose) — leads + pipeline dup. EXCLUDE.

## Independent verification (web search, 2026-09-14)
| Business | Town | Exists | Review recency | Chain | Verdict |
|---|---|---|---|---|---|
| Ferguson Plumbing Supply | Glenwood Springs | yes | NO EVIDENCE (4.2/5 undated aggregate) | YES (Ferguson Enterprises, 1,300+ locations) | DISCARD — no franchises/chains, ever |
| JDW Inc | Steamboat Springs | yes (Porch, Birdeye, county permit records, Bryant-certified directory; 693 Evans St; local since 1969) | INTEL-ONLY (one communication/voicemail complaint, undated; nothing confirmed within 90d) | no | QUALIFIED as general NEW prospect (review trigger suppressed — recency unconfirmed) |
| Masterworks Mechanical | Craig | yes (own site, Craig Chamber directory, city bid memo; 461 Yampa Ave; local since 1988) | NO EVIDENCE (4.5/5 from 8, undated; no low reviews found) | no | QUALIFIED as general NEW prospect; Meta AI's complaint claim unsupported by visible reviews |
| Plumbing Guy | Durango | yes (Birdeye 4.4/7, 2514 Borrego Dr, (970) 247-7756; no official site found) | INTEL-ONLY (one no-callback review, undated) | no (independent owner-operator) | QUALIFIED as general NEW prospect; no-website is itself an opportunity signal |
| Bishop Plumbing & Heating Inc | Glenwood Springs | yes (own site, BBB A+, 5080 County Rd 154; local since 1965) | INTEL-ONLY (Birdeye 3.5/35; negative review "a few weeks ago" but post date undated) | no | QUALIFIED as general NEW prospect (review trigger suppressed — recency unconfirmed) |
| Cooling's Heating and Air Conditioning | Montrose | yes (own site coolings.rockiesit.com, 942 N Park Ave, (970) 249-3631; 4.7/39) | NO EVIDENCE (no low reviews found) | no | QUALIFIED as general NEW prospect; Meta AI's complaint claim unsupported by visible reviews |

## Summary
- Named: 10 | Excluded as dupes: 4 | Excluded as chain: 1 (Ferguson)
- Verified existing: 5 | Qualified for pipeline NEW (source=meta-ai-intel, tag review-signal): 5
- Confirmed review triggers (dated 2-star-or-fewer or 3-star phone/response within ~7-90d): 0
- All 5 qualified prospects have review signal at most INTEL-ONLY (Birdeye hides post dates in fetched text; the two claimed complaint cases for Masterworks Mechanical and Cooling's showed no visible low reviews at all). No review-triggered outreach is justified from this pass. Suggested follow-up by parent: Google Business Profile review dates via the Pig (headed Chrome) would resolve recency; until then, treat as general prospects.
- Data gap note: no reviewer identities collected or review text quoted, per rules.
