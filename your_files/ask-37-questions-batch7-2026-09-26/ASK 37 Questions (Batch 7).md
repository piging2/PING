# ASK 37 Questions (Batch 7)

The last batch. Every question below passed the filter from the Batch 6 adjudication: a genuine owner decision needed now (policy, risk appetite, delegation, publication, money, credentials, privacy posture, or irreversible commitment), not already answered by the constitution, the Batch 5 and 6 dispositions, or O1-O17, not premature, and not answerable by research first. No repeats from batches 3, 4, 5, or 6.

## 1. Consequence schema: freeze the eight dimensions?

**Context:** Your Batch 6 adjudication introduced CONSEQUENCE with the dimensions reversibility, external_effect, money, publication, privacy, credential_access, destructive_scope, and commitment, as policy input to the existing capability path. Implementation starts now, and every policy evaluation will stamp this schema.

**Recommended default:** Freeze these eight dimensions as the schema. Each is a small enum, not free text. Adding or removing a dimension is a constitutional change that comes back to you.

**Default vs alternative:** Frozen schema with constitutional change control vs an extensible schema the coordinator may grow. The extensible version lets the model drift until "consequence" means whatever a lane found convenient.

**Cost of being wrong:** A drifting schema silently weakens every authorization decision built on it, and replays become incomparable across schema versions.

**Why Nolan, why now:** The schema is the load-bearing joint of the whole authority model. Freezing it is a constitutional act, and it has to happen before the first policy evaluation stamps it.

## 2. Who classifies ambiguous consequence: deterministic rules, or Jev?

**Context:** Most intents classify cleanly with deterministic rules. Some are genuinely ambiguous, for example a worktree patch that might touch a shared config.

**Recommended default:** Deterministic rules classify first. Jev is invoked only when the rules return AMBIGUOUS, and Jev's output is recorded as a classification proposal with its probability distribution, never as an authorization.

**Default vs alternative:** Rules-first with Jev as the ambiguity backstop vs Jev classifying everything. The second option makes a probabilistic model the default classifier and burns the $5/day ceiling on decisions rules could have made deterministically.

**Cost of being wrong:** Jev-first classification turns probability into the default authorization input and makes every classification cost money and latency.

**Why Nolan, why now:** This draws the exact boundary of "Jev classifies; it does not authorize" at runtime, and the bridge between deterministic software and the model has to be specified before the MissionIntent front door is built.

## 3. What earns the consequence classifier the right to auto-authorize?

**Context:** Your correction demands consequence-aware auto approval for low-risk classes, but the classifier itself has no track record yet.

**Recommended default:** The classifier runs in RECORD mode first: it classifies and logs, but never authorizes. It earns auto-authorization for REVERSIBLE plus no-external-effect classes only after a clean record with zero misclassifications against independent review, and you approve the first promotion of each consequential class regardless.

**Default vs alternative:** Record-first with earned promotion vs auto-authorizing from day one. Day-one auto-authorization trusts an uncalibrated classifier with the exact decisions the constitution was written to bound.

**Cost of being wrong:** An uncalibrated classifier auto-approving means the human-out-of-the-loop decision you just forbade, wearing a policy costume.

**Why Nolan, why now:** This is the promotion policy you ordered in the adjudication, made concrete. The mechanism has to be approved before the classifier is wired into the authorization path.

## 4. The customer-facing permission vocabulary: approve the first list?

**Context:** You ordered harvesting the ATProto pattern: granular, human-readable, progressively requested permissions instead of blanket authority.

**Recommended default:** Approve this first vocabulary, each item mapped to exact internal capabilities: READ PUBLIC PROFILE, READ MY FOLLOWING, CREATE FYD RELATIONSHIPS, PUBLISH POSTS, LIKE/REACT, FOLLOW EXTERNAL ACCOUNTS. No other grant language is shown to owners until you approve additions.

**Default vs alternative:** This fixed vocabulary vs letting each lane invent its own grant wording. Invented wording recreates the blanket-authority problem one euphemism at a time.

**Cost of being wrong:** Vague grant language is how "FYD may control my social accounts" happens, and it becomes a trust and liability problem at the first customer dispute.

**Why Nolan, why now:** The vocabulary is the product-facing promise. It is owner taste plus a legal-adjacent commitment, and the owner-experience work needs it before the first customer grant screen is built.

## 5. Progressive permission timing: when is each capability requested?

**Context:** The ATProto model requests stronger capabilities only when the feature needs them.

**Recommended default:** Read-only identity and profile access is the only default grant at connection. PUBLISH POSTS, LIKE/REACT, FOLLOW EXTERNAL ACCOUNTS, and CREATE FYD RELATIONSHIPS are requested at the moment the owner first invokes the feature that needs them, with the human-readable reason shown.

**Default vs alternative:** Just-in-time requests vs all-upfront grants. All-upfront is simpler to build and worse for trust; it also trains owners to click through.

**Cost of being wrong:** Upfront blanket grants destroy the progressive-trust story and make every future permission prompt look like a dark pattern.

**Why Nolan, why now:** This is the owner-experience contract for "Customize with FYD" and customer onboarding. Timing is a product decision, not an implementation detail.

## 6. Default delegation durations: how long does a grant live?

**Context:** Your adjudication mandates that delegation is explicit, scoped, revocable, AND EXPIRING. Nothing yet says how long.

**Recommended default:** Low-risk classes default to 30 days; consequential classes (publish, money, credentials, external effects) default to 24 hours. Every grant records an explicit expiry; renewal requires a fresh grant, never silent extension.

**Default vs alternative:** Expiring-by-default vs grant-until-revoked. Until-revoked is how delegations quietly become permanent and survive past the relationship that justified them.

**Cost of being wrong:** Immortal delegations mean a compromised or stale grant keeps authorizing effects long after anyone remembers it exists.

**Why Nolan, why now:** "Expiring" was your word. The durations turn it from a principle into an enforceable rule, and the risk appetite behind the numbers is yours to set.

## 7. Revocation: what must it guarantee, and how fast?

**Context:** A revoke button that does not propagate is theater. No propagation rule exists yet.

**Recommended default:** Revocation takes effect immediately for new dispatches: no new mission may start under a revoked grant. In-flight missions get a revocation check at their next checkpoint and halt if the grant is gone. Owner-visible projections drop revoked-capability evidence.

**Default vs alternative:** Immediate with checkpoint drain vs eventual propagation. Eventual propagation leaves a window where a revoked grant still authorizes effects.

**Cost of being wrong:** A slow revocation is a live vulnerability: the owner believes access is cut while the system keeps acting.

**Why Nolan, why now:** Revocation is the credibility of the entire delegation model. The guarantee level is a security commitment only you can make.

## 8. Freeze the ApprovalRequest schema?

**Context:** Your adjudication sketched ApprovalRequest with id, proposal_digest, capability, actor, consequence, and expires_at, and ordered chat and Mission Control to resolve the SAME object.

**Recommended default:** Freeze exactly these six fields. Budget stays a mission field, not part of the approval. No surface may add fields without your word.

**Default vs alternative:** Frozen six-field schema vs letting each surface extend it. Extended schemas fork the approval object back into two competing authorities, which is exactly what the adjudication forbade.

**Cost of being wrong:** Schema drift recreates two approval authorities wearing one name, and approvals stop binding to exact digests.

**Why Nolan, why now:** Implementation of the unified approval object starts now. The freeze is what keeps "neither surface owns approval" true in code.

## 9. What binds a chat "yes" to an identity?

**Context:** Chat is an authenticated command surface, not an authority. An ambiguous "yes" must never approve whichever proposal happens to be newest.

**Recommended default:** Chat approvals bind to the authenticated identity of the current chat session. A chat approval is valid only when it names the approval id and references the exact proposal digest. A bare "yes" approves nothing and is recorded as an unbound utterance.

**Default vs alternative:** Strict id-bound approval vs conversational "yes means yes." Conversational approval is how the wrong proposal gets approved at 2am.

**Cost of being wrong:** An unbound "yes" approving the newest proposal is a standing authorization vulnerability in the exact surface you use most.

**Why Nolan, why now:** You use chat as the command surface. The binding rule is the security boundary of your own approvals, and it has to be set before the first chat approval fires.

## 10. Expiry policy per mission class: which class gets which?

**Context:** Your adjudication accepted EXPIRE_DENY, EXPIRE_CANCEL, and EXPIRE_REPLAN as the only options and forbade EXPIRE_APPROVE. The per-class mapping was left open.

**Recommended default:** EXPIRE_DENY for all consequential classes (anything with external effects, money, publication, credentials, or privacy). EXPIRE_CANCEL for engagement passes that can safely replan. EXPIRE_REPLAN only for internal, non-effectful missions. The mapping itself is policy and changes only with your word.

**Default vs alternative:** This conservative mapping vs per-lane choice of expiry behavior. Per-lane choice lets a lane quietly pick the expiry that is most convenient for its own throughput.

**Cost of being wrong:** The wrong expiry on a consequential class converts your silence into an approval, which the constitution explicitly forbids.

**Why Nolan, why now:** "Silence is never approval" was your ruling. The per-class mapping is where that ruling becomes enforceable, and the risk call is yours.

## 11. Approve after terminal: what does the second click do?

**Context:** Nothing yet defines what happens if you approve a request twice, or approve after it was denied or expired.

**Recommended default:** The first terminal transition wins. A second approval of the same digest after a terminal state is a no-op recorded as a duplicate event. Approving the same intent again requires a fresh proposal with a new digest.

**Default vs alternative:** First-terminal-wins vs last-click-wins. Last-click-wins lets a stale approval resurrect a denied or expired request.

**Cost of being wrong:** A resurrected approval re-authorizes an effect you already denied, with a valid-looking audit trail.

**Why Nolan, why now:** This is authorization correctness at the exact moment your own click is the authority. The semantics of your click are yours to define.

## 12. After you complete an auth challenge, does the mission resume on its own?

**Context:** Your generalized pattern parks a mission at WAITING_HUMAN_AUTH while you complete the challenge directly. Nothing says what happens when you finish.

**Recommended default:** The mission resumes automatically only if the proposal digest and the capability set are byte-identical to what was parked. Any change, however small, requires a fresh proposal and a fresh approval.

**Default vs alternative:** Digest-gated auto-resume vs always-resume or always-require-reapproval. Always-resume lets a changed mission ride your auth completion; always-reapprove burns your attention on every routine 2FA.

**Cost of being wrong:** Auto-resume without the digest gate lets a mutated mission smuggle new effects through the moment you proved you are human.

**Why Nolan, why now:** The resume moment is where a hijacked or drifted session converts your authentication into authorization for something you never saw. The gate is the fix, and the tradeoff is yours.

## 13. Budget dimensions: freeze the five, and is money zero by default?

**Context:** Your adjudication made BUDGET a capability constraint: token, money, wall-clock, tool-call, and loop ceiling. The executor cannot exceed it without escalation.

**Recommended default:** Freeze these five dimensions. Money budget defaults to $0 on every mission unless explicitly granted; the other four default to coordinator-set sane bounds. A $0 money budget means the mission cannot spend, not that spending is free.

**Default vs alternative:** Zero-default money vs a small default allowance. A default allowance is how a runaway loop discovers it can spend before anyone notices.

**Cost of being wrong:** Nonzero default money turns every misbehaving loop into a spending incident.

**Why Nolan, why now:** Spend is one of the things you said only you define. The zero default is the risk posture, and it has to be set before the first budgeted mission dispatches.

## 14. Who sets a mission's budget, and what happens at exhaustion?

**Context:** Budgets exist; the setter and the exhaustion behavior are unspecified.

**Recommended default:** The mission author, the coordinator or you, sets all five budgets at dispatch; they are stamped into the mission record. At exhaustion the mission enters HOLD: it stops, it does not fail, and it does not auto-extend. Continuing requires a new approval bound to the same mission.

**Default vs alternative:** HOLD at exhaustion vs auto-extend with notification. Auto-extend converts a capability constraint into a suggestion.

**Cost of being wrong:** Auto-extend lets a runaway mission keep burning tokens, wall clock, or money past the bound you set, which is the opposite of a capability constraint.

**Why Nolan, why now:** Whether a budget is a wall or a speed bump is the entire point of the primitive, and only you can decide which it is.

## 15. Freeze the 12-element Mission Control model?

**Context:** Your adjudication listed the minimum model (MISSION, ACTOR, TENANT, CAPABILITY, CONSEQUENCE, BUDGET, STATE, PROPOSAL, APPROVAL, EXECUTION, RECEIPT, EVENT) and wrote "That is enough."

**Recommended default:** Accept the twelve as a schema freeze. No thirteenth element without your explicit word. If something does not fit the twelve, the design is wrong, not the model.

**Default vs alternative:** Frozen twelve vs organic growth. Organic growth is how Mission Control becomes the new authority with a bigger schema instead of a projection with a small one.

**Cost of being wrong:** Model sprawl reintroduces every competing-authority problem the convergence track was created to kill.

**Why Nolan, why now:** "That is enough" was your verdict. Confirming the freeze now stops the model from growing while nobody is watching.

## 16. Accept the A through N credibility bar as the definition of done?

**Context:** Your adjudication defined fourteen proofs, A through N, that make Mission Control credible, and warned against declaring victory on a complete-looking UI.

**Recommended default:** Accept A through N verbatim as the acceptance gate. Mission Control is not "done" until a real reached path proves all fourteen. UI completeness counts for nothing.

**Default vs alternative:** The fourteen-proof bar vs a milestone-based definition of done. Milestones measure activity; the fourteen measure credibility.

**Cost of being wrong:** Declaring Mission Control done on UI completeness ships an unproven control plane and invites everyone to route around it.

**Why Nolan, why now:** This is your own definition of done. Locking it now prevents the goalposts from moving under schedule pressure later.

## 17. Jev promotion policy: approve the mechanism, not the numbers?

**Context:** Your adjudication ordered you to approve the PROMOTION POLICY, with SHADOW to ADVISORY requiring verified cases, calibration, zero violations, and replay consistency, plus your approval for the first promotion of each consequential class.

**Recommended default:** Approve the mechanism: promotion requires a recorded prediction-vs-outcome dataset, a calibration threshold set per class from that dataset, zero prohibited-effect violations, and replay consistency. The initial bar is 100 consecutive clean shadow cases per class before the first promotion proposal reaches you, and you still approve that first promotion. No arbitrary constants are frozen tonight.

**Default vs alternative:** Mechanism with evidence-set thresholds vs fixed numbers picked tonight. Fixed numbers would be fake rigor: the right N depends on the class and the data.

**Cost of being wrong:** Arbitrary thresholds either block a ready classifier forever or promote an unready one on a number someone invented.

**Why Nolan, why now:** You ordered the policy approved rather than every rung. The mechanism is the policy; the numbers must come from evidence, and the first-promotion gate keeps your authority where it matters.

## 18. Which FYD decisions go to Jev as primary first?

**Context:** You ordered TYPESAFE_JEV to move from shadow to serious primary use for bounded semantic decisions. The first decision classes are the commitment.

**Recommended default:** Two classes first: FAQ factual-reply classification (is this question answerable from the graph, and with what evidence) and engagement candidate quality scoring. Everything else stays in shadow until these two prove out.

**Default vs alternative:** These two narrow classes vs a broad first wave. A broad wave puts a newly serious model on consequential decisions before its calibration is proven in production.

**Cost of being wrong:** The wrong first class puts probabilistic output on a decision with real downside before the serious-use track record exists.

**Why Nolan, why now:** "Serious primary" is a real delegation of judgment. The first classes define the blast radius, and that choice is yours.

## 19. The $5/day Jev ceiling under serious use: keep it, and how is it enforced?

**Context:** You set the $5/day ceiling for shadow use. Serious primary use changes the burn profile completely.

**Recommended default:** Keep $5/day as a hard ceiling. Under serious use it becomes a per-decision-class budget with an automatic pause at 80 percent and a HOLD, never silent degradation, at 100 percent. Hitting the ceiling is surfaced, not absorbed.

**Default vs alternative:** Hard ceiling with HOLD vs a soft ceiling that degrades gracefully. Silent degradation means classifications quietly get worse or stop, and nobody can tell from the outside.

**Cost of being wrong:** An unenforced ceiling is how a classification dependency becomes a surprise bill or a silent quality collapse.

**Why Nolan, why now:** The ceiling was your risk control. Serious use changes what it protects, so its enforcement semantics need your word before the burn starts.

## 20. Authorize the Hermes bridge repair?

**Context:** The independent falsifier confirmed both defects live: the runner exits 127 with zero stdout because the venv path is wrong, and the outcome vocabulary plus launcher flags are missing the effect-state dimension. The defects are located and repairable.

**Recommended default:** Authorize the repair as one bounded mission: fix the venv path and the launcher, add the effect-state dimension to the outcome vocabulary, then rerun the full 8-condition proof. The repair does not promote Hermes to executor; it only restores the bridge to a provable state.

**Default vs alternative:** Bounded repair with proof rerun vs leaving the bridge down or repairing without the proof. Leaving it down strands the executor track; repairing without proof repeats the original sin of trusting unreplayed work.

**Cost of being wrong:** An unproven repair is how a "fixed" bridge silently misreports effects, which is worse than a visibly broken one.

**Why Nolan, why now:** The falsifier proved the defects are real and precisely located. The repair touches shared execution infrastructure, and the proof requirement is what keeps it honest. This is the decision the evidence was gathered for.

## 21. The initial Hermes consequence-class list: approve it?

**Context:** Your adjudication ordered authorizing consequence classes, not "Hermes generally," with worktree patch as the example authorized class.

**Recommended default:** Approve exactly one class now: filesystem patch inside a worktree. Production deploy, social post, email, and host configuration are separate classes, each requiring its own authorization later. No class is implied by another.

**Default vs alternative:** One explicit class vs a starter bundle of "safe-looking" classes. Bundles are how scope creep gets authorized before the first class is proven.

**Cost of being wrong:** An overbroad first grant gives an executor with a freshly repaired bridge more effect classes than its proof supports.

**Why Nolan, why now:** This is the first real execution authority granted under the new model. The narrowness of the first grant sets the precedent for every later one.

## 22. Hermes's first real executor mission: which class goes first?

**Context:** After the bridge proof passes, Hermes needs a first mission class that proves the executor path without betting the business on it.

**Recommended default:** Read-only evidence gathering and worktree file operations inside the convergence track: harvest, screenshot capture, test runs. No external effects. Consequential classes come one at a time, each with its own proof, after this one is boring.

**Default vs alternative:** Boring-first vs starting with a consequential class to "prove it properly." Starting consequential skips the step where the executor path proves it can be dull and reliable.

**Cost of being wrong:** A consequential first mission turns the executor shakedown into an incident shakedown.

**Why Nolan, why now:** The sequencing of risk is a risk-appetite decision. "Boring first" needs your word or the track will reach for the impressive demo.

## 23. Two lanes touch the same authority file: who decides the winner?

**Context:** Your adjudication demands a conflict map and one writer per semantic unit, and says a parallel implementation is evidence that can supersede the proposed patch. The tie-break authority is unspecified.

**Recommended default:** The coordinator stops the merge, compares semantic intent of both diffs, and assigns the single writer. If both intents are valid, the best current evidence wins, but only after independent falsification of both. You are asked only if the semantic intent itself is ambiguous and evidence cannot resolve it.

**Default vs alternative:** Coordinator tie-break with falsification vs newest-wins or loudest-lane-wins. Newest-wins discards proven work; loudest-wins rewards velocity over correctness.

**Cost of being wrong:** The wrong merge authority silently kills the better implementation or, worse, merges two half-compatible authorities into one file.

**Why Nolan, why now:** Authority-file conflicts are where the convergence track either converges or forks. The tie-break rule is the governance of the whole track, and it has to exist before the first conflict, not after.

## 24. Who may retire a stale worktree, and what about dirty diffs?

**Context:** The worktree convergence loop ends in KEEP, HARVEST, SUPERSEDE, MERGE, RETIRE, or UNKNOWN. Retirement of a worktree with unharvested work is irreversible.

**Recommended default:** The coordinator may retire a worktree only when it is clean or its diff has been harvested or superseded with evidence, and the retirement is recorded in the loop. A worktree with unharvested dirty diffs is never retired without your explicit word.

**Default vs alternative:** Evidence-gated retirement vs coordinator discretion on dirty worktrees. Discretion is how a month of proven work disappears into "cleanup."

**Cost of being wrong:** Retiring a dirty worktree destroys evidence and working code that no test or log can reconstruct.

**Why Nolan, why now:** Deletion of unknown work is one of the few truly irreversible acts in this system. The dirty-diff case is the one that needs your authority.

## 25. T+24 cutover: enumerate the acceptance gates?

**Context:** T+24 is today. Batch 5 set the bar as clean-checkout one-click proof plus acceptance gates, but the gates were never enumerated, and the sprint must not cut over on judgment-by-feel.

**Recommended default:** Five gates, all on the pinned candidate build: one, clean-checkout one-click proof passes; two, screenshot-verified zero engineering-semantics leakage on the visitor surface; three, Ask FYD answers are evidence-bounded with visible refusal where the graph is thin; four, no fake contact or estimate submissions anywhere; five, JSON-LD matches the visible facts with no drift.

**Default vs alternative:** These five explicit gates vs the lanes' own sense of "it looks good." The lanes' sense of good is what produced the procedural page that started this sprint.

**Cost of being wrong:** Cutting over without gates ships the demo-owner console to the stable URL you are judging, and the sprint's whole premise collapses.

**Why Nolan, why now:** The checkpoint is hours away. The gates have to be frozen before the judging starts, or they will be negotiated after the fact.

## 26. The Ask FYD evidence minimum: what counts as excellent?

**Context:** Batch 5 kept one evidence-backed Ask FYD interaction as the product proof, but "evidence-backed" was never defined and lanes are building toward it today.

**Recommended default:** One question per demo site. The answer draws only from the site's object graph, cites the evidence it used, and says plainly what it does not know when the graph cannot support the question. A fluent answer with no cited evidence fails the gate.

**Default vs alternative:** Cited-evidence-or-refusal vs fluency as the bar. Fluency without evidence is the exact failure mode the context-projection boundary was built to kill.

**Cost of being wrong:** An ungrounded concierge on the demo site teaches every future owner that Ask FYD invents answers, which kills the product's core promise.

**Why Nolan, why now:** This is the one interactive proof in the T+24 package. The bar has to be set before the lanes finish building, not graded after.

## 27. Cutover sequencing and the rollback window?

**Context:** Batch 5 said to pin the winning candidate and cut over only after the gates pass. Nothing says in what order, or how long the old build stays reachable.

**Recommended default:** Pin the winning candidate and freeze it. Run the five gates against the pinned build. Cut stable over only after all five pass. Keep the original build reachable as the rollback for 7 days, then retire it through the normal worktree loop.

**Default vs alternative:** Pinned-gate-cutover with a 7-day rollback vs cut-and-delete. Cut-and-delete makes a bad cutover irreversible at the exact moment visitors arrive.

**Cost of being wrong:** Without a pinned build and a rollback window, a failed cutover becomes a rebuild-from-memory incident on the live URL.

**Why Nolan, why now:** The cutover is the one irreversible product act in the sprint. The sequence is the safety plan, and it is yours to approve.

## 28. Freeze the data classification taxonomy?

**Context:** Your adjudication sketched PUBLIC, OWNER, CONFIDENTIAL, SECRET, and REGULATED/SENSITIVE as the classes and ordered approving the DATA POLICY, not every packet.

**Recommended default:** Freeze these five classes. Every acquisition flow stamps a class at ingestion. SECRET and REGULATED never enter model context and never enter immutable events. The taxonomy changes only with your word.

**Default vs alternative:** Frozen five-class taxonomy vs per-flow folksonomies. Folksonomies mean the same datum is PUBLIC in one flow and CONFIDENTIAL in another, and the policy becomes unenforceable.

**Cost of being wrong:** An unclassified or misclassified datum is how a provider token ends up in a model prompt or an immutable log.

**Why Nolan, why now:** The taxonomy is the vocabulary the whole data policy is written in. It has to be frozen before the destination rules reference it.

## 29. Default destination rules per data class?

**Context:** The taxonomy without destination rules is a labeling exercise. Nothing yet says where each class may go.

**Recommended default:** PUBLIC may go to approved model providers and public surfaces. OWNER goes to explicitly approved processors only, with owner consent. CONFIDENTIAL goes to owner-approved processors, never used for training. SECRET never leaves the device or vault and never enters model context. REGULATED is purpose-limited and jurisdiction-aware, with handling approved per purpose.

**Default vs alternative:** This explicit matrix vs "approved flows" decided per integration. Per-integration decisions recreate the packet-by-packet approval burden you just abolished.

**Cost of being wrong:** The wrong default on one class is a privacy incident or a credential leak wearing a policy exception.

**Why Nolan, why now:** This matrix IS the data policy you said you would approve instead of every packet. The defaults are the policy.

## 30. Backup research: approve the mandate and the success criteria?

**Context:** You said YES to backup and HOLD on picking a destination from taste. The research has no mandate and no definition of done.

**Recommended default:** Approve this research mandate: encrypted formats, client-side encryption, retention, credential isolation, incremental backup, corruption detection, and RPO/RTO targets. Success is a restore proven on a scratch machine, not a design doc. The researcher returns the smallest viable destination decision for your approval.

**Default vs alternative:** Mandate with proven restore vs open-ended research. Open-ended research returns a comparison matrix and never a restorable backup.

**Cost of being wrong:** A backup that has never restored is not a backup, and the first time you need it is the worst time to discover that.

**Why Nolan, why now:** "A backup that has never restored is not a backup" was your line. The mandate turns it into an assignment with a falsifiable finish, and the destination still comes back to you.

## 31. Engagement migration order: which pass goes first?

**Context:** Your adjudication ordered migrating ONE engagement pass through the spine and proving the full cycle before the next. The choice and order are open.

**Recommended default:** X first: likes only, the simplest effect class and the smallest blast radius. Then Threads, then Instagram, then Facebook, with TikTok last given its aggressive bot detection. One pass completes dispatch through replay before the next begins.

**Default vs alternative:** Simplest-first vs hardest-first. Hardest-first burns the proof cycle on the surface most likely to produce ambiguous outcomes, which poisons the proof.

**Cost of being wrong:** A failed first migration teaches the wrong lessons and stalls the whole spine behind the hardest surface.

**Why Nolan, why now:** The migration order is the rollout risk plan for the revenue-adjacent machinery. The first proof sets the template, and the ordering is a risk call.

## 32. During migration, do the old cron paths keep running?

**Context:** The old engagement crons are live and producing. The migrated pass must not double-dispatch the same window.

**Recommended default:** Old paths keep running until the migrated class completes its proof cycle. Cutover is per pass with a single handoff moment: the old cron for that class stops, the spine-owned pass starts, and the handoff is recorded. The migrated pass and the old cron never fire on the same window.

**Default vs alternative:** Handoff per class vs parallel running or flag-day cutover. Parallel running double-fires external effects; flag day bets all five surfaces on one unproven cutover.

**Cost of being wrong:** Double-dispatch during migration means duplicate likes, comments, or follows, which is exactly the kind of external-effect mess the spine exists to prevent.

**Why Nolan, why now:** Duplicate external effects are the failure mode your own engagement rules treat as most serious. The handoff semantics are the guardrail.

## 33. Make the six hostile tenant tests the binding gate?

**Context:** Your adjudication sketched six hostile tests for tenant isolation and ordered testing default-deny before any second external tenant. They are not yet a binding gate.

**Recommended default:** Adopt all six as the mandatory gate: A mission cannot read B; an A approval cannot approve B; a worker cannot substitute tenant from the request body; missing trusted context fails closed; cross-tenant administration requires an explicit capability; projections never leak B evidence to A. All six pass before any second external tenant exists.

**Default vs alternative:** Binding six-test gate vs "we will test before then." A vague promise is how the second tenant arrives before the tests do.

**Cost of being wrong:** A cross-tenant leak is the single most damaging failure this system can produce: one customer's data and approvals visible to another.

**Why Nolan, why now:** Tenant isolation is the privacy posture you said only you define. The gate is where the posture becomes a requirement instead of an intention.

## 34. Existing records get tenant scope: backfill or stamp at the front door?

**Context:** The tenant-aware model needs scope on historical missions and events, but H1 forbids silently reinterpreting history.

**Recommended default:** Stamp tenant context at the MissionIntent front door for all new missions. Backfill existing canonical records lazily with a default tenant id, recorded as a superseding annotation, never as a rewrite of the original event.

**Default vs alternative:** Annotation backfill vs rewriting history or leaving old records scopeless. Rewriting violates the historical record; leaving them scopeless leaves a permanent hole in the isolation story.

**Cost of being wrong:** Rewritten history destroys the audit trail the whole constitution depends on; scopeless records become the bypass path around tenant enforcement.

**Why Nolan, why now:** This is the migration rule for the canonical record itself. How history gets scope without being rewritten is a constitutional-level decision.

## 35. Approve the classifier's operating target?

**Context:** You named the next improvement explicitly: the classifier must get comfortable returning 7 real questions, or zero, instead of 37.

**Recommended default:** Approve the operating target: the classifier optimizes for human decisions per unit of consequence, not questions generated. It returns exactly the questions that survive, even if that is seven or zero, and it never pads to a fixed size. The weekly audit reports what was resolved autonomously, escalated, held, and misclassified.

**Default vs alternative:** This target vs a quota or a "fewer questions" soft goal. A quota recreates the 37-question theater; a soft goal is unenforceable.

**Cost of being wrong:** Without the target, the classifier keeps interrupting you 37 times to prove it is working, which is the design failure your adjudication opened with.

**Why Nolan, why now:** You specified this improvement yourself. Approving it as the classifier's formal target is what makes it real instead of aspirational.

## 36. Approve the weekly audit format?

**Context:** SI-03 requires a weekly audit cross-checking your directed messages against the escalation log. The format determines whether it catches anything.

**Recommended default:** The audit lists every Nolan-directed question against its escalation-log record, counts by class (autonomously resolved, escalated, held, misclassified), and names any question that reached you without surviving the classifier. First audit due 2026-10-04, then weekly.

**Default vs alternative:** This adversarial format vs a summary of "escalations handled." A summary audits the log against itself and cannot catch a question that bypassed the classifier entirely.

**Cost of being wrong:** A weak audit certifies a classifier that is quietly not being used, and the human-interrupt budget leaks with nobody watching.

**Why Nolan, why now:** The audit is the enforcement arm of your "no more 37-question batches" order. Its format decides whether the order holds.

## 37. The convergence coordinator's standing delegation: what may it authorize without you?

**Context:** You just ordered the coordinator to implement the 37 adjudicated decisions now and keep the swarm working. That grant currently has no written bounds.

**Recommended default:** The coordinator may authorize reversible, in-worktree, non-publishing work with no external effects, and may spend within the mission budgets you set. Anything touching production, publication, money beyond budget, credentials, shared host configuration, or irreversible deletion comes to you. The bounds are reviewed when the track's phase changes.

**Default vs alternative:** Written bounded delegation vs the current open-ended "implement it all." Open-ended is how a coordinator slowly becomes the authority you just forbade Mission Control from becoming.

**Cost of being wrong:** An unbounded coordinator is a second human-approval bottleneck wearing an automation costume, or worse, a quiet grant of the exact authorities the constitution reserves to you.

**Why Nolan, why now:** You are the delegation authority and you just made a large delegation. Writing its bounds now is the difference between delegation and abdication.

This is the last batch. From here, questions reach Nolan only when they survive the classifier: genuine owner authority, needed now, unanswerable by constitution, evidence, or reversible experiment. The system is successful when it knows the questions it does not need to ask.