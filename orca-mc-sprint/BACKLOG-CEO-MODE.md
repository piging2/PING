# BACKLOG — CEO MODE (Nolan, 2026-09-27 ~20:24 MDT, binding)

Clock: T+0 = 2026-09-27 20:24 MDT. Checkpoints T+24 (2026-09-28 20:24 MDT),
T+48, T+72, T+96, T+100 (2026-10-01 20:24 MDT). Each: CHECKPOINT -> REPORT ->
REOBSERVE -> REPRIORITIZE -> CONTINUE. T+100 is not an end.

Law: NEVER RUN OUT OF LEGITIMATE WORK. Stopping is a defect. No artificial
backlog generation, no busywork, no manufactured code. Zero safe writes is
acceptable; zero useful thought is not. Priority: P0 security/privacy/data loss
-> duplicate or unknown external effect -> authority/identity/tenant -> live
product failure -> correctness -> reached-path ORCA/MC -> restart/replay ->
FYD owner journey -> bootstrap -> customer action -> object/social/distribution
-> product quality -> generalization -> cost/performance -> duplication ->
harvesting -> research. New P0 interrupts.

States: OBSERVED / RESEARCHING / NEEDS REPRODUCTION / PROVEN DEFECT / READY /
IMPLEMENTING / FALSIFYING / INTEGRATING / RUNTIME PROVING / PRODUCT PROVING /
BLOCKED AUTHORITY / BLOCKED DEPENDENCY / HOLD / UNKNOWN / SUPERSEDED / CLOSED /
REOPENED.

Horizons: NOW (highest-value proven broken boundary) / NEXT (evidence-backed,
ready when owners finish) / FRONTIER (questions likely to reveal next-gen work).

One writer per semantic unit. Every implementation gets an enemy. New
authorities: 0 expected. Em dashes: none.

## NOW

| # | Candidate | State | Evidence |
|---|---|---|---|
| 1 | J: dispatch-route tenant forgery fix (served :3100) | CLOSED | Falsifier-J: CLAIM HOLDS (all 6 probes live, body-bypass hostile fails, key not enumerable, fail-closed by code, served build confirmed); 2 small residuals → J2 |
| 2 | K: gateway POST /events caller verification | CLOSED | K2 deployed live: 401/401/200 verified, PID 30742→74387, token 600 outside repo, start.sh canonical; caller Bearer live in served :3100 (restarted 20:39:57); Falsifier-K: CLAIM HOLDS; K2 caveat falsified (503 window closed) |
| 44 | Resolve stale workspace copy /home/hatch/workspace/fyd-journal-gateway/server.mjs (predates tenant enforcement; divergence hazard) | OBSERVED | Mission K discovery; left untouched |
| 45 | Falsifier-K: enemy of the gateway bearer fix (post-deployment) | CLOSED | CLAIM HOLDS (401/401/200 live, swap clean, hygiene zero-hits, start.sh correct, rollback ready); K2's caveat FALSIFIED: :3100 restarted 20:39:57 with Bearer <redacted> in served build, 503 window closed |
| 3 | L: MC missions API tenant-scoped reads | CLOSED | Falsifier-L: CLAIM HOLDS. All behavioral assertions verified live; no bypass across header/body/query/case/duplicate/injection; served 20:34 build enforces gate; doc comment fix in flight |
| 46 | Falsifier-L: enemy of the missions-API tenant gate | IMPLEMENTING | Header-only hostile, existence oracle, null-tenant hunt, trust-model assessment |
| 4 | M: flat ask route body-siteId deprecation | CLOSED | Falsifier-M: CLAIM HOLDS. 308-empty, 400 paths, query ignored, body-smuggling refused, legitimate callers 200; 308 correct vs 410 (callers still use flat) |
| 5 | H: stale-state guard on FYD apply path (Flaw D) | FALSIFYING | Falsifier-H FALSIFIED the drift key (base-only misses journaled directive drift → silent rebase); all mechanics hold; H2 (row 66) repairing |
| 6 | I: MC artifact-writer integrity + ping_events touch check | CLOSED | Root cause (c) holds; fix EXISTS in served repo (Falsifier-I checked wrong tree); ID note was wrong (e5dc33=REQUESTED, Falsifier-A right); fix design concern noted (see 63) |
| 47 | I2: artifact deleter hunt (who removed artifacts/ 13:30-13:37 MDT?) | CLOSED | DELETER UNKNOWN. Code clean, no cron/timers, Windows ruled out; recurrence confirmed (080b files lived <6 min, deletion active NOW); I3 trap running |
| 48 | Falsifier-I: enemy of the artifact-writer claims | CLOSED | PARTIAL: derivation/writer/absence/ping_events hold; ID conflict resolved (Falsifier-A right); "phantom fix" verdict WRONG — falsifier checked stale lane-p01/tree, fix exists in served /home/nolan/projects/ping |
| 7 | E: HOLD reaper patch + rendezvous kill, effect count = 1 | FALSIFYING | Falsifier-E2 FALSIFIED: H2 (stale dedup after PNO re-opens duplicate-effect), unsatisfiable sweep (true-unknown holds permanent), H1/H3/H5 narrow; E3 dispatched |
| 42 | Stale watchdog test: mission_scheduler.retry_watchdog.test.js fails 7/7 on ORIGINAL code (missing tenant_id); fix or retire | OBSERVED | Mission E; pre-existing, no regression from patch |
| 43 | Preserve rendezvous proof as permanent repo test | BLOCKED DEPENDENCY | Worker scratch lost (/tmp volatility); Falsifier-E must save durable proof first |
| 8 | N: adapter worker-output redaction (Q-P0-05 F1) | FALSIFIED | Falsifier-N: hyphenated sk- values leak (charset excludes -); space-delimited secret keys leak (rule 3 needs : or =); UUID over-redaction; session_id blanket exemption inconsistent; N2 repairing |
| 9 | Falsifier: B dump.py commit re-verification | CLOSED | CLAIM HOLDS; F "uncommitted" observation = timing (BEFORE snapshot pre-20:19:01); :8080 gateway auth model noted |
| 10 | Falsifier: F served-byte binding re-derivation | CLOSED | FALSIFIED-BY-CHURN: binding held at 20:27, broke during audit from concurrent L/M rebuilds+restarts; wrong-tree test passed; owner-mode flag live; restart attribution gap found (see 53) |
| 11 | Falsifier: A journey digest independent recompute | CLOSED | CLAIM HOLDS; hostile finding -> Mission P (row 41) |
| 12 | Browser proof Q-J claims 6-8 (renders/discoverable/usable) | BLOCKED DEPENDENCY | Parent/root delegation; requirements prepared by Mission F |
| 13 | tenant-ingress-issue.md doc fix: pr-upstream-denied.test.sh covers 0/14 tenant points | READY | Mission D documentation discrepancy |
| 14 | FYD "Get in touch" copy with no contact CTA (customer-action partial) | PROVEN DEFECT | Mission A metrics; product defect, owner-journey class |
| 15 | Served page is DemoOwnerMode variant; verify real-owner variant parity | NEEDS REPRODUCTION | Mission F served-byte binding; DemoOwnerMode enabled:true in flight data |
| 16 | Journal append-only policy: corrections append, never rewrite history | PROVEN DEFECT | Mission A journal-correction audit; before-bytes unrecoverable |
| 17 | O: product adversary lane, FYD owner journey falsification | IMPLEMENTING | Permanent product questions; read-only |
| 41 | P: overlay sub-digest provenance investigation | CLOSED | Verdict (a): correct per-directive digests (TS canonicalizer); Falsifier-A mismatch was a canonicalizer mix-up; second canonicalizer found (see 49) |
| 49 | P2: pin the digest law — schema doc for overlay proposalDigest + canonicalizer boundary (TS overlay domain vs Python MC-approval domain) + ASCII agreement test | CLOSED | Falsifier-P2: CLAIM HOLDS (docs accurate, all digests reproduce, test genuine; blemishes in report gloss only: ASCII-overclaim, 4 not 5 tests, generator-cause misattributed) |

## NEXT

| # | Candidate | State | Evidence |
|---|---|---|---|
| 18 | EVENT convergence: rewire lane-d appendDispatchEvent to UER | READY | Registry target 1; UER fail-closed semantics already exist |
| 19 | IDENTITY convergence: migrate UER off generateSpineEventId to CanonicalIdentityService | READY | Registry target 2; broadest real importer set |
| 20 | MISSION convergence: declare lane-d winner, harvest mission_intent.py bypass detection | READY | Registry target 3; zero prod callers on mission_intent.py |
| 21 | TENANT convergence: verified-session-backed tenant context | BLOCKED DEPENDENCY | K + tenant-ingress-issue.md constructor |
| 22 | Gateway: server-side WRONG_JOURNAL marker check (Q-P0-04 F4) | READY | Client-side only today; direct POST bypasses |
| 23 | MC: mission -> approval -> overlay linkage surface | READY | Mission A Q3/Q4 UNKNOWN from MC |
| 24 | Approval path: record baseDigest at approval (stale-guard complement) | READY | Post H; executor-side half of Flaw D |
| 25 | Falsifier: C 18-surface spot-check | READY | After N lands (mechanism change) |
| 26 | Falsifier: D matrix re-probe post-fix | BLOCKED DEPENDENCY | J/K/L/M |
| 27 | Falsifier: E reaper + effect count | BLOCKED DEPENDENCY | E |
| 28 | Repo jest TS runner unconfigured (pre-existing) | OBSERVED | Mission F; blocks TS test claims repo-wide |
| 29 | Pig PID 52512 without owner-mode flag (does not own :3100) | OBSERVED | Mission F observation; awareness only |
| 30 | MC SUCCEEDED status conflates research-run exit-0 with journey success | OBSERVED | Mission A manufactured-certainty flag |
| 31 | Ask grounded rate beyond 1/1 spot check | RESEARCHING | Mission A; unsupported-claim rate needs scale |
| 32 | Owner corrections by semantic class (metric at 0; needs real owner) | HOLD / UNKNOWN | No owner journey yet; Monument View gated on green |

## FRONTIER

| # | Candidate | State | Evidence |
|---|---|---|---|
| 33 | Adversarial business worlds: restaurant, multi-location, sparse/contradictory presence, ambiguous identity | RESEARCHING | CEO MODE generality attack; no fixtures engineered to pass |
| 34 | Architecture entropy scan: dead branches, unused abstractions, alternate writers beyond the 4 known duplicates | RESEARCHING | Registry baseline 4; direction: more capability, less machinery |
| 35 | Harvesting: external retry/idempotency/reconciliation/protocol patterns | RESEARCHING | SOURCE/VERSION/LICENSE/MECHANISM/WHY/ COST/AUTHORITY/TEST/ADAPT per donor |
| 36 | Counterfactual replay: yesterday's snapshots under today's system | RESEARCHING | Never repeat historical external effects; regressions become work |
| 37 | Embarrassment mining: journal in-place correction -> regression corpus | OBSERVED | Mission A audit; never pay full price twice for a failure class |
| 38 | Human-work elimination: correction survival loop (currently n/a) | RESEARCHING | Metric exists; no owner corrections observed yet |
| 39 | Model-call inventory: per-request model calls that should become deterministic | RESEARCHING | Ask is rule-based; what else calls models per request? |
| 40 | Cost/dependency: provider capability drift review | RESEARCHING | CEO MODE cost attack; pig-wsl ollama qwen2.5-coder:1.5b baseline |

Queue depth: 40 (floor 32). Shallow-queue rule: if READY falls below 8, auto-increase discovery lanes.

## Closed log

- 2026-09-27 ~20:28 MDT: Falsifier-A — journey digest CLAIM HOLDS (actual canonicalizer,
  deterministic, overlay copy byte-identical); hostile finding: overlay structured
  proposalDigest fields of unknown provenance (Mission P investigating).

- 2026-09-27 ~20:10 MDT: Pig power policy (Nolan: AC Never sleep) + battery proof + soak proof.
- 2026-09-27 ~20:02 MDT: P0 FYD mission approved with exact-transition binding.
- 2026-09-27 ~20:19 MDT: Mission B dump.py tenant-param commit.
- Q-P0-04 WRONG_JOURNAL: PASS. Q-P0-05 reached journey: PASS. Q-J claims 1-5, 9-10: PASS.

## Supersessions

- 2026-09-27 20:24 MDT: CEO MODE supersedes the convergence sprint's termination
  semantics. Old measurement window (2026-10-02 ~00:10 MDT) replaced by the
  T+24/48/72/96/100 checkpoint clock. The handoff becomes the T+24 checkpoint
  report (2026-09-28 20:24 MDT), not a terminal delivery.
| 50 | Falsifier-M: enemy of the flat Ask deprecation | IMPLEMENTING | 308-empty, 400 paths, query-string ignore, body-smuggling hostile, legitimate callers |
| 51 | Fix f-journal-privacy + h-crash-window tests for FYD_JOURNAL_WRITE_TOKEN (12 failing since K's gateway change) | CLOSED | Falsifier-TestFix: CLAIM HOLDS (16/16 re-run, 12-fail negative control, security assertions intact, test-files only) |
| 52 | Falsifier-N: enemy of the worker-output redaction fix | IMPLEMENTING | Fresh-marker leak replay, truncation-boundary hostile, session_id residual, idempotence, exact-echo contract |
| 53 | Add restart logging to start-3100.sh (timestamp, old/new PID, BUILD_ID, invoker) so restarts are attributable in 3100.log | CLOSED | PASS: 12 lines added, 0 modified; :3100 untouched; next real restart creates /home/nolan/3100-restarts.log |
| 54 | Re-derive :3100 source/build/served binding after H/J land and restart churn settles | NEXT | Falsifier-F's method stands; needs a quiet window |
| 55 | Verify :3100 caller picks up gateway Bearer wiring after next rebuild+restart (overlay emits currently 503 fail-closed) | NEXT | K2 caveat; H/J restarts will trigger; confirm approve→overlay path recovers |
| 56 | Falsifier-H: enemy of the stale-state guard | CLOSED | FALSIFIED (scoped): drift key insufficient (base-only; layered directive drift unguarded); mechanics all hold; H2 repairing |
| 57 | Fix stale trust-level doc comment in mc-tenant-gate.ts (dispatch POST is now key-authenticated, stricter than the caller-asserted header) | CLOSED | Comment fixed (lines 8-12), nothing else touched, not committed |
| 58 | SYSTEMIC: repo has no jest.config; lanes invent scratch ts-jest configs; test results not reproducible — commit a standard jest config or document the canonical test command | READY | Hit by Mission M (Falsifier-M) and test-token-fix (used /tmp scratch config); evidence reliability issue |
| 59 | E2: HOLD repair — fail closed on markHold→0 (C1 race), wire resolveHold (liveness), reset started_at on PROVEN_NOT_OCCURRED | IMPLEMENTING | Falsifier-E's exact falsifying evidence; proof at evidence/hold-rendezvous-falsifier.mjs |
| 60 | N2: redaction repair — sk- charset + space-delimited keys + UUID exclusion + session_id shape-gate | CLOSED | Falsifier-N2: CLAIM HOLDS on all 4 defects; 2 adjacent gaps found → N3 |
| 61 | I3: deleter trap — inotify watch + bait dispatch to name the unlinking process | CLOSED | Trap ran 10 min, zero deletions; deleter UNKNOWN but now timed: active 20:29-20:36, quiet through 20:51 across 7 dispatch bursts; targets = mission-control/ operational files; tripwire left running (PID 78581) |
| 62 | Falsifier-N2: enemy of the redaction repair | IMPLEMENTING | Replay N + Falsifier-N leaks, new hostile (tabs, nesting, case, boundaries), legitimate survival |
| 63 | Design review: existsSync in projectMissions breaks the module's "deterministic journal->records, replay-safe" contract (output depends on filesystem, not history alone) | READY | Falsifier-I's legitimate concern; consider making present a separate verification layer, not part of the pure projection |
| 64 | N3: redaction adjacent gaps — sk- case-insensitivity + hex-digest exclusion under keys | CLOSED | Falsifier-N3: CLAIM HOLDS (43/43 hostile probes pass; 32-hex tradeoff acceptable+documented; 47/47+40/40 regression; idempotence; scope clean) |
| 65 | RESOLVED: the "unexpected coppersmith-plumbing mission" (mc-m-080bf71adb60, seen by Mission L and I2) was Mission J's own fail-before probe (synthetic prompt, real tenant label, no identity → 200). Not a rogue lane. |
| 66 | H2: stale-guard layered drift key (cover journaled directive set + re-read journal at execute; compare or drop approvedAt) | CLOSED | Falsifier-H2: CLAIM HOLDS (Falsifier-H replay trips STALE_APPROVAL; accumulation fidelity line-by-line; 130/130; 4 noted limitations, none breaking) |
| 67 | End-to-end synthetic approve → overlay via :3100 (proves the Bearer <redacted> path works, not just that the bytes are served) | READY | Wiring live in served build (Falsifier-K); needs a synthetic-tenant approve, writes to real journal |
| 68 | J2: dispatch identity micro-fixes — 401-before-400 reorder (close tenant oracle) + entitled_tenants doc/code coherence | CLOSED | Falsifier-J2: CLAIM HOLDS (reorder confirmed, unauthenticated oracle closed with indistinguishable 401s, strict semantics; :3100 landing still batched with H2) |
| 69 | E3: HOLD repair round 3 — H2 dedup clear on resolveHold, reachable liveness (sweep/operator path), H1/H3/H5 | CLOSED | Falsifier-E3: CLAIM HOLDS (all 5 fixes hostile-verified; 15/15 + 7/7 + 8/8; 3 documented residuals, none breaking) |
| 70 | JEST-CONFIG: standardize the test runner (root jest.config with ts-jest; one canonical command; known-failing documented) | CLOSED | Falsifier-JEST-CONFIG-2: CLAIM HOLDS (207 discovered, 196/11, 2230/22, 134/134 tsx); 2 doc nits fixed (rootDir prefix, dogfood-render wording) |
| 71 | Port P2's digest-law comment from vendored mc-approval/approval_request.py to the mission-control source branch at next re-vendor (else silently lost) | READY | Falsifier-P2 vendor-note; comment-only, zero behavior |
| 72 | I4: deleter hunt round 2 — Windows event/process logs for the 20:29-20:36 MDT window; reproduce the 20:29 burst shape if logs are inconclusive | CLOSED | Windows side exhausted and ruled out (Defender/Storage/cleanup/tasks/reboot all clear); narrowed to WSL-side; lead = mode-600 recreation of dispatch-identities.json at 20:34 |
| 73 | LANDING-3100: rebuild + restart :3100 to activate H2 + J2 (mutation lease, start-3100.sh, full verify + binding re-derivation) | CLOSED | PASS (PID 78650→94344, BUILD_ID DqZQX-gQgkpciv6rpLgG3; H2+J2 wiring in served bundle; owner-mode env; health 200s; identity 401) |
| 74 | SYNTH-E2E: synthetic-tenant approve → overlay proof through live :3100 (H2 guard + K2 Bearer + journal write) | CLOSED | E2E PASS (approve 200 ok:true, H2 guard passed live, 1 journal event, projection applied, clear restored, tampered digest → 409 zero-writes) |
| 75 | PROD-1: gate demo/owner chrome off the public site page (P0-1 DemoOwnerMode panel, P0-2 customize console, P0-3 "Generated site demo"/"Procedural clone proof" labels) | CLOSED | Falsifier-PROD-1: CLAIM HOLDS (structural gates verified, flag cannot bypass, h1 shares title seam, owner flow preserved; 2 non-falsifying doc notes) |
| 76 | PROD-2: Emergency Services section — real tel: CTA in-section + reconcile section claims with Ask FYD capability answers | CLOSED | Falsifier-PROD-2: CLAIM HOLDS (render/fail-closed/tenant-isolation verified; 4 dogfood failures pre-existing; scope note: CTA on all Services sections, not just Emergency) |
| 77 | PROD-3: Ask FYD out-of-scope detection (election probe got confident non-sequitur labeled SUPPORTED DIRECTLY) | CLOSED | R3 repair: profile branch scope guard + trades vocab expansion; 74/74 guard, 253/253 suites; residuals documented (tech word, pre-existing failures) |
| 78 | PROD-4: strip raw object IDs from Ask FYD refusal text | CLOSED | Hex-only regex + displayTarget + both boundaries sanitized; falsifier R3: HOLDS for realistic inputs |
| 79 | PROD-5: human captions for photos (move rights-basis/digest legal memo behind "Why this?") | CLOSED | Captions hold (falsifier verified); no leaks in photo surfaces |
| 80 | PROD-6: collapse provenance noise (one clean fact rendering; plain-language "Why this?"; dedupe phone/email) | CLOSED | Footer + overlay repaired and verified; site pages clean. Other surfaces (/node/[id], /build-my-fyd) split to new items |
| 81 | PROD-7: production correction path or explicit demo-only scoping (all journal actors are demo; overrides route is DEMO/DEV ONLY) | DECIDED | grill-20 decide-record 2026-09-28T05:09:00Z (escalation-log.jsonl): explicit demo-only scoping now (overrides route labeled/guarded DEMO/DEV ONLY across product surface: copy, route guards, docs); owner-auth build deferred until Nolan explicitly requests a production correction path. No owner question needed. Ready to implement. |
| 82 | PROD-8: surface orphaned corrections in owner UI (seq 12 services:order correction applies to nothing) | CLOSED | Predicate aligned, detail text fixed, field behavior documented; 23/23 tests; falsifier verified |
| 83 | PROD-9: answerClass polarity / premise-verdict for denials and premise rejections | IMPLEMENTING | Mission dispatched |
| 84 | PROD-10: object view de-harness (remove DEV badge + schema IDs; add real contact actions) | CLOSED | All falsification holds (9/9 tests). Note: actor-label regex is substring-based; key on actor kind/id if real owner auth arrives |
| 85 | PROD-11: dedupe "Visit website" CTA + website link labeling | CLOSED | Falsifier verified: exactly one CTA button, domain label, correct href; 10/10 tests |
| 86 | I5: deleter lead follow-up — WSL-side writer of dispatch-identities.json (mode-600 recreation at 20:34); check Mission J link | CLOSED | WRITER NAMED: Mission J's worker (/tmp/mj-mkregistry.py + mj-restore-registry.py, explicit chmod 0o600). Deleter itself still UNKNOWN but incident closed: one-time targeted deletion, files restored, no recurrence in 40+ min, tripwire (PID 78581) remains as backstop |
| 87 | PROD-2b: Emergency Services copy reconciliation via proper approve flow (propose -> Nolan approves -> overlay); the "urgent repairs" copy vs Ask FYD's "no emergency service on record" gap | READY | Blocked on PROD-2 falsifier clearing; must use MC derive/propose/approve, never hand-edit |
| 88 | PROD-12: /node/[id] page renders raw website-ingestion: ref in visible text (node-sections.tsx:270) + hover tooltip (object-preview.tsx:169) | READY | Falsifier-PROD-6-R2 found; same fix pattern as PROD-6 |
| 89 | PROD-13: /build-my-fyd says "verified object graph" (build-my-fyd-client.tsx:113); jargon + overclaims verification | READY | Falsifier-PROD-6-R2 found; contradicts footer epistemic stance |
| 90 | PROD-14: contact lineage disclosure exposes raw website-ingestion: ref one tap away (contact-link.tsx ProvenanceLine) | READY | Falsifier-PROD-6-R2 found; move to data attribute |
| 91 | N4: redaction repair round 4 — independent replay FALSIFIED N2/N3 "CLAIM HOLDS" (2026-09-28): 6 confirmed leaks in orca-adapter redactWorkerText/redactEnvelopeValue — (a) sub-8-char Bearer/Basic creds survive via wrong rule-3 split (`Authorization: [REDACTED:AUTHORIZATION] abc1234`); (b) text-mode array under secret key leaks contents (`password: ["hunter2hunter2"]`); (c) non-string values under secret keys lose key context in redactEnvelopeValue recursion (`{"password":[...]}`, `{"credentials":{...}}`, `{"token":[...]}` pass through raw into persisted artifacts). 86/92 probes pass. DESIGN GAP: workOrder.input embedded verbatim into worker prompt and persisted unredacted to Pig hermes-prompt.txt — redaction covers output only. Repair: propagate key context into array/object recursion; fix rule-3 array values; handle short scheme creds; scan/redact input pre-prompt or enforce never-in-WorkOrder in code. Probe: /tmp/qp005-hostile-probe.js (ephemeral). | READY | Independent hostile replay 2026-09-28 (product lane); lane verdicts N2/N3 superseded |
