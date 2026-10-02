#!/usr/bin/env python3
P = "/home/nolan/projects/ping/src/app/api/fyd/objects/[objectId]/overrides/__tests__/owner-context-seam.test.ts"
src = open(P).read()

# 1. Header comment: address visibility is MEDIUM, not fast-undo presentation.
old_h = """ * - The propose/approve loop reflects the authority gradient: presentation
 *   changes are tier-labeled with fast proposal/undo; factual changes get
 *   explicit confirmation and no undo affordance.
"""
new_h = """ * - The propose/approve loop reflects the authority gradient: LOW
 *   presentation changes are tier-labeled with fast proposal/undo;
 *   MEDIUM changes (address visibility, contact corrections) get explicit
 *   confirmation and no automatic undo; HIGH/CRITICAL never reach propose.
"""
assert src.count(old_h) == 1, f"header: {src.count(old_h)}"
src = src.replace(old_h, new_h, 1)

# 2. Propose test: address visibility is MEDIUM with explicit confirmation.
old_p = """  test("propose labels a presentation change with the fast proposal/undo tier", async () => {
    const { status, body } = await call({
      stage: "propose",
      text: "Hide the business address",
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.tier).toBe("presentation");
    expect(String(body.consequenceNote)).toMatch(/proposal\\/undo/);
    expect(body.proposal).toMatchObject({
      command: { type: "set-address-visibility", visibility: "hidden" },
    });
    expect(body.demoOwnerContext).toBe(true);
  });
"""
new_p = """  test("propose labels an address-visibility change as MEDIUM with explicit confirmation", async () => {
    const { status, body } = await call({
      stage: "propose",
      text: "Hide the business address",
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    // FYD product authority directive (Nolan 2026-09-25): address
    // visibility is MEDIUM, not LOW. No fast proposal/undo tier.
    expect(body.tier).toBe("MEDIUM");
    expect(body.productTier).toBe("MEDIUM");
    expect(body.changeKind).toBe("update-business");
    expect(String(body.consequenceNote)).toMatch(/Update the business/);
    expect(body.proposal).toMatchObject({
      command: { type: "set-address-visibility", visibility: "hide" },
    });
    expect(body.demoOwnerContext).toBe(true);
  });
"""
assert src.count(old_p) == 1, f"propose test: {src.count(old_p)}"
src = src.replace(old_p, new_p, 1)

# 3. Approve test: no automatic undo; explicit DEFAULT unwinds the preference.
old_a = """  test("approve of a presentation change returns a ready undo; the undo applies in one call", async () => {
    const proposed = await call({ stage: "propose", text: "Hide the business address" });
    const digests = proposed.body.digests as Record<string, string>;
    const approved = await call({
      stage: "approve",
      command: (proposed.body.proposal as Record<string, unknown>).command,
      baseStateDigest: digests.baseStateDigest,
      baseViewDigest: digests.baseViewDigest,
      patchDigest: digests.patchDigest,
    });
    expect(approved.status).toBe(200);
    expect(approved.body.ok).toBe(true);
    expect(approved.body.tier).toBe("presentation");
    const undo = approved.body.undo as Record<string, unknown>;
    expect(undo).toBeDefined();
    expect(undo.command).toEqual({
      type: "set-address-visibility",
      visibility: "public",
    });
    expect(String(undo.summary)).toMatch(/show the business address/i);
    expect(typeof undo.baseStateDigest).toBe("string");
    expect(typeof undo.baseViewDigest).toBe("string");
    expect(typeof undo.patchDigest).toBe("string");

    // Fast undo: the pre-bound inverse approves in one call, no re-propose.
    const undone = await call({
      stage: "approve",
      command: undo.command,
      baseStateDigest: undo.baseStateDigest,
      baseViewDigest: undo.baseViewDigest,
      patchDigest: undo.patchDigest,
    });
    expect(undone.status).toBe(200);
    expect(undone.body.ok).toBe(true);
    expect(projectOwnerState("happy-place").addressVisibility).toBe("public");
  });
"""
new_a = """  test("approve of an address-visibility change carries no automatic undo; explicit DEFAULT unwinds it", async () => {
    const proposed = await call({ stage: "propose", text: "Hide the business address" });
    const digests = proposed.body.digests as Record<string, string>;
    const approved = await call({
      stage: "approve",
      command: (proposed.body.proposal as Record<string, unknown>).command,
      baseStateDigest: digests.baseStateDigest,
      baseViewDigest: digests.baseViewDigest,
      patchDigest: digests.patchDigest,
    });
    expect(approved.status).toBe(200);
    expect(approved.body.ok).toBe(true);
    expect(approved.body.tier).toBe("MEDIUM");
    // MEDIUM: no automatic LOW undo. The preference unwinds only through
    // an explicit DEFAULT command in the propose/approve loop.
    expect("undo" in approved.body).toBe(false);
    expect(projectOwnerState("happy-place").addressVisibility).toBe("hide");

    const backToDefault = await call({ stage: "propose", text: "Reset the address visibility" });
    expect(backToDefault.status).toBe(200);
    expect(backToDefault.body.ok).toBe(true);
    expect(backToDefault.body.proposal).toMatchObject({
      command: { type: "set-address-visibility", visibility: "default" },
    });
    const defaultDigests = backToDefault.body.digests as Record<string, string>;
    const defaulted = await call({
      stage: "approve",
      command: (backToDefault.body.proposal as Record<string, unknown>).command,
      baseStateDigest: defaultDigests.baseStateDigest,
      baseViewDigest: defaultDigests.baseViewDigest,
      patchDigest: defaultDigests.patchDigest,
    });
    expect(defaulted.status).toBe(200);
    expect(defaulted.body.ok).toBe(true);
    expect(projectOwnerState("happy-place").addressVisibility).toBe("default");
  });
"""
assert src.count(old_a) == 1, f"approve test: {src.count(old_a)}"
src = src.replace(old_a, new_a, 1)

open(P, "w").write(src)
print("owner-context-seam.test.ts: updated to MEDIUM behavior")
print("OK")
