/**
 * Lane D + CEO 2026-09-24: consequence tiers for owner-approved changes.
 *
 * Pins: deterministic tier per site-intent kind, unknown kinds fail closed
 * to critical, undoable kinds identified, plain-words labels with no
 * capability/event/SiteSpec jargon.
 */
import {
  consequenceTierOf,
  isUndoableKind,
  tierLabel,
  undoHintFor,
} from "@/fyd/customize/consequence";

describe("consequenceTierOf", () => {
  test("low: fast reversible presentation tweaks", () => {
    for (const kind of [
      "reorder_section",
      "reorder_object",
      "set_featured",
      "promote_action",
      "promote_first",
      "feature_object",
      "edit_copy",
      "set_theme_token",
      "show_locations",
    ]) {
      expect(consequenceTierOf({ kind })).toBe("low");
    }
  });

  test("medium: visibility changes with visible undo", () => {
    for (const kind of ["toggle_section", "hide_section", "show_section", "hide_fact", "show_fact"]) {
      expect(consequenceTierOf({ kind })).toBe("medium");
    }
  });

  test("high: removes content from public view", () => {
    expect(consequenceTierOf({ kind: "deactivate_object" })).toBe("high");
    expect(consequenceTierOf({ kind: "remove_social_link" })).toBe("high");
  });

  test("unknown kinds fail closed to critical", () => {
    expect(consequenceTierOf({ kind: "delegate_publishing_rights" })).toBe("critical");
    expect(consequenceTierOf({ kind: "publish_campaign_to_2000" })).toBe("critical");
    expect(consequenceTierOf({ kind: "" })).toBe("critical");
  });

  test("deterministic: same kind always yields the same tier", () => {
    expect(consequenceTierOf({ kind: "toggle_section" })).toBe(consequenceTierOf({ kind: "toggle_section" }));
  });
});

describe("isUndoableKind", () => {
  test("toggle and fact visibility kinds are undoable; destructive kinds are not", () => {
    expect(isUndoableKind("toggle_section")).toBe(true);
    expect(isUndoableKind("hide_section")).toBe(true);
    expect(isUndoableKind("show_fact")).toBe(true);
    expect(isUndoableKind("deactivate_object")).toBe(false);
    expect(isUndoableKind("reorder_section")).toBe(false);
  });
});

describe("owner-facing copy", () => {
  test("tier labels and undo hints never mention events, digests, or intents", () => {
    const banned = ["event", "digest", "intent", "capability", "sitespec"];
    const texts = [
      tierLabel("low"),
      tierLabel("medium"),
      tierLabel("high"),
      tierLabel("critical"),
      undoHintFor("toggle_section"),
      undoHintFor("hide_fact"),
    ];
    for (const t of texts) {
      if (t === null) continue;
      const lower = t.toLowerCase();
      for (const b of banned) {
        expect(lower).not.toContain(b);
      }
    }
  });

  test("undoHintFor returns null for non-undoable kinds", () => {
    expect(undoHintFor("deactivate_object")).toBeNull();
    expect(undoHintFor("reorder_section")).toBeNull();
  });
});
