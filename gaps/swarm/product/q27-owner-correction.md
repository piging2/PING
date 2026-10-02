# Q27 — OWNER CORRECTION: separate proposition vs history rewrite
Audited: 2026-10-01 ~18:24 MDT
Worktree SHA: 2b5c95eef02f3c271c3c1966ec80df2f7e629876 (read-only)
Trace: one owner contact-field correction end-to-end in code.

## The path (command → store → overlay → serve)

1. ENTRY: `applyOwnerCommand()` in src/fyd/object/owner-store.ts:162. Command "set-contact-field" (field ∈ phone/email/website — CORRECTABLE_FIELDS, owner-store.ts:51).
2. RECORD (owner-store.ts:404-435): the command builds a draft event — it does NOT touch the source projection:
   - type: "owner.corrected-fact" (or "owner.confirmed-fact" when the value is unchanged, owner-store.ts:419)
   - previousBasis: { priorOwnerValue, sourceValue } — the source's value at correction time is preserved in the event
   - newValue: an OwnerFieldCorrection { field, label, sourceValue, ownerValue, correctedAt, actorLabel, basis: "Owner correction: the owner says this is the correct X. The source record is unchanged." }
   - Explicit comment (owner-store.ts:404-407): "The owner attests a corrected contact value. The source record is NOT rewritten: the correction is stored as its own event with the source's value at this moment preserved as previous basis."
3. APPEND (owner-store.ts:579): `appendOwnerEvent(objectId, draft)` into the append-only owner log (data/fyd-owner/<siteId>.json). The store header (owner-store.ts:2-12): "APPEND-ONLY… every transition is a [event]… revert appends an owner.restored-fact event; the correction event stays in the log."
4. COMPOSE (src/fyd/object/owner-overlay.ts:applyOwnerFieldCorrections): at READ time, per request, over a CLONED graph ("Never mutates the input graph: the source layer's objects are left untouched", owner-overlay.ts:158-162). Attached OwnerFieldCorrection records carry sourceValue + ownerValue + sourceDrifted (derived per read, never persisted). Fail-closed orphans when the business object is missing/ambiguous.
5. SERVE: Ask FYD reads the verified public projection composed with the overlay (ask-pipeline.ts loadBundleWithOwnerOverlay); citations label owner-corrected fields "Owner correction" (visitor-answer.ts citationFor field-kind branch), so the SOURCE SAYS X / OWNER SAYS Y distinction is renderable.
6. Revert: appends "owner.restored-fact" — the original correction event stays in the log (owner-store.ts:548).

## Verdict

PROPOSITION: "An owner correction is a separate authorized proposition (OWNER SAYS PRESENT Y / OWNER DISPUTES X) leaving observed truth intact; customization never rewrites history."
STATUS: PASS. End-to-end in code: correction = append-only "owner.corrected-fact" event in a separate owner store; source projection never mutated (overlay composes over a clone at read time); source value preserved as sourceValue/previousBasis; drift detectable; revert is another event, not a deletion. This is exactly the "OBSERVED TRUTH STAYS SOURCE SAID X" invariant.
One noted gap (not a fail): the actorLabel for demo mode is an explicit non-identity ("Demo Owner (seeded, unverified)") per types.ts:153-158 — the real-identity seam is documented as future work; the provenance model does not pretend the demo actor is a verified owner.

## Evidence locations
- worktree-audit/owner-overlay.ts.txt (full file)
- Key lines: src/fyd/object/owner-store.ts:51,162,404-435,548,579; src/fyd/object/owner-overlay.ts:150-225; src/lib/ping/types.ts:142-162
