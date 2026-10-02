p = "src/app/api/fyd/objects/[objectId]/overrides/route.ts"
s = open(p).read()

# --- 1. Header docs: the authority gradient. ---
old = """ * The approve stage enforces the owner-core chain:
 *   SESSION -> PING IDENTITY -> CONTROL RELATIONSHIP -> CAPABILITY
 *     -> PROPOSE/APPLY RULE -> EVENT -> PROJECTION.
 * ctx.evaluateCapability evaluates the chain through the OwnerContext
 * seam; a denied owner.correct-fact verdict returns 403 and nothing is
 * written. The OwnerContext is required on every mutation: the actor is
 * always the seeded demo actor, labeled as DEMO OWNER CONTEXT.
 * Authentication alone NEVER grants mutation.
 *"""
new = """ * The approve stage enforces the owner-core chain:
 *   SESSION -> PING IDENTITY -> CONTROL RELATIONSHIP -> CAPABILITY
 *     -> PROPOSE/APPLY RULE -> EVENT -> PROJECTION.
 * ctx.evaluateCapability evaluates the chain through the OwnerContext
 * seam; a denied owner.correct-fact verdict returns 403 and nothing is
 * written. The OwnerContext is required on every mutation: the actor is
 * always the seeded demo actor, labeled as DEMO OWNER CONTEXT.
 * Authentication alone NEVER grants mutation.
 *
 * AUTHORITY GRADIENT (FYD-24H-BUILDER-DECISIONS 2026-09-22): the loop
 * reflects consequence, not one heavyweight path for everything.
 * commandConsequenceTier classifies each OwnerCommand:
 * - "presentation" (local presentation change: reorder, show/hide): fast
 *   proposal/undo. The proposal stays digest-bound to its base state (the
 *   proven safety property), and a successful approve returns a ready
 *   `undo` (exact inverse command pre-bound to the post-apply digests),
 *   so the owner can reverse it in one approve call.
 * - "factual" (public factual change: correct, confirm, add): explicit
 *   confirmation. The full propose -> digest-bound approve loop, and the
 *   approval records an owner assertion (actor + timestamp) while the
 *   source record is never rewritten.
 * Approval never confers capability: the capability gate runs on every
 * approve call regardless of tier.
 *"""
assert old in s, "header"
s = s.replace(old, new)

# --- 2. Imports. ---
old = 'import { interpretTextCommand } from "@/fyd/object/commands";'
new = """import {
  commandConsequenceTier,
  describeCommand,
  interpretTextCommand,
  invertOwnerCommand,
} from "@/fyd/object/commands";"""
assert old in s, "imports"
s = s.replace(old, new)

# --- 3. Propose response: tier + consequenceNote. ---
old = """      proposal: { command, summary: proposal.summary },
      preview,
      digests: {"""
new = """      proposal: { command, summary: proposal.summary },
      preview,
      tier: commandConsequenceTier(command),
      consequenceNote:
        commandConsequenceTier(command) === "presentation"
          ? "Local presentation change. Fast proposal/undo: the proposal stays digest-bound to its base state, and the approval response carries a ready undo you can approve in one step. No public fact is altered."
          : "Public factual change. Explicit confirmation: approving records an owner assertion with actor and timestamp. The source record is never rewritten.",
      digests: {"""
assert old in s, "propose"
s = s.replace(old, new)

# --- 4. Approve response: tier + pre-bound undo for presentation changes. ---
old = """      const view = loadObjectView(objectId);
      return NextResponse.json({
        ...ctx.responseLabel(),
        ok: true,
        view,
        history: overrides.history,
        approval,
        chain: audit,
      });"""
new = """      const view = loadObjectView(objectId);
      // Fast proposal/undo for local presentation changes: the exact
      // inverse command, pre-bound to the POST-APPLY digests, so the owner
      // can reverse it in one approve call. If the state moved since, the
      // approve stage's digest checks refuse it safely. Factual changes
      // get no undo: assertions are superseded by newer assertions, and
      // corrections revert through revert-contact-field.
      const tier = commandConsequenceTier(command);
      const inverse = tier === "presentation" ? invertOwnerCommand(command) : null;
      const undo =
        inverse === null
          ? undefined
          : {
              command: inverse,
              summary: describeCommand(inverse, names),
              baseStateDigest: ownerStateDigest(objectId),
              baseViewDigest: buildViewDigest(objectId),
              patchDigest: patchDigestOf(inverse),
            };
      return NextResponse.json({
        ...ctx.responseLabel(),
        ok: true,
        view,
        history: overrides.history,
        approval,
        tier,
        undo,
        chain: audit,
      });"""
assert old in s, "approve"
s = s.replace(old, new)

open(p, "w").write(s)
print("route.ts gradient patched")
