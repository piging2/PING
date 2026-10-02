# ASK 37 QUESTIONS (Batch 6)

Date: 2026-09-26

Two orders stand side by side. Nolan ordered another 37 questions, and Nolan ruled that batch 5's 37 questions prove the escalation classifier is too permissive. This batch resolves the tension the way he specified: it asks only questions where HUMAN AUTHORITY IS ACTUALLY REQUIRED. Not 37 uncertainties the system could resolve itself. Every question below maps to his escalation bar: consequential commitments, authority changes, irreversible or destructive effects, publication, meaningful money or spend beyond policy, new credentials or access, unresolved privacy or security policy, or genuine owner taste that evidence cannot resolve. Everything else now resolves in-system as deterministic policy, evidence gathering, reversible experimentation, Jev classification, deep-agent reasoning, or independent verification. Batch 5 was fully decided by the owner disposition dated 2026-09-26; batches 3 and 4 are locked. Nothing here repeats a decided question.

## 1. Mission Control single-front-door cutover: when do the old dispatch paths stop being legal?

**Context:** The 100-gap inventory names "no single dispatch front door" as gap 1. Today cron entries, the WorkerRuntime broker, fyd-factory claim.sh, the five engagement workers, and ad hoc ssh all dispatch work themselves. The north star says every mission dispatches through Mission Control, but nobody has authorized the cutover point where the old paths stop being legal.

**Recommended default:** Cut over surface by surface behind the new dispatch endpoint, starting with the engagement passes, each cutover noted in the engineering ledger. Old paths become callers of the front door rather than being ripped out.

**On default vs alternative:** On the default, dispatch becomes observable and stoppable without breaking running work. On the alternative (leave the bypasses), Mission Control is a dashboard over work it cannot control, and the north star is fiction.

**Cost of being wrong:** A bad cutover could stall live engagement or outreach. Never cutting over leaves every bypass as an uncontrolled execution path that audit cannot see.

## 2. Engagement passes as Mission Control missions: reroute the five social crons?

**Context:** The five social engagement crons (Instagram, Facebook, Threads, TikTok, X) dispatch themselves from cron bodies and record outcomes in prose logs. The north star requires one traceable control-plane story per consequential operation, and the gap inventory says observations must enter the event store, not prose.

**Recommended default:** Reroute all five engagement passes as Mission Control missions once the dispatch front door exists, keeping cadence, caps, guards, and ledgers unchanged. The pass becomes a mission with typed states instead of a cron with a log file.

**On default vs alternative:** On the default, WHY DID IT STOP becomes answerable from events and a stuck pass becomes HOLDable. On the alternative, engagement stays the largest body of work that bypasses the control plane.

**Cost of being wrong:** A bad reroute could drop a pass or double-dispatch actions. Leaving engagement outside Mission Control keeps the highest-volume external-effect system on the device unaudited.

## 3. Hermes promotion: may it execute missions with external effects?

**Context:** The owner disposition orders reobserving the WSL bridge and proving the reached path (Windows caller to artifact to Mission Control event), and states the bridge is transport, not authority. Once the reached path is proven, the open decision is whether Hermes may execute missions that cross external-effect boundaries, or stays limited to non-consequential work.

**Recommended default:** Hermes stays non-consequential until the reached-path proof plus the failure-mode tests (nonzero exit, timeout, interrupted worker, effect after disappearance) all pass clean-checkout replay. Promotion to consequential execution is then a separate explicit authorization per mission class.

**On default vs alternative:** On the default, no external effect happens through an unproven transport. On the alternative (promote on transport proof alone), a bridge failure mode could produce EFFECT_UNKNOWN that the system misreads as clean.

**Cost of being wrong:** Promoting early risks an unobserved external effect (a send, a post, a file change) with no receipt. Holding back costs executor capacity the swarm could use.

## 4. Hermes capability boundary: may it install software on the Pig?

**Context:** Hermes runs on the Pig's Windows side through the batch bridge. Nothing currently stops a Hermes mission from installing or upgrading software there, which would change the machine every other executor depends on. No capability grant for machine modification exists.

**Recommended default:** Deny by default. Hermes may use preinstalled tools only. Installing, upgrading, or reconfiguring Pig software requires a named capability grant recorded in Mission Control, requested per mission.

**On default vs alternative:** On the default, the automation host stays stable and every machine change is attributable. On the alternative, a worker can silently change the shared host and every other lane inherits the drift.

**Cost of being wrong:** An unapproved install could break the browser drivers, the engagement passes, or the :3100 host at 02:00 with no provenance for what changed.

## 5. Jev promotion: who authorizes a decision class moving beyond shadow?

**Context:** The disposition sets the ladder SHADOW to ADVISORY to CONFIDENCE-GATED to AUTOMATED LOW-RISK, with promotion earned by a Replay-verified dataset of predictions versus verified outcomes. Undecided: when a decision class earns promotion, does Nolan approve each promotion individually, or does he pre-authorize promotion criteria the system applies itself?

**Recommended default:** Nolan approves each promotion individually, per decision class, on the evidence of the shadow dataset. No standing pre-authorization.

**On default vs alternative:** On the default, no decision class gains authority without his explicit word, and each promotion is reviewable. On the alternative (pre-authorized criteria), promotions happen while he sleeps, which is the authority creep the axioms forbid.

**Cost of being wrong:** Auto-promotion could let a miscalibrated class authorize consequential routing. Per-class approval costs him a handful of decisions, which is the correct price for authority changes.

## 6. Approval delegation: does approval authority stay solely with Nolan?

**Context:** Today Nolan is the only approver for consequential proposals. As Mission Control starts holding real approvals (WAITING_APPROVAL is gap 8 in the inventory), the question is whether approval authority stays solely with him forever, or whether classes of low-risk approvals can be delegated to standing policy or confidence gates.

**Recommended default:** Approval authority stays solely with Nolan. Delegating any approval class is itself an authority change requiring his explicit word, per class, with a recorded scope and revocation path.

**On default vs alternative:** On the default, constitutional authority stays where it belongs and every delegation is visible. On the alternative, the system starts approving its own proposals, which collapses the human authority the whole architecture is built around.

**Cost of being wrong:** Silent delegation means consequential effects proceed without the one authority the system recognizes. Refusing all delegation keeps him as the bottleneck, which the timeout policy (Q28) must then handle honestly.

## 7. Audit log: append-only even for Nolan, or may he redact?

**Context:** The north star requires answering WHO DID WHAT, WHY, UNDER WHICH CAPABILITY, AGAINST WHICH OBJECT, WITH WHAT RESULT, and replay depends on history not being rewritten. Undecided: is the audit trail append-only even for Nolan, or may he redact or correct entries?

**Recommended default:** Append-only for everyone including Nolan. Corrections are new events that supersede, never edits to history. Redaction of secrets is a typed event, not a silent edit.

**On default vs alternative:** On the default, replay and audit stay trustworthy against everyone, which is what makes the log worth keeping. On the alternative, history becomes editable by the most powerful actor, and every future dispute about what happened becomes unresolvable.

**Cost of being wrong:** Editable history destroys the one property that makes Mission Control's audit worth building. Strict append-only means a mistaken entry lives forever as superseded history, which is the honest price.

## 8. Owner identity store: where does verified owner identity live, and who may read it?

**Context:** Batch 5 Q16 put production owner auth on the roadmap: PING OWNER IDENTITY plus verified ownership claim plus authentication adapters. The roadmap's first real decision is the store itself. Owner identity documents and verification artifacts have to live somewhere, and someone has to be allowed to read them. No such store or readership policy exists today.

**Recommended default:** The identity store lives on the Pig only, encrypted at rest, readable solely by the capability authority at verification time and by Nolan on request. No cloud copy, no worker-readable cache, retention tied to the customer relationship plus a defined purge.

**On default vs alternative:** On the default, the most sensitive data FYD will ever hold has the smallest possible blast radius. On the alternative (convenient cloud-synced store), verification gets easier and a breach exposes every verified owner at once.

**Cost of being wrong:** A loose identity store turns FYD into a honeypot of real owner identity documents. An over-strict one makes legitimate verification painful, which is fixable, while a breach is not.

## 9. New social surface: authorize LinkedIn as the sixth engagement surface?

**Context:** Engagement runs on five surfaces (Instagram, Facebook, Threads, TikTok, X), each with its own credential, guard, and ledger. Adding LinkedIn means a new credential, a new external-effect surface, new platform risk, and new targeting policy. Nothing in the standing orders authorizes a sixth surface.

**Recommended default:** Do not add LinkedIn until the five-surface pipeline is fully behind Mission Control with the deterministic state machine Nolan ordered. Then propose it as a mission with its own guard and ledger, for explicit approval.

**On default vs alternative:** On the default, the new surface inherits the hardened pipeline instead of the sprawl. On the alternative (add now), a sixth credential and sixth bespoke workflow join the system before the first five are consolidated.

**Cost of being wrong:** Adding early multiplies the exact sprawl Mission Control exists to collapse. Waiting costs potential reach, which is recoverable later.

## 10. Mission Control access beyond the tailnet: yes or no?

**Context:** Mission Control will hold approvals, and some will need Nolan while he is traveling off the tailnet. Exposing any control-plane surface beyond the tailnet is an access change with real security consequences. Today everything control-plane sits behind the tailnet boundary.

**Recommended default:** No off-tailnet Mission Control access. Approvals wait until he is on the tailnet. The timeout policy (Q28) defines what waiting means.

**On default vs alternative:** On the default, the control plane keeps its current network boundary and no new attack surface appears. On the alternative, approvals get convenient anywhere, but the keys to every consequential operation become reachable from the open internet.

**Cost of being wrong:** Off-tailnet exposure makes Mission Control the highest-value target on the device. Keeping it tailnet-only means a traveling Nolan cannot approve, which the timeout policy must absorb.

## 11. Offsite encrypted backup of the canonical event store: authorize the destination and credentials?

**Context:** The canonical event store is becoming the single record of everything. Today it lives on the device with no defined offsite backup. A dead Pig would take the audit trail, the ledgers, and replay history with it. An offsite backup needs a destination and credentials, both new.

**Recommended default:** Authorize one encrypted offsite backup destination with credentials held in the Secure Vault, the backup defined as a Mission Control mission with receipts, and the restore tested once before it counts.

**On default vs alternative:** On the default, the canonical record survives the machine. On the alternative, a single hardware failure erases the history the whole trust model depends on.

**Cost of being wrong:** No backup means the north star's memory dies with one disk. A careless backup (wrong destination, untested restore, leaked credentials) creates a second copy of everything sensitive outside his control.

## 12. Standing intelligence spend policy after the sprint: what replaces the 24-hour rule?

**Context:** Batch 5 Q2 set the 24-hour rule (useful burn, no runaway loops, per-lane accounting, T+24 total report). After the checkpoint that rule expires, and there is no standing policy for ongoing burn across lanes, the swarm, harvesters, and serious Jev use. The disposition states unbounded spend is itself an external effect.

**Recommended default:** Carry the sprint's controls forward as standing policy (per-lane accounting, loop ceilings, duplicate-work detection, automatic stop on repeated identical failure, weekly spend report), with a monthly ceiling Nolan sets once he sees the T+24 total.

**On default vs alternative:** On the default, burn stays tied to visible value and he sets the ceiling from evidence. On the alternative (no standing policy), the machine spends while he sleeps with no number he chose.

**Cost of being wrong:** No policy means a runaway loop can burn real money overnight with no tripwire. A ceiling set blind could throttle valuable work, which is why the default waits for the T+24 total.

## 13. FYD pricing: authorize the published tiers as the actual offer?

**Context:** A founding-client pricing artifact exists with three tiers (Launch at $500 one-time plus $300/month, Momentum at $1,000 one-time plus $900/month, Concierge Partner at $3,000/month), but Nolan has never authorized these as the actual offer. Quoting them to a prospect is a money commitment made in his name.

**Recommended default:** The tiers stay draft until Nolan authorizes them per tier. Nothing quotes prices to a prospect, in outreach or in Ask FYD, before that authorization.

**On default vs alternative:** On the default, no price is ever promised that he did not set. On the alternative, the machine starts selling at prices he never approved, and walking them back burns trust with the first prospects.

**Cost of being wrong:** Unauthorized pricing quoted once becomes the price he is held to. Keeping it draft costs nothing until the first real pricing conversation, which is exactly when he should decide.

## 14. PING Social site launch: publish the sprint-generated site as the business website?

**Context:** The sprint is generating a PING Social site from real public facts as the high-design stress test. Publishing it as the actual business website is publication: it becomes what prospects see when they look PING Social up. The batch-5 default made the stress test real, but nobody authorized the launch.

**Recommended default:** The generated PING site stays a stress-test artifact until Nolan judges it at the checkpoint and gives explicit publication approval, same bar as the Vercel demo refresh.

**On default vs alternative:** On the default, the business's public face changes only on his word. On the alternative, a sprint artifact becomes the company website without a launch decision.

**Cost of being wrong:** Auto-publishing puts unjudged work in front of prospects. Holding back costs nothing since the current presence keeps working.

## 15. Public FYD launch announcement: authorize it, and when?

**Context:** Beyond the portfolio demo refresh (batch 5 Q22, explicit approval required), there is no authorized public announcement of FYD itself: no launch post, no announcement on PING channels. Announcing is publication with reputational consequences in both directions.

**Recommended default:** No public FYD announcement until the website product passes Nolan's pride test on real customer work and Mission Control can show the control-plane story behind it. The announcement itself is a separate explicit approval.

**On default vs alternative:** On the default, FYD launches with proof instead of promises. On the alternative, an early announcement creates expectations the product cannot yet meet, and every later miss is public.

**Cost of being wrong:** Announcing early spends reputation the product has not earned. Waiting means the launch lands with evidence, which is the stronger story anyway.

## 16. Customer portfolio usage: may FYD show customer sites, and on what consent?

**Context:** FYD will want to show customer sites as proof, and the revamp pitch already cites the HPP demo. Using a paying customer's site or logo in FYD's portfolio is publication of someone else's business, and no consent policy exists.

**Recommended default:** Portfolio use requires explicit per-customer opt-in, recorded as an event, revocable, with takedown honored promptly. Never a default term, never assumed from the service relationship.

**On default vs alternative:** On the default, no customer ever discovers their business in FYD's marketing without having said yes. On the alternative (opt-out or assumed), the first surprised customer is a trust fire.

**Cost of being wrong:** Assumed consent that angers one customer poisons the exact trust the product sells. Opt-in costs a few missing logos, which honest asks will fill.

## 17. Observation retention, erasure, and opt-out: what are the limits on watching businesses?

**Context:** FYD and the outreach machine accumulate observations about real businesses (crawls, social profiles, inferred facts) with no retention policy, no erasure path, and no way for a business to say stop watching me. This is the unresolved privacy policy at the heart of an observation-driven product.

**Recommended default:** Bounded retention for raw observations, owner-visible provenance for derived facts, honored opt-out from acquisition (a business that says stop is never crawled again), and an erasure request path with recorded receipts.

**On default vs alternative:** On the default, the product's appetite for data has a stated limit and a door. On the alternative, FYD keeps everything forever and a business that objects has no recourse, which is the surveillance posture Nolan forbids.

**Cost of being wrong:** Keeping everything forever creates a liability that grows with every crawl. Honoring opt-out may lose some data, which is the correct price for consent.

## 18. Visitor interaction data: how long are Ask FYD conversations kept, and who may use them?

**Context:** Ask FYD will hold conversations with visitors, and visitor questions can contain personal information (names, phone numbers, addresses in estimate requests). No policy says how long these interactions are kept, who may read them, or whether they train anything.

**Recommended default:** Visitor interactions are retained only as long as needed for the owner's business purpose, visible to the site owner, never used to train models, never shared with third parties, with a defined purge.

**On default vs alternative:** On the default, a visitor's question to a plumber's website does not become permanent training data. On the alternative, every visitor interaction accumulates into a dataset nobody authorized.

**Cost of being wrong:** Retaining visitor PII without a policy repeats the exact data-hoarding the product criticizes. Purging aggressively only costs conversation history, which the owner can export first.

## 19. Prospect and observation data leaving the device: what is the boundary?

**Context:** The Meta AI tandem already sends context packs off-device, and future flows (research, verification) will move prospect and observation data to third parties. There is no stated boundary for what business or personal data may leave the device and to whom.

**Recommended default:** No prospect or observation PII leaves the device except through explicitly authorized flows with a recorded purpose. Each flow names the data classes it may carry, and new destinations require Nolan's approval.

**On default vs alternative:** On the default, every off-device flow is a conscious choice with a boundary. On the alternative, convenience quietly turns the device into a data exporter and nobody can say where a prospect's information went.

**Cost of being wrong:** An undeclared flow that leaks prospect data is a privacy incident with his name on it. A strict boundary only costs some manual steps until flows are authorized, which is the work anyway.

## 20. AI disclosure on customer sites: must the site say it was AI-generated?

**Context:** FYD generates the site and Ask FYD answers as the business's concierge. Whether customer sites must disclose AI involvement to visitors is undecided, and expectations differ by jurisdiction and by owner.

**Recommended default:** Every FYD customer site carries an honest disclosure that the site was AI-generated and the concierge is AI, phrased plainly, with the exact wording owner-visible and owner-adjustable within honesty bounds.

**On default vs alternative:** On the default, no visitor is ever misled about who they are talking to, and the product's honesty story is structural. On the alternative (no disclosure), conversions might be marginally higher until the first visitor feels deceived, and then the story is gone.

**Cost of being wrong:** Hiding AI involvement risks a deception scandal that attaches to the customer's business, not just FYD. Disclosing costs nothing but a line of honest copy.

## 21. Form the LLC for PING Social: now, or before the first paying customer?

**Context:** PING Social currently operates without an LLC, while running autonomous outreach, publishing content, and preparing to sell AI services. The liability for everything the machine does currently attaches to Nolan personally.

**Recommended default:** Form the LLC before the first paying customer or the first high-visibility launch, whichever comes first. Until then, keep the current posture but sign no customer commitments in the business name without it.

**On default vs alternative:** On the default, liability for the machine's actions sits behind a real entity before money changes hands. On the alternative, the first customer contract or the first public mistake lands on him personally.

**Cost of being wrong:** Operating unincorporated into a customer dispute means personal exposure. Forming early costs a filing fee and some paperwork, which is cheap insurance.

## 22. Legal packet before the first real owner: who authors the ToS, privacy policy, and data terms?

**Context:** Before a real business owner uses FYD, the product needs terms of service, a privacy policy, and data portability and erasure terms. Nobody has authored them, and agent-drafted legal text is not legal advice.

**Recommended default:** Engage real counsel (or a vetted template reviewed by counsel) for the packet before the first real owner. The packet covers ToS, privacy, portability, erasure, and AI-disclosure terms, and no owner onboards without accepting it.

**On default vs alternative:** On the default, the first customer relationship starts on real legal footing. On the alternative (agent-drafted terms or none), the first dispute is fought with documents that may not hold.

**Cost of being wrong:** Weak terms fail exactly when they are needed, in a dispute. Proper counsel costs money and time now, which is what businesses pay before they handle other people's data.

## 23. Trademark for PING Social: file, or keep operating unprotected?

**Context:** The brand is in active public use (Facebook page, outreach, content) with no trademark filing. Someone else could file first, or a dispute could force a rename after the brand has equity.

**Recommended default:** File for the trademark once the PING site launches and the name is final. Before that, keep a dated record of first use, which the existing artifacts already serve.

**On default vs alternative:** On the default, the brand gains legal protection proportionate to its growing exposure. On the alternative, continued unprotected use risks a forced rename at the worst possible moment.

**Cost of being wrong:** A dispute without a filing means fighting from weakness. Filing early costs a fee for a name that is already stable, so the only real question is timing.

## 24. Monument View trial terms: what exactly is Nolan offering them?

**Context:** Monument View is the designated first owner test, with Nolan making first contact in person when the loop is green (batch 4, decided). No terms exist: duration, scope, cost, what happens to the site and data afterward, and what Nolan is promising them.

**Recommended default:** A bounded free trial with a written plain-language agreement: scope, duration, what happens at the end (they keep or lose the site, data handling), and no open-ended promises. Nolan approves the terms before first contact.

**On default vs alternative:** On the default, the first real relationship starts with clear expectations on both sides. On the alternative (handshake only), any misunderstanding becomes a relationship problem with people he knows personally.

**Cost of being wrong:** Vague terms with people he knows well risk the personal relationship, which is worth more than the trial. Writing it down costs an hour and protects both sides.

## 25. FYD and PING licensing: proprietary, open core, or open source?

**Context:** The system harvests open-source patterns aggressively, but no licensing decision exists for FYD or PING themselves. The choice shapes hiring, partnerships, competition, and what the harvest discipline may absorb. Licensing posture is easiest to set deliberately and hardest to change after code goes public.

**Recommended default:** Stay proprietary for now. Decide the licensing posture deliberately before the public launch (Q15), not as an accident of what got published first.

**On default vs alternative:** On the default, the option stays open while the product proves itself. On the alternative (drifting open by default through published code), the licensing posture gets decided by the first public repo, irreversibly.

**Cost of being wrong:** An accidental open-sourcing cannot be undone. Staying proprietary while deciding costs nothing and keeps every option alive.

## 26. How should Mission Control reach Nolan for approvals?

**Context:** Approvals will wait in Mission Control, and some will be time-sensitive. The channel matters: chat message, feed post, SMS, or something else. This is his attention on the line, and the wrong channel means approvals rot or he gets paged for trivia.

**Recommended default:** Approvals surface in chat and the feed, batched and quiet. Nothing pages him outside those channels unless he defines a P0 paging rule separately.

**On default vs alternative:** On the default, approvals live where he already looks, with no new interrupt surface. On the alternative (SMS or push for everything), every held mission becomes a phone buzz and the quiet-feed rule dies.

**Cost of being wrong:** A noisy channel trains him to ignore approvals, which is worse than slow approvals. A quiet channel means some approvals wait, which the timeout policy handles.

## 27. Approval surface: chat message or Mission Control UI as primary?

**Context:** When an approval is pending, Nolan can approve in chat (a message that becomes a canonical approval event) or in the Mission Control UI (approve or reject with before and after). The build needs to know which surface is primary, because each has different design and security implications.

**Recommended default:** Chat is the primary approval surface (a clear approve or reject message becomes the canonical event). The Mission Control UI shows the same approvals as a secondary surface with full context.

**On default vs alternative:** On the default, approving stays inside the conversation he already lives in, with the UI for the cases that need before-and-after inspection. On the alternative (UI-only), every approval requires opening the control plane, which adds friction exactly when speed matters.

**Cost of being wrong:** UI-only approvals get skipped when he is busy, so consequential work stalls. Chat-only approvals without UI context risk approving what he has not fully seen, which is why both exist with chat primary.

## 28. Approval timeout: hold forever, or expire to a safe default?

**Context:** A mission in WAITING_APPROVAL with no response sits indefinitely unless a timeout policy exists. Hold-forever respects his authority absolutely. Expiry keeps the system moving but lets the system act on his silence.

**Recommended default:** Approvals hold indefinitely by default. Expiry exists only where Nolan pre-authorizes it per mission class, with expiry routing to a safe default (usually the proposer's conservative fallback), never to silent approval.

**On default vs alternative:** On the default, his silence never becomes consent. On the alternative (timeouts that approve), the system learns to wait out the human, which inverts the constitutional order.

**Cost of being wrong:** Silence-as-consent is the most dangerous default in the whole architecture. Hold-forever means some missions wait days, which is honest and visible in the held queue.

## 29. Standing 2FA-wait policy: generalize the Instagram carve-out or let it expire?

**Context:** The Instagram run got a one-time carve-out: with Nolan's explicit chat approval, the worker could bring the 2FA screen and wait instead of failing closed. That carve-out expires after the run. The standing question is whether any platform's 2FA or login challenge may wait on his explicit chat approval, or whether auth always fails closed.

**Recommended default:** The carve-out becomes standing policy, narrowly: only on his explicit in-chat statement for that specific challenge, only for the run in progress, browser brought to the challenge screen, no credential entry by the worker, and the authorization expires with the run.

**On default vs alternative:** On the default, a challenge he is willing to clear does not kill a whole pass, and the permission stays tightly scoped. On the alternative (always fail closed), every 2FA event ends the run even when he is sitting there ready to approve.

**Cost of being wrong:** A loose standing permission could be stretched into waiting on challenges he never approved. Always-fail-closed wastes full passes on solvable auth, which the narrow carve-out fixes without opening the door.

## 30. Public-mistake playbook: when autonomous outreach posts something wrong, what happens?

**Context:** Autonomous engagement has posted thousands of actions. Sooner or later one will be wrong in public (wrong business, wrong tone, factual error). No playbook exists: delete quietly, disclose and correct, apologize, or leave it. The choice affects reputation and the honesty story.

**Recommended default:** Delete the mistaken action promptly, record the mistake and the deletion as events, and disclose to Nolan. Public correction or apology only where the mistake was seen and the correction serves honesty, never performative.

**On default vs alternative:** On the default, mistakes are contained fast and the record stays truthful. On the alternative (leave everything up), a wrong comment stands as PING Social's voice indefinitely. On the other alternative (public apology for everything), minor errors become theater.

**Cost of being wrong:** Leaving a bad action up lets it compound through replies and screenshots. Over-apologizing trains the audience to watch for mistakes, while quiet deletion with an honest internal record is the proportionate response.

## 31. Question batches from here: on your order only, or classifier-only?

**Context:** Nolan ordered this batch and simultaneously ruled that batch 5's 37 questions prove the classifier is too permissive. The tension is real: he wants fewer interrupts, but he also keeps ordering batches. The process question is his alone: from here, do question batches continue on his explicit order, or only when the classifier genuinely escalates?

**Recommended default:** Classifier-only from here. Batches on explicit order stop. The system brings him only what the tightened classifier cannot resolve, plus the weekly audit. If he wants a batch, he will say so, and that order itself is the authority.

**On default vs alternative:** On the default, his interrupt load drops to what the bar requires and the classifier tuning gets a real test. On the alternative (standing batch orders), the system keeps manufacturing 37-question interrupts on a schedule, which is exactly what he just diagnosed as the problem.

**Cost of being wrong:** Keeping scheduled batches guarantees more unnecessary interrupts. Going classifier-only risks him feeling out of the loop, which the weekly audit and the quiet-feed rules are designed to prevent.

## 32. Brand content boundaries: which topics does PING Social never touch?

**Context:** The content pipeline enforces that every post is funny, but no boundary says which topics the brand never touches (politics, religion, competitors, tragedy, or complaining about others' pricing). Evidence cannot set this. It is owner taste with reputational consequences.

**Recommended default:** Nolan names the off-limits list once (short, plain). It becomes a content gate alongside the humor check, and anything ambiguous fails closed to human review.

**On default vs alternative:** On the default, the brand's voice has guardrails he chose, and the machine never improvises on sensitive ground. On the alternative (no list), the humor gate optimizes for funny without knowing where funny becomes damaging.

**Cost of being wrong:** One tone-deaf post on a sensitive topic can undo months of trust building. A short list costs him ten minutes and prevents the entire class.

## 33. Ask FYD identity: does the concierge say it is AI?

**Context:** Outreach messages identify as AI by Nolan's standing rule, but Ask FYD on a customer's website has no identity policy. Visitors will assume they are talking to the business unless told otherwise: the concierge can present as the business, as the business's assistant, or explicitly as AI.

**Recommended default:** Ask FYD identifies as the business's AI concierge in its first message, plainly and briefly. It never claims to be human and never claims to be the owner.

**On default vs alternative:** On the default, the transparency rule from outreach extends to the product, and no visitor is misled. On the alternative (presenting as the business), conversations may convert slightly better until the deception surfaces, and then the customer's business owns the fallout.

**Cost of being wrong:** A concierge that passes as human is a deception scandal waiting for its first angry visitor. Identifying as AI costs a little warmth and buys permanent defensibility.

## 34. Mission Control multi-tenancy: design for it now, or retrofit later?

**Context:** Mission Control is being built single-tenant (Nolan is the only operator), but the spine already includes TENANT and the product will eventually put owners in front of their own missions. Building tenant isolation now costs real architecture. Retrofitting it later costs more and risks a boundary bug under pressure.

**Recommended default:** Design for tenancy now (tenant on every mission, event, and approval), enforce single-tenant in practice until the first real owner. The isolation boundary gets built and tested before anyone else's data is in the system.

**On default vs alternative:** On the default, the boundary exists before it is needed and gets proven while the stakes are low. On the alternative (retrofit later), the first customer arrives into a system whose isolation was never tested, which is when boundary bugs are most expensive.

**Cost of being wrong:** Retrofitting under customer pressure is where tenant-isolation failures are born. Building early costs architecture hours now, which the convergence track is already spending.

## 35. Personal-profile outreach: stay business-accounts-only, or expand to people?

**Context:** Engagement and outreach target business accounts only, never personal profiles. The eligible pool thins over time (the genuine-empty streaks prove it), and personal profiles of business owners would expand the pool. Contacting a person instead of a business is a different act with different privacy implications.

**Recommended default:** Stay business-accounts-only. The pool problem is solved by geography expansion and new surfaces, not by crossing from businesses to people.

**On default vs alternative:** On the default, the machine never slides into personal DMs and the trust posture stays clean. On the alternative, reach expands but every personal-profile contact is one step closer to spam in the recipient's eyes.

**Cost of being wrong:** Personal-profile outreach that feels invasive can get the accounts flagged and the brand resented. Staying business-only may mean slower pool growth, which the authorized expansion path already addresses.

## 36. Prospect replies: autonomous answers, or draft-only with Nolan sending?

**Context:** Prospect replies are currently surfaced to Nolan and the machine does not answer them. As reply volume grows, the question is whether the system may send follow-up answers autonomously (within the approved voice and disclosure rules) or stays draft-only with Nolan sending.

**Recommended default:** Draft-only until the reply-handling loop has a proven record: drafts prepared, Nolan sends, outcomes recorded. Autonomy for reply classes comes only as an explicit per-class authorization after the evidence exists.

**On default vs alternative:** On the default, no word goes to a prospect that he did not see, while the drafts still save him the writing. On the alternative (autonomous replies), speed improves but the machine starts holding conversations in his name without him.

**Cost of being wrong:** An autonomous reply that misstates pricing, promises, or identity becomes a commitment he never made. Draft-only costs him minutes per reply, which is the correct price until the loop is proven.

## 37. Monument View live infrastructure: whose domain, whose hosting, who pays?

**Context:** If the Monument View trial goes live, the site needs a domain and hosting. Options: a PING-hosted subdomain or the customer's own domain, and in either case who pays for what. This is money and publication attached to the first real deployment, and it sets the precedent for every customer after.

**Recommended default:** PING-hosted subdomain for the trial, PING pays, stated as trial infrastructure in the trial terms (Q24). Customer-domain cutover becomes a defined paid step after the trial, with the handoff documented.

**On default vs alternative:** On the default, the trial has zero friction for the owner and the precedent is clean: the trial is ours, production is theirs. On the alternative (their domain from day one), the owner does DNS work before seeing value, and untangling it if the trial ends is awkward.

**Cost of being wrong:** Customer-domain-first creates friction and entanglement before value is proven. PING-hosted-first costs a little hosting and sets the exact precedent the business wants.

---

Classifier note: every question above was run through the grill-20 classifier before reaching you. Each failed at least one check: the failed checks per question are recorded in the SI-03 escalation log, and they fall into these classes: unresolved product intent, authority change, external contact or authorization, publication or spend, irreversible or uncertain effects, new credential authority, or unresolved privacy or security policy.

Deliberately cut (decided in-system, not asked):
- Jev $5/day ceiling raise: no evidence of pressure. The spend ledger holds a single entry with unknown cost, and the standing rule already says hitting the ceiling triggers a report and an ask. Asking now would manufacture an interrupt.
- Cloud standby for the automation host: contingency planning with no failure behind it. The system should propose it when the Pig's reliability data justifies it, not spend Nolan's attention preemptively.
- FYD uptime SLA for paying tiers: premature with no paying customers. It belongs in the legal packet (Q22) when it is real.
- Pig hardware refresh: no evidence of need. The system monitors and proposes when metrics justify it.