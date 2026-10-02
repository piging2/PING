/**
 * Tests for the owner intent interpreter: deterministic plain language to
 * typed OwnerCommand. Proposing must never mutate anything; only the
 * approve stage writes.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { interpretTextCommand } from "../commands";

beforeEach(() => {
  process.env.FYD_OWNER_DIR = mkdtempSync(join(tmpdir(), "fyd-cmd-test-"));
});

describe("interpretTextCommand", () => {
  test("Put decks first becomes a typed move-service proposal", () => {
    const p = interpretTextCommand("Put decks first", "happy-place");
    expect(p).not.toBeNull();
    expect(p!.command).toEqual({ type: "move-service", id: "svc-decks", to: "first" });
    expect(p!.summary).toContain("Decks");
  });

  test("handles case and surrounding whitespace", () => {
    const p = interpretTextCommand("  PUT FENCES LAST ", "happy-place");
    expect(p!.command).toEqual({ type: "move-service", id: "svc-fences", to: "last" });
  });

  test("move up/down, hide/show, add", () => {
    expect(interpretTextCommand("Move pergolas up", "happy-place")!.command).toEqual({
      type: "move-service",
      id: "svc-pergolas",
      to: "up",
    });
    expect(interpretTextCommand("Hide bathrooms", "happy-place")!.command).toEqual({
      type: "set-service-visibility",
      id: "svc-bathrooms",
      visible: false,
    });
    expect(interpretTextCommand("Show bathrooms", "happy-place")!.command).toEqual({
      type: "set-service-visibility",
      id: "svc-bathrooms",
      visible: true,
    });
    const add = interpretTextCommand("Add patios", "happy-place")!;
    expect(add.command).toEqual({ type: "add-service", name: "Patios" });
    expect(add.summary).toContain("Patios");
  });

  test("unknown service or unknown shape returns null, never a guess", () => {
    expect(interpretTextCommand("Put rockets first", "happy-place")).toBeNull();
    expect(interpretTextCommand("What is your refund policy?", "happy-place")).toBeNull();
    expect(interpretTextCommand("", "happy-place")).toBeNull();
  });

  test("proposing never writes owner state", () => {
    const { readOverrides } = require("../owner-store") as typeof import("../owner-store");
    interpretTextCommand("Put decks first", "happy-place");
    expect(readOverrides("happy-place").history).toEqual([]);
  });
});
