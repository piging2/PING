# Ten More Last Questions - Batch 4 (2026-09-25, ~20:45 MDT)

## 1. Does the night freeze cover the outreach machinery, or only the FYD lanes?
Context: the outreach engine read "no social or campaign work" in the night directive, flagged its own 10 F1 sends as a violation, and froze the campaign until 05:00. But the standing order is outreach runs perpetually until Nolan says stop, and the sprint rule was throttle, not freeze. The directive's "nothing else" was written for the FYD product lanes.
Recommended: FYD lanes only. The 10 sends stand as legitimate (properly gated, cap compliant). Unfreeze the engine, keep the throttle.

## 2. If identity_5/identity_6 proves reachable tonight, do I contain immediately?
Context: the read-only investigation lane is running. If it proves an actually reachable unauthorized spend path, every hour of waiting is spend risk; acting at night is auth-seam risk.
Recommended: contain the narrowest proven seam immediately, report within the hour, nothing broader until Nolan decides.

## 3. If the 05:00 Coppersmith proof fails the "would I choose this" test, then what?
Context: the whole night builds to one judgment call.
Recommended: one bounded family-fix iteration plus re-proof; if still no, stop and bring the evidence for a product call. No endless polish loop.

## 4. Visibility seam: is HOLD acceptable for the 05:00 proof?
Context: publicGraphOf() hardcodes empty decisions while other consumers use owner decisions. Wiring real decisions through one seam before 05:00 is risky; shipping it half-wired is worse.
Recommended: yes. An explicitly HELD (fail-closed) public path beats a leaky seam. Wire it after the proof.

## 5. Ask FYD hits a question the graph cannot support. Refuse, omit, or qualify?
Context: the evidence path starts after 05:00. This decides the failure mode.
Recommended: qualify. Answer what is supported, explicitly mark what is unverified, never invent. No silent omits that look like knowledge gaps, no refusals that look broken.

## 6. Owner correction vs source truth: overlay or overwrite?
Context: owner says "my hours are wrong" and the source (website) says otherwise.
Recommended: overlay. The owner's assertion wins for visitors; the source fact stays preserved underneath; both show in provenance. A correction never destroys anything.

## 7. Privacy branch: merge before 05:00 or hold until after?
Context: fyd/privacy-projection-p0 is proven (3 commits, suites green) but unmerged, and the visibility seam is still unresolved.
Recommended: hold until after the proof. Do not merge the night before the demo; the seam question (Q4) rides with it.

## 8. Copilot broker has no production callers. Archive or keep?
Context: if the investigation proves dispatch() has no production callers, it sits in the tree looking authoritative.
Recommended: archive it (git history keeps it). A tested authority nobody calls is a trap for the next reader.

## 9. After Coppersmith: prove generalization on a second business, or go straight to Monument View prep?
Context: the technical order ends at "one external business owner." One proof is a demo; two is a family.
Recommended: generalize once more on an internal business first. "Would I choose this" twice is stronger than once before a real owner sees it.

## 10. Monument View: who makes first contact?
Context: no autonomous external contact, ever. The owner loop has to start somewhere.
Recommended: Nolan makes first contact, in person, when the loop is green. The agent prepares the packet, the demo, and the fallback answers, and never contacts them.
