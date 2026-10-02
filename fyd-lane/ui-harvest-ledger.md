# UI Harvest Ledger: mass-harvest posture for the node build

Date: 2026-09-21. Rule: search PING first, then the ecosystem, then build
only the missing seam. Prefer proven implementations over hand-rolled
code for commodity layers.

| Commodity layer | PING existing | Ecosystem | Built (seam only) | Verdict |
|---|---|---|---|---|
| HTML parsing (media discovery) | none (fast-xml-parser is XML-only; feed-parser.ts uses it for RSS) | node-html-parser@9.0.4 (installed this pass) | extraction policy (which attributes count), srcset best-candidate rule, JSON-LD image collection, rights classification | HARVESTED. discover.ts regex replaced, same contract, 11 tests |
| Image pipeline / derivatives | sharp dep existed, zero call sites | sharp@0.35.3 (already a dep) | derivatives.ts orchestration on existing media constants | HARVESTED (media lane) |
| Content hashing / digests | node:crypto (platform) | - | thin wrappers in media lane | PLATFORM |
| URL parsing | WHATWG URL (platform) | - | safe-link.ts capability gates (navigate/call/email); safe-fetch.ts SSRF boundary (DNS/IP/redirect/size/type/time) | BUILT, correctly bespoke: the SSRF boundary is a security boundary, not a commodity |
| Responsive images | next/image (Next 15, already in stack) | - | - | PRESCRIBED: renderer has no img elements yet; when media is applied, use next/image, not hand-rolled srcset markup |
| Sanitization | React auto-escaping; zero dangerouslySetInnerHTML in src/fyd and src/app/sites | - | - | OK, no dependency needed |
| JSON-LD | jsonld@9.0.0 (dep, used by structured-data lane) | - | discovery uses JSON.parse with regex fallback for malformed blocks | OK |
| XML / RSS / sitemaps | fast-xml-parser@5.11.1 | - | feed-parser.ts (prior lane) | HARVESTED |
| UI primitives (customer surface) | maturity-label.tsx (operator console: Live/Built/Experimental...) | - | ADAPTED, not imported: src/fyd/ui/evidence-state.tsx, fail-closed.tsx, why-this.tsx in customer wording | ADAPTED |
| Capability gating | can(viewer, cap) shape from owner lane | - | src/fyd/wiring/action-verifier.ts | BUILT (product-specific seam) |
| Template/data boundary | - | - | src/fyd/boundary/data-boundary.ts + enforcing tests | BUILT (Nolan's law, no ecosystem equivalent) |

## Explicitly not harvested (and why)

- No new UI framework or component library: the node surface is
  intentionally spare; Tailwind + React is the existing stack.
- No new state library: proposal/apply is local useState; persistence
  will go through the owner transition store when it exists.
- No HTML sanitizer package: nothing injects raw HTML on the node
  surface. If that ever changes, the harvest choice is already made:
  ecosystem sanitizer, not a regex.

## Anti-patterns avoided this pass

- No hand-rolled HTML parser (replaced with node-html-parser).
- No operator-console chrome imported into the customer surface
  (maturity labels adapted, not reused).
- No customer facts in shared components (boundary test enforces).
- No second permission plane: the action-verifier only READS
  capabilities and probes; it never grants anything (harvest spec 13.1).
