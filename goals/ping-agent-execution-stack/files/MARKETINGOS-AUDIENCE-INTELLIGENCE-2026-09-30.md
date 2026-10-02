# MARKETINGOS — AUDIENCE INTELLIGENCE DIRECTIVE

Verbatim directive from Nolan, Wednesday 2026-09-30 ~14:03 MDT. Binding. The "Paste this to the coordinator" portion (final section) is to be routed to the convergence coordinator as a strategy/experiment contract, NOT as permission to create a new authority, store, or duplicate writer. The rationale above it is the binding reasoning and constraints.

---

Good. Keep that posture. Do not turn the audience-transition insight into another subsystem. The current forensic evidence says the opposite is needed: the MarketingOS can already ride PING's canonical event, mission, evidence, knowledge, and authorization machinery. The source explicitly found one canonical ping_events writer, existing mission runtime, ClaimWorker, and KnowledgePromoter, and it says gaps must be established before implementation rather than inferred from a desired architecture.

I also rechecked the three canonical repositories before making this call. GitHub-visible PING is still only at 81b3248; FYD remains inaccessible through the connected GitHub view; CRX main remains at 6c4b531. So the much newer Pig/worktree evidence in your forensic report is the operative local evidence, not proof of deployed/remote convergence. That distinction stays mandatory.

The next improvement is not an AudienceAuthority. It is an audience experiment contract.

The two quantities you identified should become first-class questions, not first-class authorities:
Audience technical fit: Among the people reached, how much of the response comes from the technically relevant population we actually wanted?
Audience acquisition: How efficiently did the artifact cause more of that population to become reachable again?

That distinction is extremely powerful because it prevents a common MarketingOS failure: 500,000 impressions from the wrong people can be worse evidence than 8,000 impressions that produce 40 senior engineers who save the artifact, inspect the repository, challenge a technical claim, and return for the next installment.

But don't collapse either quantity into one magic score. The existing architecture already supports experiment records as mission payload/result data, evidence as canonical observations, and audience clusters as knowledge projections. The forensic map specifically says audience clusters belong over knowledge_nodes, with promotion and evidence handled by existing machinery—not by an AudienceAuthority.

I would make the acquisition series measure four layers
1. Exposure quality. Who appears to have been reached? Not demographics theater—technical evidence. Referrer/context, technical vocabulary in replies, repository clicks, documentation clicks, profile/context evidence where legitimately available, substantive questions, repeat exposure.
2. Response quality. Separate cheap reactions from expensive signals. A like is weak. A save is somewhat stronger. A technically specific comment is stronger. A repository inspection can be stronger still. A correction containing reproducible evidence is extraordinarily useful even though superficially it may look "negative."
3. Conversion into durable audience. Did the artifact create another chance to communicate with the right person? Follow, subscription, return visit, second meaningful interaction, repo watch/star where relevant, direct opt-in, subsequent artifact consumption.
4. Knowledge gained. Did the audience response tell MarketingOS something that makes the next artifact better? New objection, vocabulary, misunderstood premise, unexpected expert segment, evidence challenge, distribution-channel discovery, format preference, or falsification of the original audience hypothesis.
That fourth layer is what turns content analytics into intelligence compounding rather than social analytics.
Your forensic report already points toward exactly this architecture: experiment outcomes should update confidence rather than policy directly, while distribution measurements return as observations and learning gets promoted separately.

Make virality subordinate to information gain
For a senior-developer audience, I would explicitly reject "viral" as the optimizer.
The optimizer should eventually be something closer to: technical relevance × qualified attention × evidence of resonance × durable acquisition × information gained, subject to trust constraints.
That still allows enormous reach. It just prevents the system from discovering that outrage, oversimplification, beginner bait, or impossible performance claims generate more impressions and then quietly teaching itself to become worse.
This is particularly important because your existing doctrine correctly says opportunity scores are recommendations, never authorities.
The same must be true of audience metrics:
AUDIENCE METRIC ≠ PUBLISH AUTHORITY.
ENGAGEMENT ≠ TRUTH.
VIRALITY ≠ PRODUCT-MARKET FIT.
CORRELATION ≠ CAUSATION.
NO SIGNAL YET ≠ FAILURE.
Those five lines belong in the MarketingOS contract.

The acquisition series should be designed like an engineering experiment
Don't merely publish ten posts and see which wins.
For every artifact, persist the hypothesis in the existing mission machinery:
AUDIENCE HYPOTHESIS
This artifact should disproportionately attract senior engineers concerned with deterministic agent infrastructure because it demonstrates a concrete failure and executable repair rather than discussing "AI agents" abstractly.

Then identify the deliberate variable:
implementation trace vs architectural explanation
or:
failure-first hook vs capability-first hook
or:
raw terminal evidence vs polished diagram
Keep as much else stable as practical.
Then declare the observation window before publishing and separate:
PENDING_WINDOW → observed result → evidence → interpretation → candidate learning
Never declare a winner because the first 30 minutes looked exciting.
That matches the existing experiment design found in the source: hypothesis, variable, control, treatment, metrics, guardrail, observation window, with SUPPORTED / FALSIFIED / INCONCLUSIVE proposed as payload vocabulary rather than a new authority.

The content itself should become much more technically falsifiable
If the intended audience is senior developers, competence is communicated less by saying sophisticated things than by making specific claims that sophisticated people can attack.
Instead of:
"We built a deterministic agent architecture."
Prefer:
"Our post-effect exception path used to collapse 'request failed' into 'effect failed.' That made blind retries possible. We injected response loss after a real effect, forced the mission into UNKNOWN/HOLD, and verified that promotion and retry both refused to proceed."
Then show the actual state transition.
The source says the system already has evidence verification, WitnessWorker failure-honesty, and claim/evidence paths. Exploit that editorially.
Every technical artifact should ideally have:
CLAIM → EVIDENCE → LIMITATION → REPRODUCTION PATH
That will make the content unusually trustworthy.
And when something is not known, publish the unknown.
"We have not proven X."
is often more impressive to an L6 engineer than three paragraphs of confident inference.
Your forensic investigator explicitly uses PROVEN / NOT PROVEN / NEEDS-REVERIFY / UNKNOWN and states that invented certainty is excluded by design. Steal that epistemology for the content brand.

Turn PING's engineering failures into the editorial moat
The Pigpen idea was useful because real infrastructure incidents naturally produce stories. For the technical audience, take that several levels deeper.
The content factory should preferentially detect events with a strong transformation:
EXPECTED INVARIANT → ADVERSARIAL TEST → SURPRISING FAILURE → ROOT CAUSE → MINIMUM FIX → RE-RUN → NEW INVARIANT
That's a spectacular technical-content primitive.
Examples from work you've already encountered:
external effect → response disappears → UNKNOWN/HOLD rather than FAILED
grant says tenant X → authenticated principal says tenant Y → reject self-attestation
secret accidentally reaches event spine → choke-point redaction
source code green → deployed runtime stale
event ordering requires fabricated timestamp epsilon
canonical truth versus projection
one brain, many hands
signals recommend but never authorize
model intelligence gradually compiled into deterministic software
why a connector may execute but may never authorize itself
why worker disappearance means UNKNOWN rather than FAILED
These aren't generic AI takes. They're engineering discoveries.
That's the moat.

Build a contradiction harvest, not a trend scraper
One especially high-value improvement from the source is that contradiction detection is not a missing foundational subsystem; it's bounded behavior over existing claims and evidence.
That should become one of MarketingOS's best research modes.
For a subject:
CLAIMS FROM VENDORS
CLAIMS FROM DOCUMENTATION
CLAIMS FROM BENCHMARKS
CLAIMS FROM EXPERIENCED USERS
OUR REPRODUCTION
CONTRADICTIONS
UNRESOLVED QUESTIONS
The content opportunity is frequently the disagreement, not the topic.
A senior engineer is much more likely to care about:
"Three agent frameworks claim durable execution. They mean three different things by durable."
than:
"Top 3 agent frameworks in 2026."
That is the level I would push MarketingOS toward.

Audience technical fit should initially be an evidence packet, not a number
This is the concrete sequencing call.
Do not start by inventing:
AudienceTechnicalFitScore = 0.8734
Start by producing a deterministic projection:
TARGET CLUSTER: senior platform/AI/infrastructure engineers
EXPECTED INDICATORS: distributed-systems vocabulary, implementation questions, repository/docs inspection, evidence challenges, architecture discussion
OBSERVED QUALIFIED RESPONSES: …
OBSERVED WEAK RESPONSES: …
COUNTEREVIDENCE: …
SAMPLE LIMITATIONS: …
FIT VERDICT: supported / weakly supported / inconclusive
NEXT DISCRIMINATING TEST: …
Only after repeated missions show stable predictive indicators should deterministic software compile some of those indicators into a score.
That follows your broader product objective exactly:
MODEL-REQUIRED → MODEL-ASSISTED → DETERMINISTIC DEFAULT + MODEL ESCALATION
Don't prematurely encode the model's intuition.
Mission Control should expose the epistemology, not merely the KPI
Eventually the MarketingOS projection should let you click from:
AUDIENCE TECHNICAL FIT: SUPPORTED
into:
cluster hypothesis
→ observations
→ specific interactions/metrics
→ classification rationale
→ counterevidence
→ experiment
→ outcome
→ candidate learning
And separately:
AUDIENCE ACQUISITION: INCONCLUSIVE
because perhaps technically excellent people engaged but there isn't enough evidence yet that they became durable audience.
That's far more valuable than a dashboard showing:
Reach: 82K ↑ 31%
The latter is analytics. The former is an operating intelligence system.

One important architectural correction from the uploaded forensic
Your current report says the 18-arrow MarketingOS walkthrough had only five bounded gaps and none requires a new authority or store: vocabulary, mission labels, durable approval events, a live metrics producer for the already-existing ingest seam, and bounded behaviors such as chaining/contradiction/stitching/transcript verification.
That is the constraint I would use to judge every exciting MarketingOS idea from here.
Before anybody writes code:
FYD CURRENT IMPLEMENTATION: Is this already represented there?
PING EXISTING IMPLEMENTATION: Which reached primitive already owns the semantics?
HARVESTABLE CODE: Is there existing executable behavior we can wire?
DUPLICATION RISK: Would this create a second memory, score authority, event path, audience truth store, scheduler, experiment system, or approval system?
SMALLEST REQUIRED DELTA: What is the smallest behavior/schema/projection necessary to run the experiment?
For this particular audience-fit issue, the answer appears to be:
FYD CURRENT IMPLEMENTATION: no reason yet to make FYD own it.
PING EXISTING IMPLEMENTATION: observations + missions + knowledge nodes/edges + evidence + experiments + projections.
HARVESTABLE CODE: existing acquisition/metric observation paths, EvidenceAuthority, KnowledgePromoter, MissionRuntime, Mission Control projection machinery.
DUPLICATION RISK: extremely high if someone invents AudienceAuthority, Audience DB, GrowthBrain, Marketing memory, or another analytics truth store.
SMALLEST REQUIRED DELTA: define the audience hypothesis and measurement vocabulary, run the first real acquisition experiment, ingest observations through the existing path, and project the evidence packet.
That is where I would go next.

## PASTE THIS TO THE COORDINATOR

MARKETINGOS — AUDIENCE INTELLIGENCE DIRECTIVE
Do not build AudienceAuthority, AudienceDB, GrowthBrain, Marketing memory, a second experiment engine, or another analytics truth store.
Audience technical fit and audience acquisition are two separate experimental quantities.
For the first real acquisition-series artifact, declare BEFORE distribution:
TARGET AUDIENCE CLUSTER → AUDIENCE HYPOTHESIS → CONTENT HYPOTHESIS → DELIBERATE VARIABLE → EXPECTED QUALIFIED SIGNALS → COUNTERSIGNALS → OBSERVATION WINDOW → GUARDRAILS.
Reuse existing PING observations, evidence, missions, knowledge graph, experiment records, authorization, and Mission Control projection.
Audience technical fit initially produces an EVIDENCE PACKET, NOT A MAGIC SCORE.
Measure:
EXPOSURE QUALITY → RESPONSE QUALITY → DURABLE AUDIENCE ACQUISITION → INFORMATION GAIN.
Preserve:
ENGAGEMENT ≠ TRUTH
VIRALITY ≠ AUDIENCE FIT
CORRELATION ≠ CAUSATION
NO SIGNAL YET ≠ FAILURE
AUDIENCE METRIC ≠ PUBLISH AUTHORITY
Prefer technically expensive signals over cheap engagement: substantive implementation questions, evidence challenges, repository/docs inspection, saves/returns, repeat technical interaction, corrections with reproducible evidence.
Every technical artifact should strive for:
CLAIM → EVIDENCE → LIMITATION → REPRODUCTION PATH.
Mine content opportunities from:
EXPECTED INVARIANT → ADVERSARIAL TEST → SURPRISING FAILURE → ROOT CAUSE → MINIMUM FIX → RE-RUN → NEW INVARIANT.
Add contradiction harvesting to research behavior:
VENDOR CLAIM → DOCUMENTATION → INDEPENDENT EVIDENCE → USER REPORT → OUR REPRODUCTION → CONTRADICTIONS → UNRESOLVED.
Do not encode model intuition into deterministic audience scoring after one run. Accumulate evidence first. Promote repeated predictive judgments toward deterministic software only when the support set justifies it.
Mission Control must eventually project the evidence behind audience-fit and acquisition conclusions, including counterevidence and unknowns. It must never manufacture completeness.
FIRST REAL TEST: one acquisition-series artifact, one declared target technical cluster, one declared hypothesis, one controlled variable, one observation window, canonical metric/interaction observations, one evidence-backed audience-fit assessment, one audience-acquisition assessment, one candidate learning, and one next discriminating experiment.
If existing PING primitives can represent the requirement, WIRE THEM. DO NOT INVENT ANOTHER SYSTEM.
Reader/falsifier posture remains until coordinator assigns the mutation surface. One owner per mutation surface. No additional writer is implied by this directive.

That first experiment will tell us considerably more about what MarketingOS actually needs than another week of designing MarketingOS.
