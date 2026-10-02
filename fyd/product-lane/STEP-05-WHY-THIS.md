# Why This — PASS

Date: 2026-09-23. Real browser (Chromium headless) against the candidate
production build on :3111.

## Lineage, both object kinds

Business object (/o/website-business-6fa5ebd99d72c4cb), "Why this?"
expanded on "Business description":

- Object field: description on ping.social.business@1 — OBSERVED
- Observation method: Website ingestion (observed 2026-09-21) — OBSERVED
- Source: https://happy-place-platform.vercel.app/ — OBSERVED

Service object (/o/website-service-51de038c1defe8bd):

- Object field: description on ping.social.service@1 — OBSERVED
- Observation method: PING event record (observed 2026-09-21) — OBSERVED
- Source: PING event 39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd — OBSERVED

Visible value -> object field -> observation method -> source, with
source URL (or content-addressed event id where the source IS the
event), observed timestamp, method, and evidence-status badges on every
step. No prose bridging.

## Defect found and fixed (generic)

The /o/ page hand-built its Why This steps inline with a prose
"Evidence" step ("Description text observed on the business website")
and no evidence states: the middle of the lineage was English, not
references, and no status badges rendered.

Fix (no customer branches):
- `src/fyd/ui/why-this-steps.ts` (new, server-safe, no "use client"):
  `whyThisStepsForProvenance()` parses the machine-shaped provenance
  ref ("website-ingestion:<url>" / "ping-event:<id>") into method +
  source steps, every step carrying `state: "observed"`. Unknown
  prefixes render verbatim, never invented.
- `src/fyd/ui/why-this.tsx`: re-exports the helper and the EvidenceStep
  type; the component itself is unchanged.
- `src/app/o/[objectId]/page.tsx`: the Business description disclosure
  now builds steps from `view.provenance` via the helper.

The renderer's media Why This disclosures (Hero/Gallery) already used
structured steps with states; only the object-page description
disclosure was prose-bridged.

## Incidents during verification

- After the first Why This rebuild, the restarted server failed to bind
  (EADDRINUSE): the old process survived a `pkill -f next-server`
  because the pattern matched the shell's own command line and killed
  it instead. Switched to `fuser -k 3111/tcp` for port kills.
- First attempt called the helper from the server page while it lived in
  the "use client" module: Next 500 ("cannot invoke a client function
  from the server"). Fixed by moving step construction to the
  server-safe module.

tsc clean, build clean (46/46). Evidence screenshot:
hidden_files/step5-evidence/why-this-business.png
