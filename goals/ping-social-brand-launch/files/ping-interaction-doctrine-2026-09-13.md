# PING INTERACTION DOCTRINE

Nolan's directive, 2026-09-13 (two installments, integrated). This is the standing doctrine for how PING discovers technology influencers and decides how to interact with them.

Architectural home: this doctrine is the first major intelligence application running on top of the PING constitutional architecture (`ping-knowledge-compiler-architecture-2026-09-13.md`). It lives above the compiler, not inside the constitutional kernel.

## The key distinction

LIKE / FOLLOW / COMMENT are outputs of the interaction doctrine, not the doctrine itself.

## The doctrine in one line

PING should autonomously discover and prepare interactions; it should optimize for the value of the relationship and conversation, not the number of actions performed.

## The deepest constitutional rule

PING does not optimize for being seen. PING optimizes for creating justified opportunities for valuable human-to-human interaction, while preserving the evidence necessary to determine whether those interactions actually created value.

## The doctrine pipeline

```
                PING Interaction Doctrine
                    NEW SIGNAL
                       |
                       v
              CONVERSATION MODEL
                       |
                       v
                PING CONTEXT
                       |
          +------------+------------+
          |                         |
     WHAT IS KNOWN             WHAT IS UNKNOWN
          |                         |
          +------------+------------+
                       v
             RELATIONSHIP MODEL
                       |
                       v
              OPPORTUNITY MODEL
                       |
                       v
             INTERACTION DECISION
                       |
          +------------+------------+
          |            |            |
        IGNORE       OBSERVE      ENGAGE
                       |            |
                       |       +----+-----+
                       |       |          |
                       |      LIKE      FOLLOW
                       |       |          |
                       |       +-----+----+
                       |             |
                       |        COMMENT?
                       |             |
                       |      +------+------+
                       |     NO             YES
                       |      |               |
                       |    STOP           PREPARE
                       |                      |
                       |                AUTHORIZED ACTION
                       |                      |
                       +------------+---------+
                                    v
                                 OBSERVE
                                    |
                                    v
                                 EVIDENCE
                                    |
                                    v
                                LEARNING
                                    |
                                    v
                                   PING
```

## The governing question

At every interaction point, PING asks:

What is the smallest interaction that creates the greatest legitimate relationship or information value?

That is substantially stronger than an engagement optimizer.

## Discovery sources

PING discovers technology influencers tied to GitHub, YouTubers, podcasters, and RSS feeds, plus X. The Technology Influence Graph is fed from all of these, not from any single platform.

## 1. The Interaction State Machine

The interaction lifecycle is explicit:

```
DISCOVERED
    |
    v
RELEVANT
    |
    v
CONTEXTUALIZED
    |
    v
PING-ENRICHED
    |
    v
RELATIONSHIP-ASSESSED
    |
    v
OPPORTUNITY-QUALIFIED
    |
    v
INTERACTION-CANDIDATE
    |
    v
ACTION-SELECTED
    |
    v
AUTHORIZED
    |
    v
EXECUTED
    |
    v
OBSERVED
    |
    v
OUTCOME-CLASSIFIED
    |
    v
EVIDENCE-CREATED
    |
    v
LEARNING-CANDIDATE
    |
    v
VERIFIED
    |
    v
ACCEPTED_BY_PING
```

Importantly, there are legitimate exits everywhere:

```
RELEVANT -> NO VALUE -> DISCARD

OPPORTUNITY-QUALIFIED -> NO INTERACTION JUSTIFIED -> OBSERVE ONLY

COMMENT-CANDIDATE -> NO SUBSTANTIVE CONTRIBUTION -> DO NOT COMMENT
```

No interaction is itself a valid decision. That is first-class, not a failure mode.

## 2. The interaction selector is not binary

The system never asks "engage or don't engage?" It asks: "what relationship signal, if any, is justified?"

```
              NO ACTION
                  |
                  |
            OBSERVE ONLY
                  |
                  |
                LIKE
                  |
                  |
               FOLLOW
                  |
                  |
              COMMENT
                  |
                  |
          DEEPER RELATIONSHIP
```

The farther down the ladder, the greater the evidentiary burden. A like requires relatively little justification. A follow requires an ongoing-interest rationale. A substantive comment requires actual contribution value. A deeper relationship requires substantially more evidence. The system naturally becomes conservative as interaction cost and relationship significance increase.

## 3. The central object is the Opportunity

PING does not make an X post the central object. The post is merely a signal. PING constructs an INFLUENCE OPPORTUNITY:

```
INFLUENCE OPPORTUNITY

Person:                    T
Organization:              O
Conversation:              C
Signal:                    S

Relevant PING knowledge:   K001, K017, K031

Relationship state:        NEW
Strategic relevance:       HIGH
Conversation relevance:    HIGH
Contribution potential:    HIGH
Evidence quality:          VERIFIED

Recommended interaction:   COMMENT
Reason:                    substantive contribution available

Uncertainty:               ...
Expected value:            ...
Observed outcome:          PENDING
```

Now the system is not an X bot anymore. It is a relationship intelligence system whose current observation surface happens to include X. That is architecturally much more powerful.

## 4. The Technology Influence Graph is the memory structure

The graph does not merely say "Nolan follows Person." It represents:

```
Person
 |-- publishes --> GitHub
 |-- appears_on --> Podcast
 |-- publishes --> YouTube
 |-- discusses --> Agent Architecture
 |-- interacts_with --> Person B
 |-- repeatedly discusses --> MCP
 |-- references --> Project X
 |-- participated_in --> Conversation Y
```

And the knowledge chain:

```
PING Knowledge
      |
      v
Technology Topic
      |
      v
Influencer
      |
      v
Conversation
      |
      v
Opportunity
      |
      v
Interaction
      |
      v
Outcome
      |
      v
Evidence
```

Cross-platform entity resolution: the same person discovered through GitHub, later encountered through YouTube or a podcast, is recognized as the same node. Suppose PING sees Person A on GitHub, YouTube, a podcast, RSS, and X. A conventional system sees five observations. PING increasingly sees one recurring technology actor appearing across multiple independent information channels, discussing topics that overlap with verified PING knowledge. The X post then carries context that X itself does not provide, and qualification improves dramatically.

## 5. Relationship value, not interaction volume

Not: engagement_score = likes + follows + comments.

Instead, conceptually:

```
relationship_value =
    relevance
  x conversation_quality
  x knowledge_overlap
  x contribution_potential
  x strategic_alignment
  x evidence_quality
```

With penalties for: uncertainty, irrelevance, repetition, already-saturated relationship, low contribution value, conflicting evidence.

The exact mathematical model can come later. The constitutional principle matters first: interaction value is not interaction volume.

## 6. Comment generation is a knowledge-grounding operation

The system encounters: "Agent architectures are becoming too complicated." Instead of immediately generating language, it performs:

```
POST
  |
  v
CLAIM EXTRACTION
  |
  v
CLAIM NORMALIZATION
  |
  v
PING RETRIEVAL
  |
  v
EVIDENCE RETRIEVAL
  |
  v
CONTRADICTION CHECK
  |
  v
CONTRIBUTION ANALYSIS
  |
  v
RESPONSE CANDIDATE
```

Internal structure:

```
CLAIM
  |
  v
What does PING know?
  |
  v
SUPPORTING KNOWLEDGE
  |
  v
CONTRADICTORY KNOWLEDGE?
  |
  +-- YES --> DO NOT OVERSTATE
  |
  +-- NO
        |
        v
  What can we actually contribute?
        |
        v
  SUBSTANTIVE CONTRIBUTION
```

The system is not asking "what clever thing could I say?" It is asking "what can I responsibly add to this conversation given what PING actually knows?" That is a much more defensible intelligence primitive.

Response candidates carry: context (original post), relevant PING knowledge objects, proposed contribution, evidence refs, confidence, explicit uncertainty, and why the conversation matters. Then the human inspects and decides whether to post. Comments are human-authorized, always. PING prepares; the human posts.

## 7. Interaction abstention is constitutional

Stronger than a recommendation. PING MUST be capable of concluding:

```
RELEVANT = TRUE
OPPORTUNITY = TRUE
COMMENT_POSSIBLE = TRUE
COMMENT_VALUE > 0
BUT
COMMENT_VALUE < NO-COMMENT-VALUE
THEREFORE
DO NOT COMMENT
```

Because technically relevant does not equal socially valuable. A comment can be: correct but redundant, knowledgeable but poorly timed, substantive but irrelevant to the actual conversation, technically impressive but relationship-negative, based on weak evidence, repeating something already said, or adding noise to an already crowded discussion.

Abstention is intelligence, not failure.

## 8. Learn interaction patterns, not just people

Eventually PING observes patterns such as:

- Pattern A: technical correction -> no response
- Pattern B: specific implementation observation -> author response
- Pattern C: question connecting two ideas -> secondary participants join
- Pattern D: generic praise -> nothing
- Pattern E: novel evidence -> conversation expands

Those are not automatically truths. Each begins as OBSERVATION, then potentially HYPOTHESIS, then VALIDATED, then VERIFIED, then ACCEPTED_BY_PING. So eventually PING might legitimately learn: under conditions X, Y, and Z, contribution type C has historically produced higher-quality conversation outcomes than contribution type A. That is real intelligence, not "comments are good."

## 9. The killer loop is larger than X

```
                  INTERNET
                     |
       +-------------+-------------+
       |             |             |
     GitHub       YouTube       Podcasts
       |             |             |
       +-------------+-------------+
                     |
                    RSS
                     |
                     X
                     |
                     v
             SIGNAL INGESTION
                     |
                     v
          TECHNOLOGY INFLUENCE GRAPH
                     |
                     v
              PING KNOWLEDGE
                     |
                     v
             OPPORTUNITY ENGINE
                     |
                     v
             INTERACTION DECISION
                     |
                     v
           AUTHORIZED INTERACTION
                     |
                     v
                 OBSERVE
                     |
                     v
                 EVIDENCE
                     |
                     v
                VALIDATION
                     |
                     v
                    PING
                     |
                     +---------------+
                                     |
                                     v
                              BETTER NEXT DECISION
```

That is the actual flywheel.

## 10. What "leads pouring in" actually means

The naive metric is 1,000 interactions. PING's metric is closer to:

```
1,842 signals
   |
   v
213 relevant
   |
   v
47 analyzed
   |
   v
11 opportunities
   |
   v
5 relationships worth pursuing
   |
   v
3 meaningful interactions
   |
   v
1 new relationship
   |
   v
1 new evidence chain
   |
   v
1 new verified PING insight
   |
   v
next opportunity becomes easier to recognize
```

The last step is the important one. The system gets smarter because the relationship happened. The compression is the product.

## 11. The four layers

PING layer: DISCOVER, UNDERSTAND, REMEMBER, QUALIFY, PREPARE, LEARN.

Interaction layer: LIKE, FOLLOW, COMMENT, CONVERSE, RELATE.

Observation layer: OBSERVE, MEASURE, CLASSIFY, CAPTURE EVIDENCE.

Constitutional layer: VALIDATE, VERIFY, ACCEPT, SUPERSEDE, REPLAY.

None of those layers gets to silently promote its own output into truth. That is the part that makes this genuinely PING rather than a conventional social-growth bot.

## 12. The authority boundary

The agent might conclude "technical comments produce better relationships." That is a candidate learning. It cannot simply be written into a permanent craft file and thereby made true. It must travel:

OBSERVED -> HYPOTHESIS -> VALIDATED -> VERIFIED -> ACCEPTED_BY_PING

when, and only when, the evidence warrants it.

## 13. The adversarial contrast: what PING is not

The bot whose objective is MAXIMIZE INTERACTION VOLUME + MINIMIZE PROBABILITY OF ENFORCEMENT runs:

```
TARGET -> ACTION -> OBSERVE PLATFORM RESPONSE -> ESTIMATE DETECTION RISK -> MODIFY BEHAVIOR -> ACTION
```

That is a behavioral-evasion machine. PING is instead:

```
TARGET -> UNDERSTAND -> QUALIFY -> VERIFY -> DECIDE WHETHER INTERACTION IS VALUABLE
  -> HUMAN-AUTHORIZED ACTION -> OBSERVE -> LEARN
```

Same broad idea of a feedback-controlled interaction system. Completely different objective.

## The killer metric

How many meaningful relationships or opportunities did PING create that would probably not have happened without PING?

That number is tracked in the relationship ledger, starting from the first X follows on 2026-09-13. Muse hunts it relentlessly.
