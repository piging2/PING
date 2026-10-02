# Batch 5 — Owner Disposition + Mission Control Finish Directive (2026-09-26, authoritative)

EXECUTIVE RESPONSE: ACCEPT DEFAULTS, FINISH MISSION CONTROL, KEEP GOING.

Accept the recommended defaults for Batch 5 except where explicitly overridden below. This batch itself exposes a problem: 37 questions is too many human interrupts. The system did good work assembling evidence, alternatives, consequences and defaults. Now improve the escalation boundary. Nolan should exercise authority over genuinely consequential choices, not become the decision engine for every reversible product judgment.

## Overrides / clarifications

- Q1 (:3100): ACCEPT FREEZE. Build in isolation and cut over only after proof. Do not make Nolan's testing blind for 24 hours: keep a STABLE judged build plus a clearly labeled candidate/preview build; never silently mutate the URL he is judging; promote candidate to stable only after its gate passes.
- Q2 (spend): ACCEPT useful burn, but no uncontrolled runaway loops. Continue Jev's existing bounded spend policy and record provider/model usage. Compute being available does not justify repeating low-information work. Require per-lane accounting, loop ceilings, duplicate-work detection, automatic stop on repeated identical failure, T+24 total report. Unbounded spend is itself an external effect.
- Q3 (fonts): ACCEPT self-hosted OFL + system fallback. No third-party font CDN by default. Do not ship font weight/format bloat; subset/optimize where practical.
- Q4 (lab): ACCEPT unlinked + noindex. Cross-link from Mission Control where appropriate.
- Q5 (estimate): ACCEPT evidence-backed call/contact/Ask path. Absolutely no fake form. Long term, Request Estimate becomes a real typed capability/object action.
- Q6 (PING): ACCEPT real PUBLIC facts only. No synthetic claims merely to make the site prettier.
- Q7 (analytics): ACCEPT none by default, but architect the event boundary so an owner can later explicitly enable privacy-preserving analytics. Do not embed analytics assumptions into the renderer.
- Q8 (24-hour deadline): MODIFY. Deliver an honest checkpoint at T+24 regardless (PASSING / PARTIAL / FAILED, truthfully). Do not stop merely because T+24 occurred. Continue the convergence mission after reporting. No pretending the partial passed.
- Q9 (deletion): ACCEPT only isolated branch/worktree deletion. Shared integration still requires normal evidence/review. Never delete unknown dirty work.
- Q10 (HOLD): STRONGLY ACCEPT. HOLD/UNKNOWN NEVER AUTOMATICALLY RETRIES AN EXTERNAL EFFECT. UNKNOWN means we do not know whether the effect happened: HOLD -> RECONCILE -> determine outcome -> explicit resume/retry.
- Q11 (media management): ACCEPT owner experience.
- Q12 (factual corrections): ACCEPT narrowly sourced corrections. Preserve provenance; don't rewrite source observations. Do not let lanes make subjective business-positioning decisions; those belong to owner intent.
- Q13 (PING mark): ACCEPT as working presentation asset. Cheaply swappable; do not constitutionalize the logo.
- Q14 (/build): MODIFY. Do not cut over merely because T+24 elapsed. Cut over after clean-checkout one-click proof and acceptance gates. Then remove runtime fork; git is rollback. Maintain CURRENT VERIFIED RENDERER VERSION vs CANDIDATE RENDERER VERSION, not two architectures.
- Q15 (near-empty graph): OVERRIDE DEFAULT. DO NOT HARD-REFUSE. Generate the smallest HONEST presence possible and clearly show what FYD needs to improve it. Truthful incompleteness beats fabricated completeness or hard refusal. Only refuse publication when minimum safety/truth requirements cannot be met.
- Q16 (owner auth): ACCEPT post-sprint roadmap; do not steal website-quality hours tonight. Production needs PING OWNER IDENTITY + verified ownership claim + authentication methods/adapters. Authentication method != canonical owner identity.
- Q17 (lab vs Mission Control): STRONGLY ACCEPT separation but finish Mission Control now. Lab = site/object/evidence/projection truth. Mission Control = missions/runs/agents/proposals/approvals/executions/outcomes. Cross-link by stable IDs; do not merge information architectures.
- Q18 (category priors): ACCEPT CAREFULLY only as weak compositional priors, never factual priors. Priors may arrange truth; they may not manufacture truth.
- Q19 (PING grammar): ACCEPT same underlying grammar/compiler, but the grammar must permit radically different compositions. No bespoke PING application hidden behind the claim it came from the generator.
- Q20 (T+24): ACCEPT frozen graph for the primary projection test AND add one separate end-to-end proof (fresh URL -> acquisition -> evidence -> graph -> SiteSpec -> render). The question's framing was a false dichotomy; run both, do not confound the visual experiment.
- Q21 (Ask FYD): OVERRIDE DEFAULT. Ask FYD is part of the product proof; do not exclude it to protect the projection demo. Keep it small and real: one evidence-backed interaction is enough. Do not break an already-working Ask path to enforce this separation; do not build broad chatbot functionality.
- Q22 (public Vercel): ACCEPT explicit publication approval. No automatic publication.
- Q23 (lab): ACCEPT read-only; actions route into Mission Control. OBSERVE IN LAB, ACT THROUGH MISSION CONTROL.
- Q24 (visitor correction): ACCEPT WITH STRONG BOUNDARY. Visitor may submit SUGGESTED_CORRECTION as untrusted evidence, never canonical truth, never automatic publication. Rate limit it; owner can ACCEPT / REJECT / IGNORE.
- Q25 (JSON-LD): ACCEPT STRONGLY. Derive JSON-LD from the same semantic projection as the visible page: OBJECT GRAPH -> projection model -> HTML -> JSON-LD. One truth, no SEO truth drift. Add a drift test.
- Q26 (maps): ACCEPT FOR V1. Evidence-backed address/towns/service areas/location objects. No third-party map dependency by default; maps become an optional component/capability later.
- Q27 (demo gate): ACCEPT tailnet for bounded demo only. Mark demo-owner mode loudly in code/config; it must be impossible to accidentally treat this as production auth.
- Q28 (Circle): PARK. Do not kill; preserve the object/projection thinking; stop spending active product effort there.
- Q29 (early success): MODIFY. Bank a passing build as a pinned candidate (PASS -> FREEZE ARTIFACT), then continue safe falsification, research and hardening. Do not keep mutating the winning candidate; improvements compete against it in isolation.
- Q30 (grammar version): STRONGLY ACCEPT pinning. Site records grammar_version, renderer_version, SiteSpec version, relevant source/object revisions. Upgrade becomes a proposal. Owner-approved upgrades.
- Q31 (re-observation): OVERRIDE THE FALSE DICHOTOMY. Observation and regeneration are different operations. FYD should eventually observe on a bounded schedule where authorized (observation NEVER implies automatic live-site mutation). Model: SCHEDULED/ON-DEMAND OBSERVATION -> DIFF -> EVIDENCE -> PROPOSED UPDATE -> OWNER POLICY/APPROVAL -> REGENERATION/PUBLICATION.
- Q32 (lab polish): ACCEPT functional. No vanity work.
- Q33 (lab audience): ACCEPT developer/operator only for now. Do not expose raw internals merely because transparency sounds good.
- Q34 (empty media): ACCEPT recompose/omit for customer sites. PING may deliberately reserve media space because Nolan explicitly requested it. Do not turn one site's design decision into universal grammar.
- Q35 (lab mobile): OVERRIDE. Do not spend scarce hours making the raw lab beautiful on a phone; make it non-broken/responsive enough to inspect. Visitor and owner experiences get the mobile-quality budget. Mission Control eventually must be usable on mobile for approvals/status.
- Q36 (Powered by FYD): MODIFY. Do not make this constitutional. Default subtle "Powered by FYD"; owner can choose attribution per product/plan policy. Business model/distribution control, not renderer invariant.
- Q37 (delivery): ACCEPT proof first. URLs first, screenshots second, let him experience it. Then what improved, what failed, what remains. Do not prime the evaluation.

## The bigger fix: finish Mission Control

Mission Control is no longer another dashboard. It is the operational projection of PING's existing authorities.

North star: OBSERVATION -> CANONICAL EVENT -> MISSION -> DECISION -> CAPABILITY/AUTHORITY -> DISPATCH -> EXECUTION -> RESULT -> VERIFICATION -> EVIDENCE -> REPLAY -> MISSION CONTROL PROJECTION.

Do not create a Mission Control truth store. Existing authorities own truth. Mission Control observes and controls them through authorized paths.

Do not spend hours writing a 100-gap essay first. Start with the critical spine, get that reached-path real, then let the 100-gap inventory continue around it:

- IDENTITY: who/what initiated this?
- TENANT: whose state/work is this?
- EVENT: what canonically happened?
- MISSION: what work is requested?
- DECISION: what bounded judgment was made?
- CAPABILITY: is this actor/executor permitted?
- DISPATCH: which executor actually received it?
- EFFECT: could an external effect have occurred?
- RESULT: what did the executor report?
- VERIFICATION: what independently proves/refutes it?
- EVIDENCE: what durable artifacts support that?
- REPLAY: can we reconstruct why the system reached this state?
- HUMAN DECISION: where was constitutional authority actually required?

Mission Control must show real states, not green boxes. For every mission show: current semantic state, tenant, initiator, causation/correlation, objective, criticality, reversibility, authority required, capability decision, executor, dispatch attempts, external-effect state, evidence, verification, HOLD/UNKNOWN reason, timestamps, replay path. Distinguish NOT_STARTED / STARTED / EFFECT_UNKNOWN / EFFECT_PROVEN / COMPLETED and the system's existing canonical equivalents. UNKNOWN must look unknown: a missing heartbeat is not green; HTTP 200 with a broken body is not healthy; process alive is not capability healthy; worker report is not verification; test passing is not runtime reached.

## Jev into Mission Control in shadow mode

Jev begins as the cheap typed decision plane. Candidate bounded decisions: EXECUTOR_ROUTE, TASK_CLASS, CRITICALITY, NEEDS_MORE_EVIDENCE, COMPLETION_REVIEW, RESEARCH_ACCEPT/VERIFY_MORE/REJECT, TOOL_RISK_CLASS, DUPLICATE/ADAPTER/LEGACY/DORMANT/UNKNOWN.

Initially: JEV HAS ZERO EXECUTION AUTHORITY. Record: state digest, decision schema, Jev model/version, typed answer, probability/distribution, actual policy decision, eventual verified outcome, latency/cost. Mission Control inspects these side-by-side. That gives Replay the dataset to determine whether any decision class deserves later promotion: SHADOW -> ADVISORY -> CONFIDENCE-GATED -> AUTOMATED LOW-RISK.

PROBABILITY IS EVIDENCE INPUT, NEVER AUTHORIZATION.

## Hermes as real executor candidate

Reobserve the WSL bridge before depending on it. Prove: Windows caller -> batch bridge -> PowerShell -> WSL Hermes -> exit status -> artifact/result -> Mission Control event/evidence. Test: success, nonzero exit, malformed invocation, timeout/cancellation semantics, missing WSL, missing Hermes, interrupted worker, result after potential external effect. Do not infer exit 1 = no effect. Once execution might have crossed an external-effect boundary, disappearance/failure can become EFFECT_UNKNOWN/HOLD. The bridge is transport. IT IS NOT AUTHORITY.

## Autonomous swarm through Mission Control

Move the rolling 16-task swarm behind Mission Control. Every task receives: QUESTION, STARTING SHA, WORKTREE, READ/WRITE, ALLOWED PATHS, KNOWN EVIDENCE, EXACT PROOF, FORBIDDEN ACTIONS, RETURN CONTRACT. Preflight before spending provider quota: worktree exists, expected repo marker exists, SHA matches, branch/worktree sane, required executable/provider reachable. Coordinator mistakes such as nonexistent workdirs become DISPATCH_PRECONDITION_FAILED rather than poisoning worker/provider health. Continue IMPLEMENTER + INDEPENDENT FALSIFIER for consequential changes; security/authority/external-effect work adds a semantic reviewer. IMPLEMENTER NEVER CERTIFIES ITSELF.

## Reduce human interrupts

Replay every escalation and classify: HUMAN AUTHORITY ACTUALLY REQUIRED / POLICY ALREADY DETERMINED / REVERSIBLE DEFAULT AVAILABLE / EVIDENCE COULD HAVE RESOLVED / SYSTEM SHOULD HAVE DECOMPOSED FURTHER. Tune to produce fewer unnecessary questions, not merely fewer questions. Humans receive: consequential commitments, authority changes, irreversible/destructive effects, publication, meaningful money/spend beyond policy, new credentials/access, unresolved privacy/security policy, genuine owner taste when evidence cannot resolve it. Everything else becomes deterministic policy, evidence gathering, reversible experimentation, Jev classification, deep-agent reasoning, or independent verification. THE HUMAN IS THE CONSTITUTIONAL AUTHORITY, NOT THE SYSTEM'S MISSING IF STATEMENT.

## Keep the website mission running

Mission Control convergence does not cancel the 24-hour visual mission. At T+24 deliver the promised proof. If HPP is still significantly worse than original HPP: SAY SO AND KEEP WORKING. Do not extend the meaning of the deadline; extend the improvement mission.

## Continue past 24 hours

After the T+24 checkpoint, continue autonomously on proven work: website quality gaps, Mission Control bypasses, stale health claims, HOLD/reaper correctness, Hermes reached-path failures, Jev shadow evaluation, clean-checkout failures, event-authority convergence, worker-runtime falsification, deployment provenance, acquisition->projection defects, visual regression, owner-experience friction. Every candidate goes DISCOVER -> FALSIFY -> ESTABLISH OWNER/REACHABILITY -> PATCH -> INDEPENDENT VERIFY -> INTEGRATE -> RUNTIME PROVE. Not DISCOVER -> PATCH.

## Stop conditions

Never create work merely to keep agents busy. A lane may terminate: FIXED + PROVEN / PASS EXISTING / SUPERSEDED / RETIRED / DEFERRED WITH REOPEN CONDITION / UNKNOWN WITH EXACT MISSING EVIDENCE. Zero-change outcomes are valid. If everything in a bounded area is healthy, LEAVE IT ALONE.

## Operating law

FINISH MISSION CONTROL. ROUTE REAL WORK THROUGH IT. MISSION CONTROL PROJECTS AUTHORITY; IT DOES NOT BECOME AUTHORITY. JEV CLASSIFIES; IT DOES NOT AUTHORIZE. HERMES EXECUTES; IT DOES NOT GOVERN. WORKER OUTPUT IS A CLAIM UNTIL INDEPENDENTLY PROVEN. HOLD MEANS HOLD. UNKNOWN > FICTION. MANY READERS. MANY FALSIFIERS. ONE WRITER PER SEMANTIC UNIT. AUTOMATE EFFORT AGGRESSIVELY. DELEGATE AUTHORITY CONSERVATIVELY. DELIVER THE 24-HOUR WEBSITE CHECKPOINT, THEN KEEP IMPROVING.
