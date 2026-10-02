# FALSIFIER REPORT — FYD x PING daily harvest pass, 2026-09-26

RESEARCH ONLY. No PING/FYD writes, no branches, no commits, no pushes.
Method: read-only `cat`/`grep`/`git log` via Pig WSL; single-request curl re-fetches with a normal Chrome UA; GitHub API for candidate pins. Two live-browser fetches total (einpresswire article, amicomechanical.com); Trafilatura/extruct were NOT re-run (the researcher's offline runs were not independently re-executed; their outputs were not challenged beyond the page re-fetch).

## 0. Checkout ground truth (first job)

Three researchers read three different checkouts. Verified live 2026-09-26:

| Checkout | HEAD | Branch / state | Working tree | Researcher |
|---|---|---|---|---|
| /home/nolan/projects/ping | `c93a7ced` | `fyd/sprint-integration-2026-09-24` | clean (untracked build/media artifacts only) | vein 1 |
| /home/nolan/fyd-wave2-clean | `e48ef710` | DETACHED HEAD | clean (untracked node_modules only) | vein 7 |
| /home/nolan/ping | `73d06b03c` | `feature/orca-reaper-hold` | 1 tracked modification: `tools/fyd-site-projection/emit-overlay.py` (+77 lines) | veins 5+6 |

Remote check: /home/nolan/projects/ping = `git@github.com:piging2/fyd.git` (FYD app repo); /home/nolan/ping = `https://github.com/ngesk2/crx-runtime.git` (PING/CRX runtime repo). These are genuinely different repos for different lanes, so veins 5+6 reading /home/nolan/ping is appropriate (constitutional/kernel authorities live there). The researcher's provenance note said "origin github.com/piging2/PING" — the actual origin string is `ngesk2/crx-runtime`; same checkout, slightly wrong origin label. Not material.

**Material divergence:** /home/nolan/fyd-wave2-clean (e48ef710) is STALE for the FYD lane. `git merge-base --is-ancestor 3dfa164d e48ef710` returns false: the detached checkout does NOT contain commit 3dfa164d (2026-09-24 19:02 MDT, "UNIT-3-Ask-FYD-fail-closed-conflict-plus-hide-traversal-FYD-Q1-Q2") or the 2026-09-25 ask work (00fc3813). Any claim about `src/fyd/ask` or `src/fyd/object` read from e48ef710 must be re-checked against the integration branch before entering the pass report. Claim 5 below is the casualty.

**Audit-freshness re-verified:** vein 1's "no changes since 2026-09-25" on `src/fyd/acquisition/` is accurate (newest commits 1bfff543 and ae1002ad are both dated 2026-09-25). Vein 7's "zero commits since 2026-09-25 on ask paths" holds on the checkout they read (fyd-wave2-clean). Veins 5+6's "no contract/canonical changes since 2026-09-25" on `runtime/constitutional/src`, `runtime/kernel/replay`, `runtime/authorities` is accurate.

---

## Claim 1 — VEIN 1 Q5 (L2 beats L1)

### 1(a) L2 seam still only a typed policy note — CONFIRMED
`src/fyd/acquisition/acquisition-adapter.ts` (c93a7ced) is types-only; L2 appears as the contract level "bounded browser-rendered fallback (only on typed L1 insufficiency)". `static-adapter.ts:17-22,277-279` records the typed policy note verbatim ("L2 browser-rendered fallback is NOT implemented in this build; the Crawl4AI adapter seam is reserved for it ... integration needs a named gap + Nolan's go"). No L2 implementation exists.

### 1(b) prideplumbingphc.com delta — EVASION ARTIFACT, must be EXCLUDED (verdict: REFUTED as a legitimate win)
The researcher's own design doc kills this claim. `ACQUISITION-STACK.md` L2 section, "Anti-bot behavior: detect and report blocks honestly; **never escalate with proxies or stealth profiles. A blocked page is evidence of a block, not a problem to route around.**" The 01 delta was obtained by routing around a Cloudflare 403 (bot-UA block) through Nolan's persistent logged-in house Chrome profile — a real browser with the user's cookies and residential-IP reputation. That is exactly a "stealth profile" escalation. The platform automation principle is the same law in different words: "a detected restriction becomes BLOCKED, never an optimization problem." A Cloudflare bot-fight 403 is a detected restriction.

Additional disqualifier: the delta is not even JS-escalation. The researcher's own mechanism note admits "the 01 delta is bot-block evasion by a real browser, not JS execution (the page is server-rendered)." The Q5 justification for a *JS-rendering* fallback cannot rest on a bot-block bypass.

Implication for the writer gate: the Q5 count drops from "2 of 11 rescued" to **"1 of 11 rescued"** (bergernelsonconstruction only). The "8/11 byte-identical metadata" finding stands. The 04 case (both blocked) is correct fail-closed behavior per the design doc, not a rescue gap. The honest pass-report line: L2's demonstrated corpus value is one genuine JS-redirect rescue (582 chars of thin content), at 3.6-6.5 s/page vs L1's 0.4-2.5 s/page. Whether that earns the integration is the writer gate's call, but it must be decided on the 1-of-11 number, not 2-of-11.

### 1(c) bergernelsonconstruction JS-redirect stub — CONFIRMED as in-class (legitimate L2-class win)
The design doc names the trigger classes explicitly: `EMPTY_BODY_AFTER_JS`, `CONTENT_BEHIND_CLIENT_RENDER`, `SHADOW_DOM_CONTENT`. A 114-byte `window.onload -> /lander` stub that yields zero extractable facts at L1 is `EMPTY_BODY_AFTER_JS` nearly verbatim, and the contract requires observations be "Never silently empty". L1's existing machinery handles HTTP redirects (safeFetch maxRedirects) but has zero JS/meta-refresh handling (no matches for window.location, meta-refresh, or JS-redirect anywhere in `src/fyd/acquisition/`). A static regex target-extraction would be possible for this specific stub, but the design doc's L1 contract is "Deterministic parse, no browser, no JavaScript" — JS-redirect following is deliberately L2's job. The 03 delta stands as the one legitimate Q5 data point, with the caveat that the rescued content is minimal (582 chars).

---

## Claim 2 — Trafilatura defect proof

### Re-fetch numbers — CONFIRMED
Single curl, normal UA, 2026-09-26: `https://www.einpresswire.com/article/911408780/...` returns 117,723 bytes of raw HTML; naive tag-strip = 11,657 chars (researcher: 117,694 / 11,657). All six probe facts verified present in the fetched HTML: headline ("Expands Commercial Plumbing"), "trenchless pipe relining", "Pride Plumbing", "Grand Junction", "815-569-5291", "info@prideplumbingphc.com". Boilerplate pollution verified ("Privacy Policy" present in stripped text). The researcher's numbers are accurate to the byte.

### "Noise passed to UNDERSTAND is a REAL defect" — WEAKENED
The current UNDERSTAND stage is `parseRich` in `live-loop.ts:414-435`, and it is fully deterministic: `extractStructuredData` (JSON-LD regex + jsonld library), `extractMetaTags`, `extractTitle`, `extractServiceCards` (pattern-based Elementor/estimate-card detectors). Grep for llm/anthropic/openai/claude in `proceduralizer.ts` returns zero hits. No LLM exists in the acquisition→UNDERSTAND path; there is no token budget, no cost-per-token, and no noise-sensitivity mechanism that boilerplate could measurably harm. The deterministic extractors do not consume free body text as facts, so boilerplate nav/footer text cannot inject false facts through this stage (only the pattern-gated service-card detectors sweep body HTML, and they are threshold-gated per the file's own design contract).

Implication for the writer gate: the defect is real as *wasted evidence bytes* (117k stored and hashed per article page) and as a *future* defect (the contract's L4 "AI interpretation" stage, when built, would receive noisy observations — and the contract says "AI operates on the acquired observations only"). But as framed — noise measurably harming UNDERSTAND today — the mechanism does not exist in the current build. A Trafilatura harvest would need to name the actual consumer (L4, unbuilt) or the actual present harm (evidence bloat) to pass writer-gate Q1 (concrete failure). Until then it is BACKLOG with confirmed measurements, not a proven live defect.

---

## Claim 3 — extruct defect proof — CONFIRMED
Single curl re-fetch of `https://www.amicomechanical.com/`, 2026-09-26: zero `application/ld+json` blocks; a live `schema.org/LocalBusiness` microdata record verified in the HTML with name "Amico Plumbing & Mechanical Inc.", streetAddress "595 N. Westgate Drive", addressLocality "Grand Junction", addressRegion "Colorado", postalCode "81505", telephone "970-241-6258" — exactly the record the researcher claimed. PING's `src/fyd/proceduralize/structured-data.ts` (670 LOC) is verified JSON-LD-only: `discoverStructuredData` (line 74) extracts exclusively `<script type="application/ld+json">` blocks via regex; no microdata/RDFa/itemscope parsing exists anywhere in the file. The typed LocalBusiness name/address/telephone facts are therefore genuinely unobtainable through the current structured-data stage. (The researcher's precision note is also accurate: the phone exists only as unstructured prose in `og:description`.)

Implication for the writer gate: this is the cleanest of the three donor justifications — a named page, a named record, a named missing syntax, zero facts obtained today. Proceeds to the remaining 11 gate questions.

---

## Claim 4 — VEIN 7 BM25S gap (predicate-priority ordering) — CONFIRMED
Read `selectRelatedCircles` in full on the Pig:
- (a) Predicate-priority ordering CONFIRMED: `PREDICATE_PRIORITY = {located_at: 0, provides: 1, works_for: 2, links_to: 3}`, final sort `predicateRank(a.predicate) - predicateRank(b.predicate) || objectId` tiebreak. Deterministic BFS both directions over active edges, public-only.
- (b) Cap-8 truncation CONFIRMED: `ASK_LIMITS.maxRelated = 8` (`ask-composer.ts:33`), applied as `relatedObjects.slice(0, 8)` at `ask-composer.ts:196`. Note the truncation happens downstream in `buildAskContext`, not inside `selectRelatedCircles` (called without a limit at `visitor-answer.ts:364`) — same net effect.
- (c) No question-relevance signal CONFIRMED: neither `selectRelatedCircles(graph, ownerObjectId, opts)` nor the slice takes the question; ordering is purely structural.

The gap is REAL. Thought experiment: a plumbing business has 9+ services as `provides` edges plus one `links_to` "emergency sewer repair financing" page. A visitor asks "do you offer financing for emergency sewer repair?": the financing object sorts last (rank 3, high objectId), is cut by the 8-cap, and the composer never sees it — so it refuses or answers from less-relevant objects, even though the evidence existed in the authorized graph.

Implication for the writer gate: the mechanism claim (deterministic term-overlap rerank before the 8-cap) survives falsification. Q1 remains UNKNOWN: the researcher has not yet demonstrated the failure on a real question/fixture. That is the next research step, not a patch.

---

## Claim 5 — publicGraphOf [] / composeObjectView bypass — PARTIALLY REFUTED (stale checkout; HOLD record needs updating)
On the researcher's checkout (fyd-wave2-clean, e48ef710): `publicGraphOf` at `visitor-answer.ts:184` does `applyFieldVisibility(graph, [])` — the claim is true *there*.

On the actual current FYD HEAD (c93a7ced, branch fyd/sprint-integration-2026-09-24): `publicGraphOf(graph, decisions: FieldVisibilityDecision[], conflicts: AskFieldConflict[])` takes real decisions (`applyFieldVisibility(graph, decisions)`), plus `applyHideTraversal` (FYD-Q2) and `suppressConflictedFields` (FYD-Q1). The call site passes `input.fieldVisibilityDecisions ?? []` (visitor-answer.ts:623-626). The fix is commit 3dfa164d, dated **2026-09-24 19:02 MDT — before the 2026-09-25 flag was raised**. The flag was raised against a checkout that did not contain the fix.

The second half stands: `composeObjectView` in `src/fyd/object/view.ts` still has zero `applyFieldVisibility` calls on current HEAD — fields are read directly from the raw object. The bypass half is still live.

Implication for the writer gate: the HOLD record as stated ("publicGraphOf hardcodes [] decisions ... on HOLD") is half-stale. Correct status: publicGraphOf [] hardcode FIXED 2026-09-24 (not on HOLD); composeObjectView bypass STILL LIVE (still on HOLD). The pass report must not carry the "hardcodes []" claim forward as current. This is a checkout-divergence casualty, not researcher dishonesty — the fix landed between the flag and the audit, on a branch the auditor wasn't reading.

---

## Claim 6 — "no Qdrant, no BM25, no rerank, no LLM in the ask path" — CONFIRMED
Fresh greps on the current integration branch ask surface (`src/fyd/ask/`, `src/fyd/object/`, `src/lib/ping/ask-composer.ts`): zero hits for qdrant/Qdrant, zero for bm25/BM25, zero for rerank. LLM-term hits: exactly two, both comments in `context-compiler.ts` ("contentBoundary string for LLM consumers", "Untrusted-data marker for LLM consumers") — the ask path *compiles context for* downstream LLM consumers; it does not invoke one. The ~2,287 LOC ask surface is deterministic end to end, consistent with the researcher's finding.

---

## Claim 7 — Veins 5+6 falsifier handoffs

### 7(a) Python CanonicalHashAuthority `default=str` set nondeterminism — DOCUMENTED CONSTRAINT (mechanism PROVEN real)
Empirically proven on the Pig: two processes, `PYTHONHASHSEED=1` vs `PYTHONHASHSEED=42`, hashing `{"set": {"a","b","c"}}` via the exact `json.dumps(..., sort_keys=True, ensure_ascii=True, default=str)` call produce `{"set": "{'a', 'b', 'c'}"}` vs `{"set": "{'c', 'a', 'b'}"}` — different bytes, different SHA-256. `default=str` is invoked on sets (not JSON-serializable), and `str(set)` order is hash-randomization dependent. Additionally, `sort_keys=True` uses code-point order while the TS canonicalizers use UTF-16 order — they disagree on supplementary-plane characters, so cross-language hash agreement fails even where both sides could agree.

BUT: zero production callers of `hash_json(`/`hash_dict(` exist anywhere in the Python tree. The footgun is proven, the blast radius is currently zero. Bonus finding: the module docstring claims "No worker or tool calls hashlib.sha256() directly" — `runtime/authorities/identity_authority.py:108` calls `hashlib.sha256(os.urandom(8))` directly. The docstring is false.

### 7(b) HashAuthority.canonicalizeObject lacks circular-ref/depth guard — REAL DEFECT (latent)
Confirmed in code: `canonicalizeObject` recurses with no visited set and no depth guard, unlike `CanonicalJson.canonicalizeValue` which has both (`MAX_NESTING_DEPTH=64`, visited set, circular rejected). Public `any`-typed surfaces reach it directly: `PingIdentity.canonicalBytes(value: any)` (ping-identity.ts:56-58) and `computeContentHash(data: any)` (ping-object-kernel.ts:82-84). A circular input deterministically stack-overflows — a crash vector, not a subtlety. No evidence of circular inputs being passed today, so no live incident; the defect is latent. Real defect, bounded fix (adopt the visited/depth pattern already proven in CanonicalJson), no writer authorized in this pass.

### 7(c) CertificateAuthority vs HashAuthority "sole authority" collision — DOCUMENTED CONSTRAINT
Both claim sole authority in comments: `certificate_authority.ts:114` ("Constitutional rule: This is the sole SHA-256 authority") and `hash-authority.ts` ("No direct crypto usage outside this authority", "SINGLE canonical serializer authority"). Both have live callers in different subsystems: CertificateAuthority.sha256 ← merkle_tree.ts (x2), postgres_event_store.ts, commit_controller.ts, identity_engine.ts; HashAuthority.hash/hashCanonical ← ping-object-kernel.ts, identity-authority.ts (x3), ping-identity.ts. This is a genuine sovereignty-claim collision, but not a digest collision: both compute SHA-256 (one via node:crypto, one via a pure-TS FIPS 180-4 implementation), so digests agree, and the jurisdictions are quarantined with no cross-boundary data flow — the same honest-quarantine the veins56 researcher already documented. The risk is future, not present: a second algorithm added to one authority, or an edge-case divergence between the two SHA-256 implementations, would split hashes silently. DOCUMENTED CONSTRAINT, not a live defect. No Rule-of-One survivor pick is warranted without a cross-boundary consumer.

---

## Claim 8 — Candidate SHA/license verification (GitHub API, 2026-09-26)

| Candidate | SHA | Commits API | License endpoint | Verdict |
|---|---|---|---|---|
| LightRAG HKUDS/LightRAG | `453dce83d6d0354a06e46c8d4029a0895c4e054b` | real commit, 2026-09-26T08:33:35Z | MIT | VERIFIED |
| Qdrant qdrant/qdrant | `6ab21cac18ebb6f4ae29102c7f8f5cc11affd5de` | real commit, 2026-09-03 | Apache-2.0 | VERIFIED |
| BM25S xhluca/bm25s | `e21ca718464054fbdaf5ce51160399e496f878f4` | real commit, 2026-09-18 | MIT | VERIFIED (license correction from Apache-2.0 confirmed) |
| ATProto bluesky-social/atproto | `7a857989751ae31518509d69ab7194a922064f3d` | real commit, 2026-09-25T17:45:47Z (matches researcher's date exactly) | NOASSERTION ("Other") | SHA VERIFIED; license endpoint does NOT confirm the dual MIT/Apache-2.0 claim — that rests on candidates.json, not on endpoint evidence |

Branch membership (main/master) was not re-verified; the commits API confirms existence, not branch-tip status. No SHA was invented; all four resolve.

---

## Writer-gate implications (summary)

1. **L2/Playwright justification:** corrected to 1-of-11 genuine wins (bergernelsonconstruction, `EMPTY_BODY_AFTER_JS`); the prideplumbingphc.com delta is excluded as a prohibited bot-block bypass. The Q5 answer is "narrowly yes" on an honest count, and the 04 case is correct fail-closed behavior.
2. **Trafilatura:** measurements confirmed, defect reframed to evidence-bloat + future-L4. Needs a named present consumer or harm to pass Q1.
3. **extruct:** fully confirmed; proceeds to remaining gate questions.
4. **BM25S:** mechanism confirmed real with a concrete failure scenario sketched; still needs a real-question/fixture defect proof for Q1.
5. **HOLD record correction:** publicGraphOf [] is fixed (2026-09-24); only the composeObjectView bypass remains on HOLD. Do not carry the stale half forward.
6. **Negative claim:** confirmed; the ask path remains LLM-free (context compiled *for* LLM consumers, none invoked).
7. **(a)** documented constraint with proof; **(b)** real latent defect (circular-ref crash vector); **(c)** documented constraint. No cross-boundary incident anywhere.
8. **All candidate pins verified**; BM25S license correction (MIT) independently confirmed; ATProto license claim is endpoint-unverified.

**Process note for the parent:** the vein 7 researcher should re-run the ask-surface audit against `/home/nolan/projects/ping` (branch `fyd/sprint-integration-2026-09-24`, HEAD `c93a7ced`) rather than the detached `~/fyd-wave2-clean` checkout before any claim about `src/fyd/ask` or `src/fyd/object` enters the pass report. The divergence already produced one stale defect restatement (claim 5).
