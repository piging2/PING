/**
 * Consequence tiers for owner-approved presentation changes (Lane D).
 *
 * CEO directive 2026-09-24: OWNER UX = CHAT-FIRST + PREVIEW + MINIMAL
 * STRUCTURED REVIEW/APPROVE FOR CONSEQUENTIAL CHANGES. Authority UX scales
 * with consequence:
 *   LOW      ("make heading shorter")      = fast + reversible with undo
 *   MEDIUM   ("hide my address")           = quick apply with visible undo/history
 *   HIGH     ("publish campaign to 2000")  = preview + explicit approval
 *   CRITICAL ("delegate publishing rights") = strong confirmation
 *
 * Consequential changes resolve into a COMPACT VISUAL DIFF PREVIEW
 * (old -> new, affected surfaces) with Cancel/Apply. The owner never sees
 * capabilities, events, or SiteSpec internals.
 *
 * The tier is a deterministic function of the resolved SiteIntent kind.
 * Unknown kinds fail closed to CRITICAL: the panel must strong-confirm
 * before the approve path will journal them.
 */

/** Consequence tier, low to critical. */
export type ConsequenceTier = "low" | "medium" | "high" | "critical";

/**
 * Deterministic consequence tier for a resolved site intent kind.
 * Pure function: same kind always yields the same tier.
 */
export function consequenceTierOf(intent: { kind: string }): ConsequenceTier {
  switch (intent.kind) {
    // LOW: fast, reversible presentation tweaks. Undo restores the prior
    // value or order; nothing leaves public view.
    case "reorder_section":
    case "reorder_object":
    case "set_featured":
    case "promote_action":
    case "promote_first":
    case "feature_object":
    case "edit_copy":
    case "set_theme_token":
    case "show_locations":
      return "low";
    // MEDIUM: visibility changes. Quick apply with visible undo/history:
    // the inverse toggle (hide <-> show) is always available, and the
    // directive history shows what changed and when.
    case "toggle_section":
    case "hide_section":
    case "show_section":
    case "hide_fact":
    case "show_fact":
      return "medium";
    // HIGH: removes an object from public view. Preview + explicit
    // approval: the parse -> approve two-step IS the explicit approval,
    // and the panel renders the full before/after diff before Apply.
    case "deactivate_object":
    case "remove_social_link":
      return "high";
    // CRITICAL: reserved. No intent kind reachable through the customize
    // panel today is critical (no campaign publish, no rights delegation).
    // Unknown kinds land here fail-closed: the panel must strong-confirm.
    default:
      return "critical";
  }
}

/**
 * Whether the tier carries a one-click inverse the panel can offer as
 * Undo after a successful apply. Medium toggle_section is the canonical
 * case: hiding a section is undone by showing it again.
 */
export function isUndoableKind(kind: string): boolean {
  return (
    kind === "toggle_section" ||
    kind === "hide_section" ||
    kind === "show_section" ||
    kind === "hide_fact" ||
    kind === "show_fact"
  );
}

/**
 * Plain-words undo hint for the owner, shown after apply for undoable
 * tiers. Never mentions events, digests, or intents.
 */
export function undoHintFor(kind: string): string | null {
  switch (kind) {
    case "toggle_section":
    case "hide_section":
      return "You can undo this anytime by showing the section again from the history below.";
    case "show_section":
      return "You can undo this anytime by hiding the section again from the history below.";
    case "hide_fact":
      return "You can undo this anytime by showing the fact again from the history below.";
    case "show_fact":
      return "You can undo this anytime by hiding the fact again from the history below.";
    default:
      return null;
  }
}

/**
 * Short plain-words consequence label for the review card, scaled by tier.
 */
export function tierLabel(tier: ConsequenceTier): string {
  switch (tier) {
    case "low":
      return "Small change, easy to undo.";
    case "medium":
      return "Visibility change. You can undo it from the history below.";
    case "high":
      return "This removes content from public view. Please review carefully before applying.";
    case "critical":
      return "This needs extra confirmation before it can be applied.";
  }
}
