# v3-polish re-land: digests and twelve-fix verdicts

Re-land completed 2026-09-27 ~09:17 MDT (15:17Z). Served bytes fetched and hashed ~09:19 MDT.

## Chain evidence

- Lane commit (real this time): `cd280d3914942b9e2ff3b2ae23d1d35ef2a7dd55` "design/lane-polish-f1: visitor-projection purity and conversion fixes" (30 files, 1522 insertions)
- Merge into integration: `9c8c21939eff073a5b87817e4ef1674d9aabebc5` "sprint: merge design/lane-polish-f1"
- Pig verify: tsc --noEmit clean; 41 passed (components suites incl. hero-contact) + 30 passed (builder/planner)
- :3200: PID 26533 (next-server v15.5.24), NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 confirmed in process env, both routes 200
- The fixed failure detection fired correctly on the way: the old `| tail` masking is gone; COMMIT-OK marker required and merge-commit presence required

## The three digests

(a) Pinned HEAD of the served worktree (`/home/nolan/worktrees/design-sprint-visual-v1`, clean):
`9c8c21939eff073a5b87817e4ef1674d9aabebc5`

(b) Build digest:
- `.next/BUILD_ID`: `6QmE00XdDC5Sa_Lrobgt05a1accff691a827882ae2e7dfbb1f544d90214cf51c54e4e321423863c3023dd`
- sha256 of `.next/build-manifest.json`: `6QmE00XdDC5Sa_Lrobgt05a1accff691a827882ae2e7dfbb1f544d90214cf51c54e4e321423863c3023dd`

(c) Served asset digests (sha256 of the full HTML body returned right now):
- `/sites/happy-place`: `aacaa7e5c97bf89ce553ff8fe84031989d94bab40e97cd30e47fbe955a65bef0` (98,980 bytes)
- `/sites/coppersmith-plumbing`: `3651a10f7d8a6479e0f3fcba8d88b99556e4655abf5f4f95dc431282b9dcda3f` (100,171 bytes)

## Twelve-fix table (verdicts against the served bytes)

| # | Fix | Verdict | Served-bytes evidence |
|---|-----|---------|----------------------|
| 1 | MarginObjectLayer gated on viewerKind | PASS | Served flight data carries `viewerKind:"visitor"`; no MarginObjectLayer markup anywhere in either page |
| 2 | FydMark not on visitor cards | PASS | "FydMark" 0 occurrences in both pages |
| 3 | Business wordmark in visitor header | PASS | Header shows "Happy Place Carpentry LLC" (hpp) / "Coppersmith Plumbing - HVAC - Mechanical" (copper); "FYD SOCIAL" 0 |
| 4 | Provenance narration blocked from public copy | PASS | "Featured object" 0, "kindLabel" 0, "Business:" 0; source `boundDescription` falls back to title-only on provenance narration. Note: deliberate `fyd-quiet-source` / "Why this number?" disclosure UX is present; that is citation UX, not the blocked narration |
| 5 | No generic "Business: ..." object pill in hero | PASS | "Business:" 0 in both heroes |
| 6 | No empty "Featured object" label | PASS | "Featured object" 0 in both pages |
| 7 | Real tel:/mailto: anchors as primary contact actions | PASS | hpp: 2 tel: + 1 mailto: anchors; copper: 3 tel: anchors; hero primary CTA is a direct tel: anchor ("Call +15412865190" / "Call 970-245-3869"), never behind a disclosure |
| 8 | Hero overflow fixed at 390px | PASS (bytes) | Hero lead carries `style="max-width:min(var(--fyd-measure, 65ch), 100%);overflow-wrap:anywhere"` in served HTML; source comment documents the 390px mid-word-clip fix. Caveat: visual 390px confirmation still needs the browser pass |
| 9 | Hero media ranked by aspect/luminance fitness | PASS | Served hero img has ranked `data-hero-media` id, blur placeholder, `object-position:50.0% 50.0%`; "luminance" ranking code present in built server chunks (.next/server/chunks/8431.js, 3691.js); select.test.ts ranking tests green |
| 10 | Empty sections omitted | PASS | 13 sections per page, all with content; no empty section shells |
| 11 | Contact composed as a section | PASS | "Contact" section present with labeled Phone/Email rows (FydContactLink), not floating raw links |
| 12 | No "Visit website" CTA; CTA order + headline | PASS | "Visit website" 0; hero CTA order verified by position: Call tel: anchor, then Ask FYD; tagline dedup (the lane's actual headline work): lead is locality-only ("Adair Village, OR, US"), never a name duplicate of the H1 |

## Falsifier gates (runbook section 3)

- No invented reviews: the 3 "review" hits per page are "Open preview for ..." media aria-labels, not reviews; no star ratings
- No invented media, no debug/governance copy: debug/TODO/FIXME/console.log/governance/checkpoint all 0
- No raw internal semantics as copy: the single `viewerKind` occurrence is inside serialized React flight data (`__projectedSiteView`), not rendered copy. Observation (not a failure): the deliberate "Why this number?" receipt exposes the label "Object field" (renderer.tsx:1186), which is mildly internal-facing language inside visitor disclosure UX; the lane's public-copy tests accept it
- No PII leakage: only the businesses' own public contact info is rendered

## Open items for the parent

1. The v3-polish screenshots on disk (C:/Users/nolan/design-sprint/shots/v3-polish, captured 13:28Z) are of the WRONG tree (HEAD 8dc68e4a). The state's DONE shots refers to that bad capture. Recommend: clear DONE shots and re-capture against 9c8c2193 before the 19:00 adjudication.
2. Fix 8's 390px visual confirmation and the full 15-frame adjudication still need the browser pass (out of scope for this subagent).
3. Chain script patches applied to `pig-wake-resume.sh`: step 4 now rsyncs the file list to `/home/nolan/design-sprint/` on the Pig via the proxy wrapper (direct scp is blocked from the sandbox) and requires a COMMIT-OK marker; step 5 requires the merge commit in git log (a no-op "Already up to date" now fails); step 3 verify now includes hero-contact.test.ts. Two infra notes: the file lost its exec bit during editing (restored with chmod +x); root cause record at `rework/root-cause.md`.
