# BENCHMARK PROBLEM P1 — JSON-LD @graph extraction yields zero nodes / zero facts

## Problem statement

During FYD website ingestion (extraction lane), the Coppersmith Plumbing demo
site's JSON-LD structured-data blocks produced **zero nodes and zero facts**.
The pipeline reported `expansion-failed` unsupported evidence for **every**
block. The Coppersmith JSON-LD fixture is a real 3969-character block taken
verbatim from the harvested page; a typical block looks like this:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Plumber",
      "@id": "https://coppersmith-plumbing.example/#business",
      "name": "Coppersmith Plumbing",
      "telephone": "+1-970-555-0100",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "123 Main St",
        "addressLocality": "Grand Junction",
        "addressRegion": "CO"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://coppersmith-plumbing.example/#website",
      "url": "https://coppersmith-plumbing.example/"
    }
  ]
}
```

## Invariants (from the structured-data design)

1. Every JSON-LD block must EITHER expand to nodes OR produce explicit
   unsupported evidence. Silent zero-node extraction from a successfully
   expanded block is a defect (fail-closed design).
2. The pipeline is offline: remote @context URLs are never fetched; a remote
   context that cannot be served from the offline table fails closed.
3. The pipeline uses the `jsonld.js` library. Its flatten signature is
   `flatten(input, [ctx], [options])` per the library docs.

## Relevant code excerpts (the code as it ran when the failure occurred)

Excerpt 1 — block expansion (`structured-data.ts`, `expandJsonLdBlocks`):

```ts
const flattened = await jsonld.flatten(block.parsed, {
  documentLoader: offlineDocumentLoader,
});
```

Excerpt 2 — graph extraction (`structured-data.ts`, `extractGraph`):

```ts
function extractGraph(flattened: unknown): ExpandedNode[] {
  if (flattened === null || typeof flattened !== "object") return [];
  const rec = flattened as Record<string, unknown>;
  if (Array.isArray(rec["@graph"])) return rec["@graph"] as ExpandedNode[];
  if (typeof rec["@id"] === "string") return [rec as unknown as ExpandedNode];
  return [];
}
```

Excerpt 3 — context preparation (`structured-data.ts`, `offlineContext`):

```ts
function offlineContext(doc: unknown): unknown {
  if (Array.isArray(doc)) return doc.map(offlineContext);
  if (doc !== null && typeof doc === "object") {
    const rec = doc as Record<string, unknown>;
    // declared contexts are rewritten for offline use; blocks with no
    // declared @context are passed through unchanged.
    return { ...rec, "@context": rewriteContextValue(rec["@context"]) };
  }
  return doc;
}
```

## Test evidence (pre-fix observations only)

- Running the extraction lane over the Coppersmith fixture: every block
  reports `expansion-failed` unsupported evidence; node count = 0, fact
  count = 0.
- A direct node-level probe of the library threw:
  `Invalid JSON-LD syntax; @context term values must be strings or objects`.
- A separate pre-existing unit test, "parse harvests JSON-LD first", uses a
  block with NO @context (`{"@type":"LocalBusiness","name":"Acme",...}`) and
  produced zero facts from that block (only OG/meta titles survived).
- No exception was ever observed from `extractGraph` itself.

## Candidate hypotheses (analyst-drafted; NOT exhaustive; the true cause may
be elsewhere — do not assume the answer is in this list)

- H1: The Coppersmith JSON-LD block is malformed JSON; parsing fails before
  expansion.
- H2: The block's @context is a remote URL the offline loader refuses, so
  expansion fails closed on every block.
- H3: The property tables do not know the schema.org terms used (Plumber
  subtype, address fields), so facts are dropped at the mapping step.
- H4: A "chrome" filter (SearchAction and similar non-content nodes) removes
  all nodes before counting.
- H5: The fixture bytes were corrupted during transfer (nested shell quoting
  mangled the 3969-char block), so the tested bytes are not the real block.

## Your task

Output exactly four sections:

1. **Diagnosis** — the single root cause, with the mechanism (which line /
   which call does what wrong, and why that produces the observed symptom).
   Name any second, independent defect you find in the excerpts.
2. **Patch spec** — the minimal change (files, functions, lines). Prefer a
   diff-shaped description. Do not redesign the pipeline.
3. **Test spec** — one falsifiable test: input, the exact assertions that
   FAIL on the current code and PASS after your patch.
4. **Risks** — what could your patch break, and what you would check.

Rules: reason only from the evidence above. Do not invent functions, files,
test results, or library behaviors not shown. If you are unsure, say what
evidence would settle it.
