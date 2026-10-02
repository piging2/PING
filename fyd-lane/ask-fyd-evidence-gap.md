# Ask FYD → Evidence Boundary: findings

Date: 2026-09-21. Lane: Ask FYD evidence. Task: run the fixed question
"What services does this business offer, and how do you know?" against the
ACTUAL current graphs, not website prose. Diagnosis + contract only. No new
architecture. HPP untouched.

## 1. Object type inventories (working-tree fixtures, as read 2026-09-21 ~09:30 MDT)

Note: both fixture files show as `M` (modified, uncommitted) in the Pig
worktree at inspection time; the inventories below reflect the files as they
were read.

- `src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`
  - Schemas: `ping.social.business@1`, `ping.social.location@1`
  - Service objects: NONE. No `ping.social.service@1`, no `product@1`, no `offer@1`.
  - The business description says "building decks, fences, pergolas, bathrooms,
    and custom work" but that is free prose in the `description` field, not a
    service claim structure. There is no `services` field.
- `src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts`
  - Schemas: `ping.social.business@1`, `ping.social.external_identity@1`,
    `ping.social.location@1`, `ping.social.person@1`
  - Service objects: NONE. No `services` field on the business object.
  - Description mentions 25+ years servicing Western Colorado; no structured
    service facts.

9-vs-2 discrepancy remains EXPECTED: `happy-place-rich-graph.ts` is the
deliberate 9-object proceduralization/rendering fixture; `happy-place-graph.ts`
is the machine-generated 2-object extraction. Separate roles, frozen HPP.

## 2. How Ask FYD currently resolves questions (no general chatbot)

Chain, all deterministic, no LLM:

1. `src/fyd/ask/context-builder.ts` `buildAskFydContext` (single builder)
   -> `src/lib/ping/ask-composer.ts` `buildAskContext`: bounds objects (8
   related, 20 relationships), truncates fields (500 chars), and builds
   `evidenceRefs` from object provenance (`website-ingestion:<source URL>`) and
   relationship evidenceRef events.
2. `src/fyd/ask/answer.ts` `composeAskFyd`: first runs keyword-anchored
   `detectSitePatchIntent` (reorder_services_first, professionalize,
   feature_object) with authority check; otherwise delegates to
   `src/lib/ping/ask-composer.ts` `composeAnswer`.
3. `composeAnswer` services intent (ask-composer.ts, "service/services/offer/
   offers/provide/do" word-boundary match) looks ONLY at:
   - `target.fields["services"]`, or
   - related objects with schema in {`ping.social.service@1`,
     `ping.social.product@1`, `ping.social.offer@1`}.
   When neither exists it returns `noEvidenceAnswer`: "I do not have evidence
   for that in the current context, so I will not guess." plus the consulted
   evidence list, with `partial: true`.
4. `src/fyd/ask/capabilities.ts`: forbidden agent effects (site.publish,
   message.send, purchase.make, ad.buy, provider.call, business.mutate)
   stripped before the agent sees grants; fail-closed on unknown grants.

## 3. Actual execution against the real graphs (evidence)

Ran the fixed question through `buildAskFydContext` + `composeAskFyd` with the
real fixture graphs as target/related/relationships, viewer anonymous, grants
[site.read, site.propose], via a temporary jest test (created, run, deleted;
repo shows no trace; unrelated dirty files untouched).

- Happy Place: `partial: true`. Answer begins "I do not have evidence for that
  in the current context, so I will not guess." Consulted refs: business
  object + located_at relationship + location object.
- Coppersmith: `partial: true`. Same fail-closed answer. Consulted refs:
  business object, 3 relationships (works_for, links_to, located_at), external
  identity, location, person. Every ref carries provenance
  `website-ingestion:https://www.coppersmithplumbing.com/`.

**Adversarial result: PASS.** Ask FYD does NOT fabricate a confident services
answer from the website's obvious services discussion. Saying "I don't know"
with the consulted evidence listed is the correct first result. The Ask layer
is not the broken step.

## 4. FIRST BROKEN STEP

**EVIDENCE -> SERVICE OBJECT EXTRACTION / RESOLUTION.**

Service facts exist today only as unstructured prose inside the business
`description` field ("decks, fences, pergolas, bathrooms, and custom work").
The extraction layer (proceduralizer / regen pipeline) never emits Service
objects, so the object graph has zero service facts and Ask FYD correctly
refuses. The next fix belongs in extraction: description prose -> Service
objects with their own evidence refs, or an explicit "services unknown" state.
Do NOT fix this by letting the composer parse description prose as claims; that
would put factual authorship into the answer layer.

## 5. Required input/output contract

### Input (exists today via `AskFydContextInput` -> `AskFydContext`)

- viewer: { id, displayName } (may be anonymous)
- target object: PingObject, fields bounded and truncated
- question: string
- public/allowed object fields: visibility policy + owner policy filtered
  (field-visibility law); grants are the authorization record
- related objects (bounded 8), relationships (bounded 20)
- evidence refs: provenance kind + ref + relationship evidenceRef events
- allowed capabilities: agentGrantList with forbidden effects stripped
  (FORBIDDEN_AGENT_EFFECTS); fail-closed
- siteSpecDigest binding so proposals bind the exact spec reasoned over

### Output (required; `AskAnswer` in `src/lib/ping/types.ts:310` today)

Required shape:

- answer: sentences; every factual sentence cites evidence as [n]
- evidence_refs: object/relationship refs with provenance
- source_urls: explicit list derived from provenance `website-ingestion:` refs
- claim_classifications: per factual sentence one of
  DIRECT / DERIVED / INFERRED / GENERATED_PRESENTATION
- unknowns: explicit list of what could not be answered from the graph
- suggested_actions: PlannedAction[], capability-gated (site-patch kinds only)
- partial: true when the answer is incomplete or a refusal
- proposal: draft-only, digest-bound; human approves the exact digest

**Current gaps (recorded, not built):** `AskAnswer` has no
claim_classifications field, no unknowns field separate from prose, and no
explicit source_urls field (URLs are embedded in evidenceRef detail strings).
Closing these is Ask-layer work, AFTER extraction produces Service objects.

### Safety rules encoded

- No invented claims: `noEvidenceAnswer` path; unknown stays unknown.
- No provider credentials or private context: the context carries object
  fields, provenance, and grants only; the envelope Signer stays caller-side
  (`src/fyd/ask/envelope.ts`).
- No new ClaimAuthority: the evidence/object graph defines the factual input
  space; the binding verifier enforces factual render bindings at the
  projection seam; the composer only selects and cites graph values.

## 6. Architectural laws preserved

- Renderer is a projection; it never authors factual truth.
- WHO DECIDES whether a business address is shown: OWNER. OBSERVED VALUE !=
  VISIBILITY POLICY != PRESENTATION. Business/public location may have
  reasonable defaults; the authorized owner controls final visibility within
  platform safety constraints.
- WHY THIS is the trust escape hatch, not the product. Provenance is used
  constantly internally (every evidenceRef carries it); the user inspects it
  on demand for trust, correction, dispute, conflict, high-consequence claims.
- Semantic render determinism invariant: same ObjectGraph + SiteSpec +
  ViewerContext + renderer version -> same semantic render model. Not
  byte-identical DOM.

## 7. Replay commands (Pig, via bridge with stdin redirected)

Inspect fixtures and object types:

    ~/workspace/pig/pigwsl-run.sh 'grep -o "\"schema\": \"[^\"]*\"" /home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts /home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts' < /dev/null

    ~/workspace/pig/pigwsl-run.sh 'grep -c "ping.social.service@1" /home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts /home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts' < /dev/null
    # expected: 0 / 0

Read the services intent and refusal path:

    ~/workspace/pig/pigwsl-run.sh 'grep -n "hasWord(q, \"service\"" -A 20 /home/nolan/projects/ping/src/lib/ping/ask-composer.ts' < /dev/null
    ~/workspace/pig/pigwsl-run.sh 'grep -n "noEvidenceAnswer" /home/nolan/projects/ping/src/lib/ping/ask-composer.ts' < /dev/null

Rerun the Ask FYD lane tests:

    ~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/projects/ping && npx jest --config src/fyd/ask/jest.config.cjs 2>&1 | tail -8' < /dev/null

Reproduce the probe (temporary test, create -> run -> delete; do NOT leave it):

    ~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/projects/ping && cp /dev/stdin src/fyd/ask/__tests__/tmp-services-probe.test.ts <<'"'"'EOF'"'"'
    import { HAPPY_PLACE_GRAPH } from "../../proceduralize/__fixtures__/happy-place-graph";
    import { COPPERSMITH_GRAPH } from "../../proceduralize/__fixtures__/coppersmith-graph";
    import { buildAskFydContext } from "../context-builder";
    import { composeAskFyd } from "../answer";
    const Q = "What services does this business offer, and how do you know?";
    function probe(name: string, graph: any) {
      const target = graph.objects.find((o: any) => o.schema === "ping.social.business@1");
      const ctx = buildAskFydContext({ viewer: { id: null, displayName: null }, target,
        relatedObjects: graph.objects.filter((o: any) => o.id !== target.id),
        relationships: graph.relationships, plan: null, grants: ["site.read", "site.propose"],
        siteSpec: null, question: Q });
      const ans = composeAskFyd(ctx, Q);
      console.log("=== " + name + " === partial=" + ans.partial);
      console.log(ans.answer);
    }
    test("probe", () => { probe("HAPPY PLACE", HAPPY_PLACE_GRAPH); probe("COPPERSMITH", COPPERSMITH_GRAPH); });
    EOF
    npx jest --config src/fyd/ask/jest.config.cjs tmp-services-probe 2>&1 | grep -E "=== |I do not have evidence|Tests:" ; rm src/fyd/ask/__tests__/tmp-services-probe.test.ts' < /dev/null

Key files:

- `src/fyd/proceduralize/__fixtures__/happy-place-graph.ts` (2 objects, M in worktree)
- `src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts` (4 objects, M in worktree)
- `src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts` (9-object rendering fixture; expected separation)
- `src/lib/ping/ask-composer.ts` (deterministic composer; services intent; noEvidenceAnswer)
- `src/fyd/ask/context-builder.ts`, `answer.ts`, `types.ts`, `capabilities.ts`, `envelope.ts`
- `src/lib/ping/types.ts:310` (`AskAnswer`)

## 8. Lane status

- Diagnosis: COMPLETE. Ask layer passes the adversarial test (refuses to invent).
- Contract: DEFINED (above). Gaps in `AskAnswer` recorded.
- FIRST BROKEN STEP: EVIDENCE -> SERVICE OBJECT EXTRACTION / RESOLUTION.
- Next lane work: extraction emits Service objects from structured sources (not
  by parsing description prose in the composer), then re-run this question and
  expect a cited, classified answer with evidence_refs and source_urls.
- Nothing built, nothing committed, HPP untouched. No collision with the
  renderer/mobile lanes.
