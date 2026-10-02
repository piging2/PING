/**
 * Tests for the object projection builder.
 *
 * The projection is generic: the same builder serves Happy Place and
 * Coppersmith, and the two views differ only because their graphs differ.
 * Run from the repo root so manifests resolve via process.cwd().
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildObjectView, knownServices, listObjectIds } from "../view";

beforeEach(() => {
  // Isolate owner state so tests never touch real demo data.
  process.env.FYD_OWNER_DIR = mkdtempSync(join(tmpdir(), "fyd-view-test-"));
});

describe("buildObjectView", () => {
  test("returns null for unknown objects", () => {
    expect(buildObjectView("nope")).toBeNull();
  });

  test("builds the Happy Place view from source state", () => {
    const view = buildObjectView("happy-place");
    expect(view).not.toBeNull();
    expect(view!.id).toBe("happy-place");
    expect(view!.schema).toBe("ping.social.business@1");
    expect(view!.name).toBe("Happy Place Carpentry LLC");
    expect(view!.category).toBe("Carpentry");
    expect(view!.locationLabel).toBe("Adair Village, OR, US");
    expect(view!.summary).toContain("Licensed Oregon carpentry contractor");
    // Services derived from the description, in observed order.
    expect(view!.services.map((s) => s.name)).toEqual([
      "Decks",
      "Fences",
      "Pergolas",
      "Bathrooms",
      "Custom Work",
    ]);
    expect(view!.services[0].basis).toBe("derived");
    // Capabilities only where the value exists: phone, email, website present.
    const kinds = view!.capabilities.map((c) => c.kind);
    expect(kinds).toContain("call");
    expect(kinds).toContain("email");
    expect(kinds).toContain("website");
    expect(kinds).toContain("ask");
    expect(kinds).toContain("view");
    // No authorized media for HPP: the single manifest entry is
    // external_reference, so it must not display.
    expect(view!.media).toEqual([]);
    expect(view!.provenance.label).toContain("happyplacecarpentry.com");
  });

  test("owner reorder is reflected in the view", () => {
    const { ids, names } = knownServices("happy-place");
    const { applyOwnerCommand } = require("../owner-store") as typeof import("../owner-store");
    applyOwnerCommand("happy-place", { type: "move-service", id: "svc-fences", to: "first" }, ids, names);
    const view = buildObjectView("happy-place");
    expect(view!.services[0].name).toBe("Fences");
    expect(view!.ownerUpdatedAt).not.toBeNull();
  });

  test("hidden services are flagged, not dropped", () => {
    const { ids, names } = knownServices("happy-place");
    const { applyOwnerCommand } = require("../owner-store") as typeof import("../owner-store");
    applyOwnerCommand("happy-place", { type: "set-service-visibility", id: "svc-decks", visible: false }, ids, names);
    const view = buildObjectView("happy-place");
    expect(view!.services.find((s) => s.id === "svc-decks")!.visible).toBe(false);
  });

  test("Coppersmith renders through the identical builder with its own data", () => {
    const view = buildObjectView("coppersmith-plumbing");
    expect(view).not.toBeNull();
    expect(view!.id).toBe("coppersmith-plumbing");
    expect(view!.name).not.toBe("Happy Place Carpentry LLC");
    // Coppersmith has authorized media; HPP has none. Graphs differ, views differ.
    expect(view!.media.length).toBeGreaterThan(0);
    expect(view!.media.every((m) => m.rights === "authorized")).toBe(true);
    expect(view!.media[0].src.startsWith("/fyd-media/")).toBe(true);
  });

  test("lists both known object ids", () => {
    expect(listObjectIds().sort()).toEqual(["coppersmith-plumbing", "happy-place"]);
  });
});
