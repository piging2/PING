# Prompt: Generate the three PING canonical documents

Copy everything below the line into your AI tool of choice. It produces three
markdown documents. Edit the bracketed context first if anything changed.

---

You are writing three canonical documents for PING, an AI and automation
platform founded by Nolan Geske. Nolan is a teacher turned systems architect
and automation consultant. He is building PING around a core belief: business
operations should be reliable without taking judgment away from the people
doing the work. A lot of what he is proud of is the underlying engineering:
deterministic workflows, event-driven systems, retrieval and knowledge
infrastructure, identity and evidence tracking, and systems designed to be
auditable rather than just "AI that works."

More recently he has been pushing that thinking into practical automation for
home service businesses, where the goal is simple: capture the work reliably,
reduce interruptions and administrative drag, and let the owner or trade
professional stay in control.

Voice rules for all three documents:
- Honest and concrete. Never invent customers, revenue, partnerships, or
  traction. State the true current stage plainly.
- Technical but readable. Explain architecture in terms of what it guarantees,
  not jargon for its own sake.
- Confident without hype. No superlatives like revolutionary or magical.
- No em dashes anywhere. Use commas, colons, or periods instead.
- Nolan's wording is authoritative: keep his core messages verbatim.

Write each document as its own markdown file with the exact filename given.
Each document stands alone but the three link to each other at the end.

## Document 1: PING_CONSTITUTIONAL_ARCHITECTURE.md

Focus: the technical moat.

Cover, in this order:
- Constitutional Rule of One (one canonical authority per truth domain)
- identity authority
- event sourcing (canonical event envelope, single event authority)
- canonicalization (deterministic byte representation across runtimes)
- deterministic hashing (one hash algorithm, content-addressed identity)
- replay kernel (pure, side-effect-free replay as authoritative state reconstruction)
- provenance and evidence (lineage tracking, every claim traceable to source events)
- witness generation (cryptographic witnesses enabling verification of replay)
- projection sovereignty (Qdrant and other projections are derived acceleration,
  never truth authorities; all projections verifiable against canonical source)
- failure law (failures as deterministic, replay-safe constitutional events)
- Qdrant and embedding sovereignty (who owns embeddings, verification on admission)
- why deterministic infrastructure matters for agentic systems (probabilistic
  models as workers inside a constitutional substrate, never as truth authorities)
- a PlantUML architecture diagram showing the layers: models/workers at the
  edge, constitutional authorities in the middle, event log as source of truth,
  projections as derived

Core message, stated verbatim near the top:
"I am not building another AI wrapper. I am building a trustworthy execution
substrate around commodity AI models."

## Document 2: PING_AGENT_NETWORK.md

Focus: where PING is going.

Cover, in this order:
- AI concierge (the starting client-facing shape: an AI front desk for
  home service businesses)
- agent orchestration (governed multi-agent execution under constitutional authority)
- autonomous lead capture and follow-up (every call answered, every lead tracked,
  nothing lost)
- decentralized advertising (businesses and agents advertising to each other
  through the network)
- service-business network effects (each business on the network makes the
  network more useful for the next)
- advertisers, businesses, and agents as the three sides of the network
- event-driven agent execution (agents act on events, every action recorded
  with provenance)
- reputation and evidence (trust built from verifiable interaction history,
  not claims)
- how successful interactions become reusable operational knowledge (real
  outcomes distilled into the shared substrate, contradictions preserved)
- the path from individual automation to network to agent economy

Core message, stated verbatim near the top:
"PING starts as an automation business but is architected to become an
agent-driven operational network."

Be clear this is a trajectory, not a shipped product. Label what exists,
what is planned, and what is unknown.

## Document 3: PING_BUILD_JOURNEY.md

Focus: Nolan as the founder and technical architect. This is the credibility
document. It should read like a builder's honest record, not a pitch.

Cover, in this order:
- starting from practical business automation (the real problems that started it)
- discovering architectural problems (duplicate systems, false claims of
  completion, nondeterminism hiding inside "working" systems)
- building the constitutional architecture (why the Rule of One, frozen laws,
  authority consolidation)
- auditing his own system for duplicate authorities and nondeterminism
  (the discipline of tracing claims to runtime evidence)
- Qdrant sovereignty work (projections as derived, verification against source)
- replay and determinism work (replay as authoritative reconstruction)
- mistakes he caught and corrected (be specific about the pattern: found it,
  preserved the correction, did not hide it)
- what he learned about architecture (a few sharp principles, earned the hard way)
- why this makes him useful to clients (he finds the real problem beneath the
  surface instead of selling AI hype; he connects deep infrastructure to
  business outcomes like fewer missed leads and less admin drag)
- roadmap through May 2027 (milestone ranges, labeled as planned, no exact
  date promises)
- honest traction and current stage (no fabrication; the credibility claim is
  demonstrated practice, not commercial traction)

Core message, stated verbatim near the top:
"I am unusually willing to go beneath the surface, find the real architectural
problem, and build the system correctly rather than hide complexity behind
AI hype."

---

Output: the three complete markdown documents, each under its filename as a
header, ready to save as files.
