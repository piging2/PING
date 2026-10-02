# Phase B Distill-Sweep Verification Note
Run: 2026-09-28 21:04 MDT (verification-20260929-2104-phaseB-distill-sweep)
Task: distill-sweep verification worker for `meta-ai-intel-pass`

## Source files processed

1. `20260929-030447-d-segment-deep-dive.md` (chimney segment deep dive, 12 numbered businesses)
2. `20260929-030707-a-weak-website-hunt.md` (weak website hunt, 12 numbered businesses)

Every numbered business was verified independently with web search. Nothing was taken from the captured Meta AI answers at face value.

## Grades

CONFIRMED = independently verified by multiple sources. STRONG INDICATION = corroborated by directory/place records but no primary web presence. WEAK INDICATION = thin or stale evidence. UNKNOWN = no relevant business found or claim disproved.

## File 1: segment deep dive (chimney)

| # | Business | Grade | Verdict |
|---|---|---|---|
| 1 | The Chimney Doctor, Grand Junction | CONFIRMED | Eligible but COLLIDES (already in pipeline.md L619; owner Daniel Freeman, info@chimney.doctor). Do not merge. |
| 2 | Stove Depot and Chimney Works, Grand Junction | CONFIRMED | COLLIDES (canonical JSONL ~ "stove depot & chimney works"; pipeline.md L620). Active business: stovedepotcw.com, 1915 I-70BL GJ, (970) 241-1400, 30+ yrs, NCSG affiliated, carries product brands (not a franchise). Do not merge. |
| 3 | Stove Depot and Chimney Works, Montrose (1246 E Main St, (970) 239-0222) | CONFIRMED | Same brand as #2, second showroom. COLLIDES by brand. Do not merge. |
| 4 | Vent Tech Chimney Sweeps, Grand Junction | CONFIRMED | CLEAR (no collision). Candidate, but blocked by active cap (see cap flag). |
| 5 | Dave's Chimney and Stove Service, Montrose | WEAK INDICATION | EXCLUDED: operating status cannot be confirmed. Active place record at 12461 6450 Rd, Montrose, (970) 249-2993, daveschimneyandstove.com still resolves, but a Meta place record marks the Olathe listing permanently closed, and a 2022 chamberofcommerce review states the owner Dave passed away in winter 2021 and the company may be gone. Already in pipeline.md L2115. Fail closed. |
| 6 | Flue Doctor / Colorado Fireside, Montrose | CONFIRMED (Colorado Fireside); WEAK (Flue Doctor alias) | COLLIDES (both: pipeline.md L1416 and L2911; "shares strip address with pipelined Colorado Fireside"). Do not merge. |
| 7 | Parachute Chimney Sweep Professionals, Parachute | WEAK INDICATION | EXCLUDED: Parachute is outside eligible geography; only a thin Meta place record. |
| 8 | Clean Sweep, Grand Junction | UNKNOWN | EXCLUDED: misclassified. BBB at the stated address shows a construction contractor with alternate name Signature Tennis Courts, not a chimney sweep. |
| 9 | Alices Clean Sweep, Grand Junction | UNKNOWN | EXCLUDED: no relevant local business found. |
| 10 | Inspection Fire LLC, Grand Junction | CONFIRMED | EXCLUDED: B2B/supply-side. Markets chimney-inspection software/forms to chimney professionals, not a consumer home service. Associated with The Chimney Doctor. |
| 11 | Bulldog Chimney Sweeps, Hotchkiss | CONFIRMED | EXCLUDED: Hotchkiss is outside eligible geography. |
| 12 | Country Roads Chimney & Dryer Vent Cleaning (claimed Delta) | CONFIRMED (as Rye CO business) | EXCLUDED: actual location is Rye, Colorado, not Delta; source location claim is false. Outside geography. |

## File 2: weak website hunt

| # | Business | Grade | Verdict |
|---|---|---|---|
| 1 | All Seasons Roofing Ltd, Montrose | CONFIRMED | Eligible but COLLIDES (pipeline.md L729; roofinginmontrose.com, 236 S 3rd St Montrose, veteran owned, independent, placeholder sections on site). Do not merge. |
| 2 | M&R Roofing LLC, Montrose | CONFIRMED | Eligible but COLLIDES (pipeline.md L2903; roofingcontractormontrose.com, 441 S San Juan Ave Montrose). Do not merge. |
| 3 | Cold Canyon Electric, Montrose | CONFIRMED | Eligible but COLLIDES (pipeline.md L2362; coldcanyonelectric.com, 1825 Launa Dr Montrose, (970) 275-9422, independent). Do not merge. |
| 4 | Rocky Mountain Plumbing & Heating, Palisade | STRONG INDICATION | EXCLUDED: already in pipeline (L1243, L2451, L2575 near-miss list); Meta place record flags POSSIBLY TEMPORARILY CLOSED; directory-only, no website. |
| 5 | Pruett Homes LLC, Palisade | CONFIRMED (as custom home builder/GC) | EXCLUDED: COLLIDES (canonical JSONL "pruett homes"). Not a plumbing company; qdexx "Plumber" label is a directory misclassification. Real business is a home builder at 3310 C Rd Palisade, pruetthomes.com. |
| 6 | Atrium Tree Service, Loma | CONFIRMED | Eligible but COLLIDES (pipeline.md L2434; atriumtreeservice.com, CO SOS 20221499788 good standing, 1284 M Rd Loma, operator Zach Hart, independent). Do not merge. |
| 7 | Currier Lawn Care, Loma | WEAK INDICATION | EXCLUDED: fail closed. Only a stale landscape.com listing (est. 2007, 0 reviews, no website); same address/entity (1570 P Rd, Loma) appears in FMCSA records as a trucking company (Currier Lawn Care Inc, DOT 1464170, inactive authority). Evidence too thin. |
| 8 | Valley Grown Nursery, Mack | CONFIRMED | EXCLUDED: supply-side retail nursery (wholesale + retail plant sales, "Western Colorado's largest plant nursery," est 1978), not a home-service trade. Also: business is listed for sale (78 acres, $3,995,000, listed 08/07/2026). |
| 9 | Durgin Electric LLC, Carbondale | CONFIRMED | COLLIDES (canonical JSONL "durgin electric"; pipeline.md L592). Independent, durginelectric.com, 181 N 12th St Carbondale, est 1992. Do not merge. |
| 10 | Mid-Valley Electric (Inc), Carbondale | CONFIRMED | CLEAR (no collision). 33 Escalante Rd, Carbondale, (970) 963-1760, CO license #27567 active, independent local electrical contractor. Candidate, but blocked by active cap (see cap flag). |
| 11 | Reliable Pest Control, Montrose | STRONG INDICATION | EXCLUDED: already in pipeline (L2575, L2887 near-miss/exclusion lists; round-110 fail-closed, directory-only, no website). Additional directory hits do not raise the grade. |
| 12 | Charlie's Pest Control, Montrose | STRONG INDICATION | EXCLUDED: already in pipeline near-miss/exclusion lists (directory-only, no website, fail-closed). 16874 6300 Rd / PO Box 1665 Montrose, (970) 249-3860. |

## Collision guard

Command: `python3 ~/workspace/outreach/check-prospect-collision.py` with 20 names (all eligible candidates plus pipeline-list names).

Result: 13 of 20 names collide with canonical JSONL and/or pipeline.md. Colliding names are listed per-row above; they must NOT be merged as new.

CLEAR (no collision, genuinely new): Vent Tech Chimney Sweeps; Mid-Valley Electric / Mid-Valley Electric Inc.

## Cap decision flag (no canonical mutation)

Canonical state at verification: 306 rows before and after this run, byte-identical, no mutation. Per the standing task constraint the active cap is 300 and is already reached, so the two collision-clear qualified candidates (Vent Tech Chimney Sweeps, Grand Junction; Mid-Valley Electric Inc, Carbondale) were NOT merged: adding them as active would exceed the cap. No rows were archived, no goal-mirror sync was needed (mirror was already identical and untouched).

Decision required by owner/main agent: how to handle the 2 blocked qualified candidates. Options: leave unmerged and revisit when active slots free up; queue them in a standby list; or authorize a cap change. Nothing was done to the canonical file or its mirror in this run.

## Marks

Both source files marked `distilled` via distill-sweep.py after verification completed.

## No outreach

No outreach was performed and no PING observations were emitted in this run.
