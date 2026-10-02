# WORLD-SHARD-0 LOG

## 2026-09-23 ~20:12 MDT: task received
WORLD missions, indices 0-499. Read MISSION-PROTOCOL.md fully before acting. Read ~/workspace/AGENTS.md (Oracle SSH note; later update added Pig SSH transport quoting rule: stdin-fed scripts via wsl-run.sh already comply).

## Decisions at 80%+

- Repo access read-only via wsl-run.sh; never touch the 90+ dirty files, never commit, never stash. Patches (if warranted) go to missions/patches/ as checked patch files. None warranted this shard.
- One tsx harness invocation for all 500 worlds; RESULT lines stream on stdout, appended locally to results.jsonl incrementally. Progress on stderr. Rerunnable over [START, END) ranges.
- RENDER = repo's real pipeline: generateSiteSpec -> validateSiteSpec -> buildRenderContext -> SitePageView via react-dom/server renderToStaticMarkup -> full HTML doc with viewport meta. No live browser. Verify asserts on the HTML string per protocol.
- Outcome severity order: CRASH > ACQUISITION_FAILED > UNSAFE_SOURCE > NEEDS_REVIEW > UNSUPPORTED > EVIDENCE_CONFLICT > IDENTITY_AMBIGUOUS > GENERATED_WITH_WARNINGS > GENERATED. By-design hostile outcomes (EVIDENCE_CONFLICT etc.) are typed results, not defects.
- Owner hide-object targets a uniformly random public object (business included): hiding the business exercises the ownerless explore-page path genuinely (~13 worlds).
- Correct-fact always corrects phone (the only field in the OwnerFieldCorrection union present on every world); correction records carry the full required shape (correctedAt, actorLabel, basis).

## Obstacles and fixes

1. Local /tmp full (512M tmpfs, 85%): kept all scratch in the shard dir, ran Pig-side temp files via heredoc in wsl-run.sh scripts.
2. tsx + CSS modules: renderer chain imports .css; patched require.extensions in the harness entry. Also set globalThis.React (repo tsconfig uses automatic JSX runtime; tsx classic transform needs React in scope) and required react/react-dom by absolute path (entry lives in /tmp, node resolution starts there).
3. Transient dirty-tree breakage: registry.ts briefly imported nonexistent ./schema-roles (another lane mid-edit); the first 0-10 probe failed, a retry minutes later passed. Noted, not patched (another lane's authority).
4. Harness bug 1: malformed OwnerFieldCorrection crashed render (renderer reads correction.correctedAt.slice). Fixed harness to emit complete records.
5. Harness bug 2: correction verification compared raw digit strings against formatted HTML ("1555019001" vs "+1-555-019001"). Fixed to compare digit-normalized tel: hrefs; source value may legitimately appear in the evidence badge (SOURCE SAYS X / OWNER SAYS Y never collapsed), so the assert is tel:-link-only.
6. Harness bug 3 (false generic class): hidden-object-leaked x13 was my builder embedding the business name in post titles/descriptions. Fixed builder, reran full shard: 13 -> 0. Classification falsified. See SUMMARY.md improve-once section.

## Saturation

Pre-run: load 2.56 / 24 cores. No waits. Peak RSS 161 MB. No throttling needed.

## Post-shard (factory never idles)

Shard 0 done: 500/500, zero repo defects. Per task orders, taking next unclaimed shard: shard-4 (indices 2000-2499) is unclaimed (shard-1/2/3/5 exist). Claiming shard-4 next; its address space covers hostiles unsafe-urls, rtl-text, franchise-lookalike ((2000//192)%10=0 -> no-jsonld? compute: 2000//192=10, 10%10=0 -> no-jsonld; 2112//192=11 -> conflicting-hours; 2304//192=12 -> many-services; 2496//192=13 -> unsafe-urls for i%4==0 subset). The same harness covers it; only the index range changes.
