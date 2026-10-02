# PING CONSTITUTIONAL ARCHITECTURE

## Knowledge Compiler + Intelligence Runtime

Frozen by Nolan, 2026-09-13. This is the standing architecture for PING itself. The interaction doctrine (`ping-interaction-doctrine-2026-09-13.md`) is the first major intelligence application running on top of it, not part of the constitutional kernel.

## The pivot in one paragraph

PING becomes a Constitutional Knowledge Compiler plus an Intelligence Runtime. Reality is the input. Repositories, GitHub, YouTube, podcasts, RSS, documents, APIs, telemetry, conversations are evidence sources. The compiler turns that reality into reproducible, verified knowledge objects and relationships. Agents operate through that substrate rather than maintaining their own disconnected memories.

## The full architecture

```
                         REALITY
                            |
        +-------------------+--------------------+
        |                   |                    |
      GitHub             YouTube              Podcasts
        |                   |                    |
      RSS                 APIs                Documents
        |                   |                    |
        +-------------------+--------------------+
                            |
                            v
                 +--------------------+
                 |     ACQUISITION    |
                 | immutable snapshots|
                 +--------------------+
                            |
                            v
                 +--------------------+
                 |   NORMALIZATION    |
                 | canonical artifacts|
                 +--------------------+
                            |
                            v
                 +--------------------+
                 | STRUCTURAL PARSING |
                 | AST / trees / etc. |
                 +--------------------+
                            |
                            v
                 +--------------------+
                 |    EVIDENCE GRAPH  |
                 | observations/facts |
                 +--------------------+
                            |
                            v
                 +--------------------+
                 |   KNOWLEDGE COMPILER|
                 | semantic passes    |
                 +--------------------+
                            |
                            v
                 +--------------------+
                 | CONSTITUTIONAL IR  |
                 |                    |
                 | Identity           |
                 | Evidence           |
                 | Fact               |
                 | Claim              |
                 | Relationship       |
                 | Decision           |
                 | Authority          |
                 | Lineage            |
                 +--------------------+
                            |
                  +---------+---------+
                  |                   |
                  v                   v
             GRAPH LAYER          POSTGRES
                  |               authority
                  |
                  v
             OPTIMIZATION
          embeddings / indexes
                  |
                  v
                QDRANT
             recall only
                  |
                  v
           CONTEXT COMPILER
                  |
                  v
           +---------------+
           |  INTELLIGENCE |
           |    RUNTIME    |
           +-------+-------+
                   |
        +----------+-----------+
        v          v           v
      Ollama     Claude      Codex
      Hermes     Devin       OpenCode
      etc.
                   |
                   v
          OPPORTUNITY ENGINE
                   |
                   v
          AUTHORIZED ACTION
                   |
                   v
                OBSERVE
                   |
                   v
                EVIDENCE
                   |
                   +---------------> COMPILER
```

The last arrow is the flywheel. The interaction is not merely an output. Its outcome becomes new evidence, which gets compiled back into the knowledge system.

## Agents propose; the compiler disposes

Agents never directly update knowledge. Instead:

```
Agent
  |
  +-- observes reality
  |
  +-- proposes observation
  |
  +-- proposes claim
  |
  +-- proposes relationship
          |
          v
    Constitutional
      Compiler
          |
          v
      Verification
          |
          v
       ACCEPTED
```

That preserves the core constitutional rule: agents create candidate knowledge; the constitutional system determines what becomes accepted knowledge.

## The compilation chain

Frozen, in full:

```
RAW REALITY
     |
     v
SNAPSHOT
     |
     v
ARTIFACT
     |
     v
EVIDENCE
     |
     v
OBSERVATION
     |
     v
FACT
     |
     v
CLAIM
     |
     v
RELATIONSHIP
     |
     v
KNOWLEDGE OBJECT
     |
     v
VERIFICATION
     |
     v
ACCEPTED CONSTITUTIONAL KNOWLEDGE
```

ASSESSMENT sits beside knowledge rather than modifying it. EMBEDDING, SUMMARY, SCORE, CONFIDENCE, HEALTH, and RANKING remain derived projections and optimization outputs, not truth. That keeps constitutional objects stable while allowing the intelligence system to constantly improve.

## Technology actor graph, not influencer table

Do not build an influencer table. Build a technology actor graph. One person may be discovered through GitHub, YouTube, podcast, RSS, X, conference, paper, company, or repository. Those are not separate people. They are evidence about the same underlying actor.

```
                    PERSON
                  /    |    \
                 /     |     \
            GitHub   YouTube  Podcast
               \       |       /
                \      |      /
                     RSS
                      |
                      X
                      |
                 CONVERSATION
                      |
                 OPPORTUNITY
                      |
                 INTERACTION
                      |
                    OUTCOME
                      |
                   EVIDENCE
                      |
                   KNOWLEDGE
```

Cross-source identity resolution works on evidence: GitHub bio plus YouTube description plus linked website plus same name plus same organization plus cross-linked accounts yields an ACTOR_CANDIDATE. IDENTITY_CONFIRMED only when the evidence threshold is met. This prevents one of the worst problems in autonomous intelligence: merging two different people into one graph node.

## The runtime environment

Generalizing the earlier Docker idea. Do not make /repo the intelligence substrate. Make the runtime see:

```
/knowledge
    /sources
    /snapshots
    /artifacts
    /evidence
    /objects
    /graphs
    /indexes
    /compiler
    /schemas

/runtime
    /policies
    /skills
    /tools
    /adapters

/repo
    /ping
    /applications
    /infrastructure
```

Then an agent can inspect the actual PING system, but it also has access to the compiled understanding of the wider world. That is the difference between "Ollama can read my repo" and "Ollama operates inside PING's compiled knowledge environment." The second is the architectural goal.

PING becomes the substrate, harness, and governance layer around intelligence, while models such as Ollama, Claude, Codex, Hermes, Devin, and OpenCode become replaceable reasoning and execution engines:

```
REALITY -> EVIDENCE -> KNOWLEDGE -> AUTHORITY -> CONTEXT -> AGENT -> ACTION -> OBSERVATION -> EVIDENCE
```

## The interaction runtime

Frozen:

```
REALITY SOURCES: GitHub, YouTube, Podcasts, RSS, Web, Papers,
Companies, People, Communities, Events, Repositories
        |
        v
+------------------------------+
|      ACQUISITION LAYER       |
| immutable observations       |
| timestamps / source IDs      |
| content hashes               |
+--------------+----------------+
               v
+------------------------------+
|    IDENTITY RESOLUTION       |
| person <-> GitHub <-> YouTube|
| <-> podcast <-> company <-> RSS |
+--------------+----------------+
               v
+------------------------------+
|     KNOWLEDGE COMPILER       |
| observations / facts / claims|
| relationships / objects      |
+--------------+----------------+
               v
+------------------------------+
|     TECHNOLOGY GRAPH         |
| actors / projects /          |
| technologies / conversations |
| organizations / opportunities|
+--------------+----------------+
               v
+------------------------------+
|     OPPORTUNITY ENGINE       |
| relevance / novelty /        |
| relationship state / evidence|
| strength / timing / potential|
| value / interaction cost /   |
| downside / risk              |
+--------------+----------------+
               v
        ACTION PROPOSAL
               |
       +-------+--------+
       v                v
    NO ACTION       HUMAN REVIEW
                         |
                         v
              AUTHORIZED ACTION
              like / follow / reply
                         |
                         v
                      OBSERVE
                         |
                         v
                      EVIDENCE
                         |
                         v
                   KNOWLEDGE COMPILER
```

The feedback arrow is the important part.

## Interaction intent objects

Like, Follow, and Comment are technically different operations. Do not represent them as {"action": "engage"}. Represent them as distinct Interaction Intent Objects:

```json
{
  "kind": "INTERACTION_PROPOSAL",
  "target": "actor_123",
  "source_observation": "obs_456",
  "conversation": "conversation_789",
  "action": "COMMENT",
  "rationale": ["..."],
  "supporting_evidence": ["..."],
  "candidate_response": "...",
  "expected_value": "...",
  "uncertainty": ["..."],
  "authorization_required": true
}
```

The platform action is a separate event chain, giving a full audit trail:

```
INTERACTION_PROPOSED -> INTERACTION_AUTHORIZED -> INTERACTION_EXECUTED -> INTERACTION_OBSERVED
```

## The three interaction classes

LIKE is the lowest-information action and requires the least justification: relevant, genuine, not duplicate or spam. But even here, do not blindly like everything relevant. Selectivity applies: 1,000 discovered posts might compress to 300 relevant, 100 genuinely interesting, 40 worth retaining, 12 worth considering, 5 like candidates. The compression itself is intelligence.

FOLLOW is relationship acquisition and requires substantially stronger evidence: actor relevance, sustained topical relevance, content quality, identity confidence, relationship novelty, future information value. The governing question is: will following this actor improve PING's future information environment? A researcher with 2,000 followers whose work repeatedly intersects PING's knowledge graph can have more information value than a celebrity with 10 million followers who rarely discusses anything relevant.

COMMENT is a completely different class with the strongest gate:

```
REAL POST -> UNDERSTOOD -> RELEVANT -> PING KNOWLEDGE EXISTS
  -> NON-TRIVIAL CONTRIBUTION EXISTS -> EVIDENCE SUPPORTS CONTRIBUTION
  -> NO MATERIAL CONTRADICTION -> NO DUPLICATION -> CONVERSATIONAL FIT
  -> APPROPRIATE TIMING -> EXPECTED VALUE > COST -> COMMENT PROPOSAL
```

No substantive contribution means no comment. That is constitutional interaction doctrine.

## Relationship state is a derived projection

Not simply followed = true. The actor record carries identity, sources, topics, expertise, projects, organizations, conversations, interactions, responses, shared interests, relationship history, and opportunities. Relationship state is derived from immutable events:

```
UNKNOWN -> DISCOVERED -> OBSERVED -> RELEVANT -> FOLLOWED
  -> INTERACTED -> RESPONDED -> CONVERSATION -> RELATIONSHIP
```

It is a projection, not constitutional truth.

## Comment generation from the graph, not vibes

Example: PING encounters "We're moving our agent infrastructure away from traditional vector-only retrieval." The acquisition layer records the immutable post. Deterministic processing extracts actor, topic, concepts, and position. The semantic compiler produces candidate facts linked to evidence. The technology graph reveals shared technical interest (PING: Qdrant, graph retrieval, constitutional knowledge; Actor X: agent architecture, graph retrieval, retrieval systems).

The candidate is then represented structurally (conversation, actor, trigger, shared concepts, supporting and contradicting knowledge, candidate contribution with basis, interaction type with HUMAN_REQUIRED authorization). The language model's job is primarily to render the contribution naturally, not to invent something intelligent. That is a massive architectural difference.

## Learning from interaction outcomes

After a comment, observations are recorded: author replied, author liked, conversation expanded, other expert joined, new account discovered, new technology discovered, GitHub relationship discovered, podcast discovered, nothing happened. Those are observations, not conclusions. Only later might PING form a candidate claim such as "substantive technical contributions may produce higher-quality technical relationships than generic engagement," and that remains a claim until adequately validated.

## The interaction value function

Do not optimize likes, follows, comments, or followers. Instead, conceptually:

```
Interaction Value
=
Relevance x Evidence Strength x Relationship Potential
x Information Gain x Conversation Quality x Timing x Authenticity
----------------------------------------------------------------
Interaction Cost + Risk
```

Crucially, NO ACTION must be a first-class output. Otherwise the optimization system eventually learns "do something." It must learn "do something only when doing it is better than not doing it."

## Budgets

PING maintains interaction budgets beyond platform rate limits.

Cognitive budget: how much attention should PING spend investigating this actor? LOW means surface scan; MEDIUM means identity plus graph expansion; HIGH means deep evidence compilation.

Relationship budget: how much interaction should be attempted with one actor over time? The cadence is observe, learn, wait, find a genuinely relevant intersection, interact, observe the outcome, wait. That makes the system relationship-aware rather than action-hungry.

## Opportunity as an explicit derived object

Not constitutional truth. An OPPORTUNITY carries actor, conversation, trigger, relevant knowledge, relationship state, potential value, evidence, assessment, recommended action, and expiration. Its lifecycle: discovered -> enriched -> assessed -> expires or converted. That lets PING handle thousands or millions of signals without pretending they are all equally important.

## The layer freeze

```
CONSTITUTIONAL KERNEL        immutable evidence / objects / lineage
        |
        v
KNOWLEDGE COMPILER           reproducible transformations
        |
        v
KNOWLEDGE GRAPH              relationships
        |
        v
INTELLIGENCE RUNTIME         assessments / planning
        |
        v
OPPORTUNITY ENGINE           proposals
        |
        v
AUTHORIZATION                human / platform policy
        |
        v
ACTION ADAPTER
        |
        v
REAL WORLD
        |
        v
OBSERVATION ----------------> KERNEL
```

That last loop is the architecture.

## The bigger idea

The same machinery operates on GitHub repositories, YouTube creators, podcasters, researchers, companies, technologies, competitors, open-source projects, papers, standards, conferences, customers, developers, architectures, and incidents, because PING is not fundamentally modeling influencers. It is modeling reality, evidence, relationships, knowledge, opportunities, and outcomes. The influencer interaction system is simply one application of the compiler and runtime.

## The explicit principle

PING never optimizes for maximum interaction. PING optimizes for maximum justified value per interaction, while preserving evidence, provenance, authorization, and the ability to explain why an action was or was not taken.

That is the version that can scale sustainably without turning into a conventional engagement bot.

## End state

Not AI that searches a repository. A continuously compiling intelligence substrate in which reality is acquired as immutable evidence, evidence is transformed into reproducible constitutional objects, relationships form a multi-dimensional knowledge graph, models perform advisory reasoning over compiled context, actions generate new observations, and verified outcomes feed back into the compiler.
