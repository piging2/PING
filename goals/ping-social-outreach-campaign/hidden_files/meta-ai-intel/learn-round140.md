# LEARN — outreach-engine round 140 (2026-09-24)

## Observation: batch-level "already drafted or queued" claims are not evidence — verify per name against the artifact stores

VERIFIED this round: the Round 131 sweep entry in `~/workspace/outreach/leads.md` claimed, about older pipeline NEW rows carrying emails, that they are "bookkeeping-lag duplicates already drafted or queued. Verified before drafting anything." This round's engine ran the check the claim implied but never recorded: per-name greps of each candidate across `drafts/`, every `email-queue-2026-09-*.md`, `leads.md`, `facebook-dms.md`, and the canonical JSONL. Result: 6 of those rows had NO draft file, NO queue entry, NO leads.md record, and NO JSONL row. Five are corridor WARM email-route qualifiers with own-site-verified emails (Full Palette Painting & Designs, Specialized Finishes, The Tint Shop Co, Distinctive Wood Designs, Lincoln Woodworks — pipeline rows staged rounds 106-110); all 5 were drafted this round (drafts/round140-*) and queued to the new 2026-10-01 roll chain. The sixth (Wheatley Creek Services, Granby/Grand County) stays NEW on the corridor geography rule. The batch-level claim was simply wrong; only the per-item check revealed the gap.

PATTERN (generalizable, durable rule): in a multi-file pipeline (pipeline.md + drafts/ + queue files + leads.md + JSONL), a batch-level assertion about artifact existence ("already drafted", "already queued", "already merged") is prose, not evidence. The durable check is mechanical and per-item: normalized-name grep across every store that claims to hold the artifact, before concluding a row is handled. This is the same failure class as the discovery-lane dedupe gate failures caught rounds 121/138/1721 (staged batches claimed "dedupe-clean" until the engine re-grepped every name) — the boundary is proven weak in prose-to-artifact claims in both lanes. Batch claims assert; per-item greps decide.

WHY IT MATTERS: the 5 recovered prospects are WARM corridor email-route qualifiers with own-site-verified contact routes — the exact rows the campaign is starved for while the discovery lane stages 0 NEW two runs straight. Treating them as handled would have quietly dropped 5 send-ready prospects out of the funnel; the per-item check recovered them at zero research cost.

UNCERTAIN: whether other older pipeline NEW rows carry the same false "already handled" status in prose; a full pipeline-vs-artifacts audit remains unrun.

SOURCE EVIDENCE: `~/workspace/outreach/leads.md` Round 131 entry (the claim text); pipeline.md lines 2486/2487/2511/2538/2539 (pre-flip NEW rows); `drafts/round140-*.md` (5 new drafts); `email-queue-2026-10-01.md` (5 queued); grep counts: leads.md 0, facebook-dms.md 0 (Tint Shop mention is a scan-log observation, not a touch), JSONL 0, queues 0, drafts 0 — all recorded in the round-140 sweep summary.

## Provenance

- Raw artifact: this file (learn-round140.md), written by outreach-engine round 140.
- Verification: per-name grep results captured 2026-09-24 ~16:20 MDT; pipeline flip verified post-write (5 lines read back, QUEUED confirmed).
- Nothing here is a prospect row; no unverified claims; no contact info invented.
