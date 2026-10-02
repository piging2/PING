p = "src/fyd/object/commands.ts"
s = open(p).read()
s += """
/**
 * Consequence tier of an owner command, per the AUTHORITY GRADIENT
 * (FYD-24H-BUILDER-DECISIONS 2026-09-22): authority stays invisible until
 * consequence requires it.
 *
 * - "presentation": LOCAL PRESENTATION CHANGE (reorder, show/hide). Fast
 *   proposal/undo: the propose/approve loop still binds the proposal to its
 *   base digests (the proven safety property), but the approve response
 *   carries a ready-to-approve `undo` for one-step reversal. No public
 *   fact is altered.
 * - "factual": PUBLIC FACTUAL CHANGE (correct, confirm, add). Explicit
 *   confirmation: the full propose -> digest-bound approve loop, and the
 *   approval records an owner assertion (actor + timestamp). The source
 *   record is never rewritten.
 *
 * The switch is exhaustive over the OwnerCommand union on purpose: adding
 * a command type forces its tier to be classified here. A future command
 * that writes to an external provider, moves money, sends a message, or
 * is otherwise irreversible does NOT belong in "presentation" or the
 * plain "factual" lane: it needs capability + confirmation or strong
 * approval, which this tier function must refuse to grant silently.
 */
export type CommandConsequenceTier = "presentation" | "factual";

export function commandConsequenceTier(cmd: OwnerCommand): CommandConsequenceTier {
  switch (cmd.type) {
    case "move-service":
    case "set-service-visibility":
    case "set-address-visibility":
      return "presentation";
    case "set-contact-field":
    case "revert-contact-field":
    case "confirm-contact-field":
    case "add-service":
      return "factual";
  }
}

/**
 * The exact inverse of a presentation-tier command, for fast undo. The
 * route's approve response carries the inverse pre-bound to post-apply
 * digests, so the owner can reverse a local presentation change in one
 * approve call. Returns null for commands with no exact single-command
 * inverse (all factual-tier commands): factual assertions are superseded
 * by newer assertions, not inverted.
 */
export function invertOwnerCommand(cmd: OwnerCommand): OwnerCommand | null {
  switch (cmd.type) {
    case "move-service": {
      const to =
        cmd.to === "first" ? "last" : cmd.to === "last" ? "first" : cmd.to === "up" ? "down" : "up";
      return { type: "move-service", id: cmd.id, to };
    }
    case "set-service-visibility":
      return { type: "set-service-visibility", id: cmd.id, visible: !cmd.visible };
    case "set-address-visibility":
      return {
        type: "set-address-visibility",
        visibility: cmd.visibility === "hidden" ? "public" : "hidden",
      };
    default:
      return null;
  }
}

/**
 * One-line human summary of a command, for undo affordances. `serviceNames`
 * maps service id -> display name (unknown ids fall back to the id).
 */
export function describeCommand(
  cmd: OwnerCommand,
  serviceNames: Map<string, string>,
): string {
  const name = (id: string): string => serviceNames.get(id) ?? id;
  switch (cmd.type) {
    case "move-service": {
      const where =
        cmd.to === "first"
          ? "back to the top"
          : cmd.to === "last"
            ? "back to the bottom"
            : cmd.to === "up"
              ? "one step up"
              : "one step down";
      return "Undo: move " + name(cmd.id) + " " + where + ".";
    }
    case "set-service-visibility":
      return cmd.visible
        ? "Undo: show " + name(cmd.id) + " again."
        : "Undo: hide " + name(cmd.id) + " again.";
    case "set-address-visibility":
      return cmd.visibility === "hidden"
        ? "Undo: hide the business address again."
        : "Undo: show the business address again.";
    case "set-contact-field":
      return "Record an owner correction for " + cmd.field + '.';
    case "revert-contact-field":
      return "Revert the owner correction for " + cmd.field + ".";
    case "confirm-contact-field":
      return "Confirm the " + cmd.field + " is correct.";
    case "add-service":
      return "Add service " + cmd.name + ".";
  }
}
"""
open(p, "w").write(s)
print("commands.ts gradient patched")
