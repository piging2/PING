# LANE 3: GITHUB INGESTION + ISSUE TRIAGE
**Status:** READ-ONLY harvest + design. No production wiring. Pig WSL SSH was down (commute window 16:30-17:00 MDT blackout per standing rule; retries not burned). Evidence from local workspace + dated logs only; pig repo `/home/nolan/projects/ping @ 0264d517` not re-verified this pass.

## Governing constraints (owner law, baked in)
- Jev never becomes an authority or canonical truth. Classification may be probabilistic; AUTHORIZATION cannot.
- D0 = deterministic software (same inputs, same outputs, no judgment). D1 = fast bounded Jev judgment (closed contract, typed outputs, confidence, escalation condition). D2 = expensive generative reasoning (open interpretation, only when needed). Human authority = approvals, publishes, closes, deletes.
- Key metric: **System-2 calls avoided without reducing success or safety.**
- Every ingestion observation carries `claimed_*` identity fields (T-05) and `{present, valid, trusted}` signature records against pinned anchors (T-06), never a single "verified" boolean.
- The threat register (`~/workspace/git-ingestion/threats/GIT-INGESTION-THREATS.md`, T-01..T-12) and hard gates 1..10 are preconditions for ANY live wiring. This design does not relax them.

---

## 1. CURRENT INGESTION MAP: what PING ingests from GitHub today

**Short version: there is no live GitHub event ingestion.** What exists is a one-shot deterministic scan pipeline (Patch 7, 2026-09-21) plus design/threat work plus a human-gated observation emission path. GitHub ingestion is formally DEFERRED off the product critical path (FYD audit tech decisions 2026-09-28: "GitHub ingestion deferred (off the correction-loop critical path)").

### Event-type coverage table

| GitHub event type | Ingested today? | Current handler | Deterministic / LLM / nothing |
|---|---|---|---|
| push (commits) | NO | none | nothing. Honest gap (2026-09-24/28): "no commit/tree/blob ingestion, no diff extraction, no canonical event wire" |
| pull_request | NO | none | nothing |
| issues | NO | none | nothing |
| issue_comment / PR comments | NO | none | nothing |
| PR reviews | NO | none | nothing |
| files / diffs / blame | NO | none | nothing |
| workflow runs | NO | none | nothing |
| releases / tags | NO | none | nothing |
| branches / refs | NO | none | nothing |
| docs / tree reads | NO | none | nothing |
| trending-repo SCAN (not a GitHub event; a periodic API pull) | YES, one-shot | GitHubScanner._enrich_with_topics (aiohttp, RateLimiter, exponential-backoff retry in base._request_with_retry) | DETERMINISTIC. `_calculate_relevance` -> score + matched_queries; `_enrich_with_topics` -> repository_id (immutable numeric), observed_commit_sha (pinned), license signal, evidence_level, evidence_sources |
| scan temporal diff | YES | `save_results` / `_compute_temporal_diff` | DETERMINISTIC. Same repository_id + same observed_commit_sha -> UNCHANGED; else NEW_REPOSITORY |
| scan classification | YES | ClassificationEngine.batch_classify (evidence-aware gating) | DETERMINISTIC machinery. Outputs: adoption_tier, architectural_layers, matched_keywords, confidence, reasoning, constitutional_concerns, deprioritized |
| daily brief synthesis | YES, one-shot | DailyBriefingGenerator.generate | DETERMINISTIC render of classified dicts. PROVENANCE BUG documented (see eval 2): scan records lacked GitHub-bearing source_type while the generator gated on `"github" in source_type`, so the Trending Repositories section dropped from real generated briefs |
| research observations -> PING | YES, human-gated | tandem/emit-observation.py -> POST /events OBSERVATION_CREATED | LLM (Meta AI) produces the research, but HUMAN verifies first: fail-closed gates (verified sidecar transition required, semantic-domain gate allowing only learn-<sweep-id> briefs, duplicate-emission guard by sha256, durable fsync spool, probe-before-POST crash recovery). No event reaches PING without an explicit verification transition |

### Where the code lives
- `~/workspace/patch7_real_intake.py` + `~/workspace/test_patch7_temporal_regression.py`: the Patch 7 live intake and its UNCHANGED regression test. The `scanners/` module (GitHubScanner, ClassificationEngine, synthesis.engines) is ABSENT from the local workspace; it ran via the Pig bridge route-around into `~/workspace/fyd-lane/harvest-wave1/` on 2026-09-21 (egress proxy RemoteDisconnected, "no credential regeneration" standing order honored).
- `~/workspace/tandem/emit-observation.py`: the only live path from external research into PING's event spine.
- `~/workspace/git-ingestion/`: design only. `findings/ECOSYSTEM-HARVEST.md` (8 mechanism records, top-5 harvest list, all ADOPT/ADAPT/PATTERN_ONLY verdicts) and `threats/GIT-INGESTION-THREATS.md` (12 threats, global boundary caps, acceptance gauntlet G-01..G-16, 10 hard gates). "Wave A recipe recorded, not built. Lane stays a reader."

### Standing design directive (Nolan, 2026-09-28, ~/memory/2026-09-28.md line 2781)
"Daily Git intelligence belongs on the existing ingestion and durable orchestration planes: pin repository identity and immutable SHAs, fetch only missing content-addressed objects, model repository/commit/tree/file/blob/dependency/test/workflow/release/change relationships, and derive SHA-to-SHA semantic change with evidence. Do not create a special Git scheduler or second ingestion system."

---

## 2. GITHUB INGESTION D0/D1/D2 TABLE

Each row: the judgment, its class, the exact input, the typed output, and the escalation condition. D1 rows are the tournament pool; every D1 output is advisory (recommends, never authorizes).

| # | Judgment | Class | Input | Output | Escalation condition |
|---|---|---|---|---|---|
| J-01 | Ingress authenticity | D0 | raw webhook bytes, X-Hub-Signature-256 header, webhook secret id | ACCEPT (HMAC verified, timing-safe) / REJECT_401 | Any signature mismatch -> fail closed, never enqueue (T-model from ECOSYSTEM-HARVEST record 6) |
| J-02 | Delivery dedupe | D0 | X-GitHub-Delivery UUID, idempotency store | DUPLICATE (200 no-op) / NOVEL | Store unreachable -> hold delivery, never double-process |
| J-03 | Ref snapshot + STALE protocol | D0 | ref set at packet start, ref set at packet end (T-07) | CONSISTENT / STALE (ref-moved-during-ingest) | STALE -> requeue or discard; never emit a mixed packet |
| J-04 | Metadata sanitization | D0 | commit messages, author names, ref names, filenames (T-11) | sanitized typed records (C0/C1 stripped, ANSI neutralized, bidi isolation, length-capped with truncation markers) | Sanitizer exception -> quarantine, never pass raw bytes |
| J-05 | Repo/branch allowlist + noise pre-filter | D0 | repo id, ref name, event type, sender | DROP (not on watchlist) / DROP (bot-noop: dependabot metadata-only, empty push, tag delete) / PASS | Allowlist missing -> DROP (default-deny); watchlist changes are human authority |
| J-06 | Event-type routing | D0 | event type, action | routed stage: COMMIT_PATH / PR_PATH / ISSUE_PATH / RELEASE_PATH / DROP | Unknown event type -> DROP + logged, never guessed |
| J-07 | Temporal dedupe | D0 | repository_id + observed_commit_sha (Patch 7 contract) | UNCHANGED (emit nothing new) / CHANGED | SHA parse failure -> quarantine |
| J-08 | Path-rule impact labeling | D0 | changed file paths vs label-prefix rules (see section 4) | one or more of IDENTITY/EVENTS/CAPABILITIES/EXECUTION/FYD/GATEWAY/PROJECTION/SECURITY/DEPLOYMENT/DOCS_ONLY, with rule ids | conflicting labels or any SECURITY/IDENTITY hit -> escalate to J-11 (D1) |
| J-09 | Deterministic relevance pre-gate | D0 | keyword match on FYD bottleneck queries (Patch 7 `_calculate_relevance` shape) | score + matched_queries; below floor -> DROP | Score within epsilon of floor -> forward to J-10 with flag |
| J-10 | **Jev: relevance to FYD** | D1 | event summary (sanitized, bounded): repo, files touched, message, diffstat | {relevant: RELEVANT_FYD / OPERATIONAL / NOT_RELEVANT, confidence, why_ref (pointer to D0 features), candidate_mission: id-or-none} | confidence < 0.60 -> needs_deeper_analysis; contradiction with plan (J-12) -> escalate |
| J-11 | **Jev: semantic impact classification (uncertain path)** | D1 | changed files + D0 label conflicts + diffstat + commit graph position | {impact_labels: subset of the 10 labels, confidence per label, uncertain_files: [paths]} | any label confidence < 0.60 or SECURITY/IDENTITY/DEPLOYMENT present -> D2 + human review before test selection is trusted |
| J-12 | **Jev: plan contradiction** | D1 | event summary + current plan digest (bounded) | {contradicts: YES/NO/UNCLEAR, what_changed, confidence} | YES with confidence >= 0.70 -> D2 human review (contradicting the plan is never auto-absorbed); UNCLEAR -> needs_deeper_analysis |
| J-13 | **Jev: generated-noise likelihood** | D1 | author claim (claimed_*, never identity), message entropy, diff shape, bot signals | {noise: GENERATED / HUMAN / UNCERTAIN, confidence} | GENERATED with confidence >= 0.80 -> DROP path (no evidence emitted); UNCERTAIN -> keep with flag |
| J-14 | **Jev: security relevance** | D1 | files + message + label hints (auth, secret, sign, crypto, dependency manifest changes) | {security_related: YES/NO, confidence, reason_ref} | YES (any confidence) -> human-authority review queue; Jev never clears a security finding |
| J-15 | **Jev: issue triage classification** | D1 | issue title + body (sanitized) + comments count + labels + age | {dedupe_candidate: id-or-none, subsystem: label-or-UNKNOWN, kind: BUG/FEATURE/SECURITY/QUESTION, urgency: P0..P3/UNKNOWN, likely_stale: bool, customer_facing: bool, needs_architecture: bool, needs_reproduction: bool} | SECURITY kind or urgency P0 -> human queue immediately; subsystem UNKNOWN -> needs_deeper_analysis |
| J-16 | **Jev: needs deeper analysis** | D1 | all prior D0+D1 outputs for the event | {route: EMIT_EVIDENCE / D2_ANALYSIS / HOLD_FOR_HUMAN, confidence} | This is the funnel exit. HOLD_FOR_HUMAN items wait on the owner; D2_ANALYSIS items enter the deep-reasoning queue with a bounded brief |
| J-17 | Normalization + canonical field contract | D0 | classified event | OBSERVATION_CREATED payload with repository_id, owner/name, observed_commit_sha, source/source_type, evidence_level, evidence_sources, license signal, classification labels, confidences (Patch 7 canonical contract) | Schema violation -> BLOCKED, never hand-patched |
| J-18 | Open interpretation / root-cause / architecture judgment | D2 | bounded brief from J-16 | narrative analysis, hypotheses, recommended actions | D2 never writes to PING; its output is a brief for the owner or a mission proposal awaiting approval |
| J-19 | Close/delete repo, authorize fetch, approve mission, publish | HUMAN | exact digest-bound proposal | APPROVE / DENY (H-01 pattern) | Silence never approves |

### Why J-10..J-16 are safe as D1 (classification, never authority)
- Each emits a closed schema with a confidence and a `why_ref` pointing at D0 features. They cannot invent new claims; the evidence envelope is fixed upstream.
- Every D1 output is advisory: the deterministic funnel (J-17/J-19) decides what survives and who acts. This mirrors the existing B-01 classifyReview contract (text -> bucket + confidence; human decides) and the competitive-signal-pass rule (LLM generates candidates; deterministic machinery decides what survives; the skill cannot write to PING).
- Fail-closed defaults: low confidence never drops an item (it queues it), security-relevant never clears, plan contradiction never auto-absorbs.

---

## 3. PIPELINE DESIGN (not built)

```
GITHUB EVENT
  |
  v
STAGE 0 -- D0 INGRESS GATE (J-01..J-04)
  HMAC verify (timing-safe, X-Hub-Signature-256) -> 401 fail closed
  delivery-UUID dedupe -> 200 idempotent no-op on replay
  ref snapshot open; walk objects by OID; ref snapshot close -> STALE or CONSISTENT
  sanitize all repo-controlled strings (ANSI/control/bidi/length)
  |  ECOSYSTEM-HARVEST record 6 (push webhook: before/after OIDs give the exact
  |  commit range; webhooks are lossy hints, so pair with a reconciliation fetch)
  v
STAGE 1 -- D0 DETERMINISTIC FILTERS (J-05..J-09)
  allowlist (repo, ref) default-deny
  event-type router; bot/empty/noop drops
  temporal dedupe: (repository_id, observed_commit_sha) seen -> UNCHANGED, stop
  path-rule impact labels (section 4); claimed_* author fields, no identity binding
  keyword relevance pre-gate (Patch 7 _calculate_relevance shape)
  |  Only surviving, non-duplicate, allowlisted events continue.
  v
STAGE 2 -- D1 JEV RELEVANCE/CLASSIFICATION (J-10..J-16)
  bounded schema in, bounded schema out, confidence per judgment
  J-10 relevance -> J-13 noise -> J-14 security -> J-12 plan contradiction
  J-15 for issues; J-11 for uncertain commit impact
  J-16 funnel exit: EMIT_EVIDENCE / D2_ANALYSIS / HOLD_FOR_HUMAN
  |  Jev NEVER sees raw secrets (none exist in this domain), NEVER sees
  |  PII beyond public GitHub data, and its outputs never mutate state.
  v
STAGE 3 -- D0 NORMALIZATION (J-17)
  canonical field contract (Patch 7): repository_id, owner/name,
  observed_commit_sha, source/source_type, evidence_level, evidence_sources,
  license signal, labels, confidences, claim vocabulary (claimed_author)
  vocab enforced, not translated (social_ingest_adapter.js pattern)
  |  The DailyBriefingGenerator provenance bug (eval 2) is exactly what
  |  this stage prevents: the consumer reads the canonical field location,
  |  never heuristically reconstructs provenance.
  v
STAGE 4 -- D0 PING OBJECTS/EVIDENCE
  OBSERVATION_CREATED via tandem/emit-observation.py seam:
  duplicate-emission guard (sha256), idempotency key, semantic-domain gate
  tenant_id UNKNOWN for system observations (Lane L rule)
  |  Emission is still gated: only verified, authorized-brief observations
  |  reach the spine. Shadow-mode first: emit to drill namespace for eval.
  v
STAGE 5 -- D2 ONLY ON INTERPRETATION NEED (J-18)
  items flagged needs_deeper_analysis get a bounded brief (D0-assembled)
  D2 produces analysis/proposals; proposals are digest-bound; H-01 approval
  is the only path to effect
```

### Volume discipline (the anti-drowning design)
- The funnel is D0-first: expected steady state is that most push events die at J-05/J-07 (not allowlisted, bot noise, UNCHANGED SHA). Jev sees only the residue.
- Webhook lossiness is handled by reconciliation fetch (record 6), not by widening the Jev surface.
- Partial-clone skeleton ingest (ECOSYSTEM-HARVEST top-1: `filter=blob:none`, OID-keyed lazy blob backfill, per-repo byte budgets) bounds the byte cost of any deep read Jev requests.
- Rate-limit state is recorded honestly per run (Patch 7 pattern); secondary limits -> BLOCKED, never retried around.

---

## 4. COMMIT/PR IMPACT CLASSIFICATION DESIGN

**Deterministic core (D0), Jev only for the uncertain residue.**

1. **Changed files (D0):** from the before/after OID range, `git diff-tree --no-commit-id --name-status -r` (exact renames free by blob-OID equality; inexact renames are confidence-scored hypotheses with the threshold recorded, per ECOSYSTEM-HARVEST record 4). Never trust the API `.files[]` (300-file silent truncation; fidelity ceiling in record 7).
2. **Deterministic dependency graph (D0):** per-repo import graph built from tree objects via libgit2/pygit2 (record 1), cached per commit SHA. Changed files -> reverse dependencies -> affected files. Commit-graph generation numbers (record 3) keep recent-history queries near-constant time.
3. **Path-rule label mapping (D0, J-08):** ordered prefix rules with rule ids, e.g.:
   - `src/lib/ping/identity*`, `gateway/routes/identities*` -> IDENTITY
   - `ping_events`, `journal`, `events.js`, `envelope*` -> EVENTS
   - `capabilit*`, `external_agent_adapter`, `capability-propagation*` -> CAPABILITIES
   - `dispatch*`, `orchestration`, `engine`, `worker*`, `mission*` -> EXECUTION
   - `src/fyd*`, `fyd-lane`, `ask-fyd*` -> FYD
   - `gateway/*` -> GATEWAY
   - `projection*`, `dump.py`, `qdrant*`, `feed-rank*` -> PROJECTION
   - `auth*`, `secret*`, `sign*`, `verify*`, `crypto*`, `*.pem`, `*.key` -> SECURITY
   - `deploy*`, `Dockerfile*`, `workflow*`, `cron.d`, `restart*`, `start-*.sh` -> DEPLOYMENT
   - `*.md` (docs-only, no code paths touched), `README*` -> DOCS_ONLY
   Rules are data (one config module), versioned, and owner-editable; a lint test asserts no hardcoded duplicates elsewhere (gauntlet G-16 pattern).
4. **Conflict escalation (D1, J-11):** if the file set maps to multiple non-DOCS labels, or any file hits SECURITY/IDENTITY/DEPLOYMENT, Jev classifies the uncertain files with per-label confidences from the closed label set. DOCS_ONLY + no other label -> emit evidence, no tests, no review.
5. **Affected PING subsystems (D0):** label -> subsystem map (labels are defined as PING subsystem names by construction).
6. **Targeted test selection (D0):** deterministic file->test map (same directory `__tests__`, lane test files, `*.test.*` siblings). Uncertain impact (J-11 confidence < 0.60) -> run the broader suite for the affected subsystems, never the full repo.
7. **System 2 only for uncertain impact (J-18):** SECURITY/IDENTITY label with low confidence, cross-cutting changes (5+ labels), or plan contradiction (J-12) -> bounded brief -> D2/human. Everything else flows through the deterministic funnel.

**What Jev must never do here:** change the label rules, select tests by vibes, or mark a SECURITY-labeled commit as safe. Jev fills the uncertain middle; the rules and the test map are deterministic and versioned.

---

## 5. ISSUE TRIAGE DESIGN (classification only)

**J-15 (D1) output schema** for each issue (title + sanitized body + metadata in; bounded JSON out):

- `dedupe_candidate`: issue id of the likely duplicate, or none (deterministic text-similarity pre-pass feeds candidates; Jev picks from the candidate list, never invents an id)
- `subsystem`: one of the 10 impact labels, or UNKNOWN
- `kind`: BUG / FEATURE / SECURITY / QUESTION
- `urgency`: P0 / P1 / P2 / P3 / UNKNOWN
- `likely_stale`: bool (age + no activity + referenced versions behind HEAD)
- `customer_facing`: bool
- `needs_architecture`: bool (crosses subsystem boundaries or touches authorities)
- `needs_reproduction`: bool

**Hard boundary: Jev never deletes, closes, locks, or labels anything on GitHub.** All terminal actions are HUMAN authority (J-19): the owner approves a digest-bound proposal ("close issues #a, #b as duplicates of #c"), silence never approves. Jev's triage output lands in PING as an advisory observation on the issue object.

### Why each field is safe as classification
- `dedupe_candidate`: a pointer, not a merge. Merging/closing is the human action. A wrong pointer is corrected by the next human review; it cannot destroy the issue.
- `subsystem`: advisory routing. Worst case is a misrouted card, visible and correctable; the deterministic path-rule layer (J-08) already handled file-grounded cases.
- `urgency`: advisory priority. P0/SECURITY auto-escalates to the human queue rather than acting, so over-urgency costs attention, never action.
- `kind` (bug/feature/security/question): vocabulary assignment. SECURITY kind triggers the human queue (J-14 rule: Jev never clears a security finding).
- `likely_stale`: a flag for the human's stale-sweep proposal, never an auto-close. Auto-close on Jev alone is explicitly forbidden; the DISTILL-closer precedent (36-hour threshold evaluated at observation time, fail-closed when undeterminable) shows the shape: deterministic rules + human authority, Jev only advises.
- `customer_facing`: routing hint for the owner queue.
- `needs_architecture` / `needs_reproduction`: work-type flags that shape the bounded D2 brief, not decisions.

**Abstention is a first-class output:** `UNKNOWN` subsystem, `UNKNOWN` urgency, and low confidence route to HOLD_FOR_HUMAN (J-16), never to a guessed action.

---

## 6. EXISTING PING CODE TO REUSE

| Component | Location | What to reuse for GitHub ingestion |
|---|---|---|
| Observation emission seam | `~/workspace/tandem/emit-observation.py` | OBSERVATION_CREATED emission with fail-closed gates: verified-transition requirement, semantic-domain gate, duplicate-emission guard (sha256), durable fsync spool, probe-before-POST crash recovery. The terminal stage (pipeline stage 4) should call this seam, not reimplement it. |
| Deterministic gate pattern | `~/workspace/skills/competitive-signal-pass/SKILL.md` | "LLM generates candidates; deterministic machinery decides what survives." Terminal states PASS/NO_VALUE/BLOCKED/FAILURE; pattern compiler with hard gates in order; confidence computed never invented; the skill cannot write to PING (acceptance test proves the boundary); gap_ledger (KEEP_REASONING/AUTOMATABLE/ALREADY_AUTOMATED/BLOCKED/NOT_WORTH_AUTOMATING); `signal_pass.py cycle` diff_cycles deterministic surfacing. This is the architectural template for the D0-funnel/D1-classify split. |
| Decision contracts | `~/workspace/ping-24h/lanes/lane11-decision-fabric/PING_DECISION_SURFACE.md` | The DETERMINISTIC / BOUNDED DECISION CANDIDATE / DEEP REASONING / HUMAN AUTHORITY / UNKNOWN vocabulary; B-01 classifyReview (text -> bucket + confidence, recommends only, human decides); B-05 never-reengage guard (re-derived from ledger per load: the within-pass dedup pattern for J-02/J-07); B-09 worker self-report verdicts (claim never promotes effect state: the anti-carried-verdict rule for Jev outputs). |
| Ingestion security design | `~/workspace/git-ingestion/threats/GIT-INGESTION-THREATS.md` | T-01..T-12, global boundary caps (64 MiB blob, 100:1 pack ratio, 1 GiB cumulative, 120 s packet timeout), acceptance gauntlet G-01..G-16, 10 hard gates. Non-negotiable preconditions before any live wiring. |
| Ingestion mechanisms | `~/workspace/git-ingestion/findings/ECOSYSTEM-HARVEST.md` | Top-5: partial-clone skeleton ingest, HMAC-verified push-webhook incremental ingestion with before/after OID ranges, commit-graph generation traversal, libgit2/pygit2 engine, fast-export/import stream journal. All verdicts ADOPT/ADAPT/PATTERN_ONLY; no license blockers. |
| Canonical field contract + temporal rule | `~/workspace/patch7_real_intake.py`, `~/workspace/test_patch7_temporal_regression.py` | The canonical contract to preserve end to end: repository_id, owner/name, observed_commit_sha, source/source_type, evidence_level, evidence_sources, license signal. Temporal rule: same repository_id + same SHA -> UNCHANGED. Rate-limit state recorded honestly. |
| Ingest adapter pattern (Pig repo, not re-verified this pass) | `gateway/social_ingest_adapter.js` @ d3ad88c39 (per 2026-09-26 dated log) | BFF envelope -> canonical journal, Ed25519 envelope verification at the boundary, deterministic ids via ONE IdentityAuthority, vocab enforced not translated, non-canonical predicates rejected as PREDICATE_NOT_CANONICAL. The GitHub adapter should mirror this shape. |
| Lane 11 UNKNOWNs (negative anchors) | same PING_DECISION_SURFACE.md | U-01 Jev cost per call not reported; U-02 model_version not published (404s); U-03 confidence field null, never populated; U-04 calibration NOT established (n=6, Brier 0.0076). Jev stays SHADOW until these close. Any GitHub D1 judgment ships with the same shadow-first requirement. |

---

## 7. THREE EVAL EXAMPLES FROM REAL PING HISTORY

### Eval 1: Patch 7 Run 2 re-observation (2026-09-21) -- D0 decides, Jev would add zero
- **Event:** the four bounded candidates (scrapy/scrapy, browser-use/browser-use, in-toto/in-toto, gohugoio/hugo) re-scanned; GitHub API returned the same immutable numeric repository IDs at the same pinned commit SHAs.
- **Right classification:** J-07 temporal dedupe -> UNCHANGED for all four. Emit nothing new. No relevance judgment needed: the state machine already concluded.
- **Ground truth outcome:** Run 2 persisted all four as UNCHANGED; rate-limit state recorded; no code executed. Verified by `test_patch7_temporal_regression.py` (same SHA -> UNCHANGED, evidence fields preserved).
- **Lesson for the pipeline:** the D0 temporal layer must run BEFORE any D1 judgment. A Jev "is this relevant to FYD?" call on Run 2 would have cost 4 model calls with literally zero information gain. This is a measured instance of D0 dominance over D1.

### Eval 2: DailyBriefingGenerator provenance gap (2026-09-21) -- a normalization (D0) failure, not a judgment failure
- **Event:** classified GitHub repos flowed into DailyBriefingGenerator.generate; the real generated briefs contained only the executive summary and omitted the Trending Repositories provenance section.
- **Right classification:** the failure was in J-17 normalization: persisted scan records did not carry a GitHub-bearing `source_type`, while the generator selected repositories only when `"github" in source_type`. SCAN -> EVIDENCE -> CLASSIFICATION succeeded and the temporal rerun proof succeeded; CLASSIFICATION -> DAILY BRIEF provenance stayed broken.
- **Ground truth outcome:** fixed only by the deterministic provenance repair Nolan authorized (canonical contract: repository_id, owner/name, observed_commit_sha, source/source_type, evidence_level, evidence_sources, license signal; "the brief must consume the canonical field location rather than heuristically reconstruct provenance").
- **Lesson for the pipeline:** no Jev relevance layer would have caught this; a deterministic schema gate (J-17: schema violation -> BLOCKED) would have. The normalization stage is load-bearing and must be D0.

### Eval 3: GitHub API egress failure + Pig bridge route-around (2026-09-21, 12:29 MDT) -- transport failure is not auth failure
- **Event:** GitHub API re-test returned RemoteDisconnected through the egress proxy.
- **Right classification:** TRANSPORT_UNKNOWN, not an auth failure and not a data problem. Standing order honored: no credential regeneration, no paste request. Route around via the Pig bridge: 16 files ingested from `/home/nolan/ping @ 4c098334c` and `/home/nolan/projects/ping @ 3091ea7` into `fyd-lane/harvest-wave1/code-evidence/` using 2000-char base64 chunks with per-chunk and whole-file MD5 verification.
- **Ground truth outcome:** the route-around succeeded with byte-verified integrity; zero credential churn. (Standing rule since 2026-09-28: "Transport failure != service failure"; "A proxy/CONNECT/tunnel failure with no service-level proof is TRANSPORT_UNKNOWN / NETWORK_TRANSITION, never GATEWAY_DOWN or PIG_DOWN.")
- **Lesson for the pipeline:** the ingress stage needs a deterministic transport taxonomy (REACHABLE / TRANSPORT_UNKNOWN / AUTH_FAILED / RATE_LIMITED) before any judgment runs. A Jev "should we retry or regenerate credentials?" judgment is unnecessary and dangerous: the rule is fixed, fail-closed, and already owned.

---

## 8. ANSWERS TO THE PARENT'S THREE QUESTIONS

### The 3 sharpest D1 candidates
1. **J-10 Jev relevance-to-FYD** (RELEVANT_FYD / OPERATIONAL / NOT_RELEVANT + confidence + why_ref + candidate mission). Sharpest because it is the direct replacement for the current per-event System-2 temptation: today every surviving GitHub signal would be hand-read; the bounded classifier with a 0.60 confidence floor and contradiction escalation (J-12) absorbs the routine 80% while failing safe on the rest. Contract mirrors the proven B-01 classifyReview shape.
2. **J-11 Jev semantic impact classification for uncertain commits** (closed 10-label set, per-label confidence, uncertain_files list). Sharpest because the D0 path rules (J-08) will misfire on cross-cutting refactors exactly where a wrong label is expensive (SECURITY/IDENTITY/DEPLOYMENT); Jev handles only the conflict residue, and any low-confidence label escalates to D2/human before test selection is trusted.
3. **J-15 Jev issue triage** (dedupe candidate, subsystem, kind, urgency, likely_stale, customer_facing, needs_architecture, needs_reproduction). Sharpest because issue triage is pure System-2 reading work today with zero state risk: every output is advisory, every terminal action (close/delete/label-push) stays behind the H-01 digest-bound human approval, and abstention (UNKNOWN) is a first-class output.

### Does current ingestion drown System 2 in unfiltered events? NO, with evidence
- There is no live GitHub event ingestion to drown anything: no webhook receiver exists (grep over the workspace finds none outside venv false positives), and the standing order (2026-09-21) explicitly lists what was NOT built: "No Patch 8, scheduler, daemon, database, queue, webhook, continuous crawler, automatic ingestion, or FYD integration."
- The honest-gaps record (2026-09-24/28) confirms: "no commit/tree/blob ingestion, no diff extraction, no canonical event wire, no pinned-SHA discipline (7-char truncation), no worktree scanner, no evidence wrapper. Wave A recipe recorded, not built."
- The one GitHub pipeline that ran (Patch 7) is fully deterministic from scan to brief (scan -> temporal diff -> evidence-gated classification -> brief render) with zero per-event LLM calls; the only LLM in the loop (Meta AI research via tandem) sits behind a human verification gate and a semantic-domain gate before any PING emission. System-2 cost per GitHub event today is zero.
- The forward risk is real but bounded by this design: if push-event ingestion is built WITHOUT the Stage 1 D0 filters, every push becomes a per-event System-2 interpretation task. The pipeline puts the D0 funnel first precisely so the expected steady state is that most events die at the allowlist/noise/temporal-dedupe layer before Jev ever sees them.

### Strongest negative-evidence item
**The 2026-09-27 routing proof invalidation** (~/memory/2026-09-27.md): "Routing proof invalid: requested typesafe/jev-router, provider returned openai/gpt-6-luna. Nolan stopped all Jev intelligence dispatch." Trace: `jev-reason.ps1` hardcoded `model='typesafe/jev-router'` with no logical profile, no explicit mapping, and no `response.model` check; the routing product silently delegated to a frontier model. This is the sharpest negative evidence because it falsifies the System-1 cost premise directly and silently: the layer LOOKED like cheap bounded judgment while actually burning System-2 cost, and nothing in the harness detected it. Corroborated by two more anchors: (a) the archived 2026-09-26 finding that Jev tool-selection/compaction did NOT generically cut token usage (System 1 != cheaper, per the task context); (b) Lane 11 U-01..U-04: Jev cost per call not reported, model_version not published, confidence field null, calibration not established at n=6. **Design consequence baked into this report:** every D1 judgment ships shadow-first with measured cost and calibration before it touches the live funnel, D1 outputs are advisory only, and the D0 funnel is designed to decide the routine cases without any model call at all.
