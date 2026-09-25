/**
 * Token pipeline tests: pre-build validation and the WCAG 2.2 AA contrast
 * gate (token-model 8.2 steps 1-2).
 *
 * - Real HPP theme: validation clean, all 13 contrast pairs pass.
 * - Real Coppersmith theme: validation clean; the gate checks the two
 *   open verifications from token-model 10.1/10.2 and both now pass with
 *   measured ratios.
 * - Broken fixtures: dangling alias fails validation; a component-tier
 *   token aliasing a primitive fails validation; a failing contrast pair
 *   fails the gate with the pair named.
 */
const path = require("path");

const { THEME_SOURCES } = require("../../../../builder/tokens/lib/theme-sources.cjs");
const { validateTheme } = require("../../../../builder/tokens/lib/validate-tokens.cjs");
const { runContrastGate } = require("../../../../builder/tokens/lib/contrast-gate.cjs");

const FIXTURES = path.join(__dirname, "fixtures");

describe("token validation", () => {
  test("HPP theme validates clean", () => {
    const { errors } = validateTheme(THEME_SOURCES.hpp);
    expect(errors).toEqual([]);
  });

  test("Coppersmith theme validates clean", () => {
    const { errors } = validateTheme(THEME_SOURCES.coppersmith);
    expect(errors).toEqual([]);
  });

  test("dangling alias fails validation", () => {
    const { errors } = validateTheme({
      name: "broken",
      files: [{ path: path.join(FIXTURES, "validate-dangling.tokens.json"), tier: "semantic" }],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e: string) => e.includes("dangling") && e.includes("color.nope"))).toBe(true);
  });

  test("component-tier token aliasing a primitive fails validation", () => {
    const { errors } = validateTheme({
      name: "broken",
      files: [{ path: path.join(FIXTURES, "validate-primitive.tokens.json"), tier: "component" }],
    });
    expect(errors.some((e: string) => e.includes("hero.kicker") && e.includes("primitive"))).toBe(true);
  });
});

describe("contrast gate", () => {
  test("HPP: all 13 pairs pass WCAG 2.2 AA", () => {
    const gate = runContrastGate(THEME_SOURCES.hpp);
    expect(gate.failures).toEqual([]);
    expect(gate.pass).toBe(true);
    expect(gate.pairs).toHaveLength(13);
  });

  test("HPP primary pair matches the measured 5.68:1", () => {
    const gate = runContrastGate(THEME_SOURCES.hpp);
    const primary = gate.pairs.find(
      (p: any) => p.fg === "text.primary" && p.bg === "surface.content",
    );
    expect(primary.ratio).toBeCloseTo(5.68, 2);
    expect(primary.pass).toBe(true);
  });

  test("Coppersmith: open verification 10.1 (dark text on copper) passes", () => {
    const gate = runContrastGate(THEME_SOURCES.coppersmith);
    const pair = gate.pairs.find(
      (p: any) => p.fg === "action.primary-text" && p.bg === "action.primary",
    );
    expect(pair).toBeDefined();
    expect(pair.pass).toBe(true);
    expect(pair.ratio).toBeGreaterThanOrEqual(4.5);
  });

  test("Coppersmith: open verification 10.2 (muted text) passes", () => {
    const gate = runContrastGate(THEME_SOURCES.coppersmith);
    const pair = gate.pairs.find(
      (p: any) => p.fg === "text.muted" && p.bg === "surface.content",
    );
    expect(pair).toBeDefined();
    expect(pair.pass).toBe(true);
    expect(pair.ratio).toBeGreaterThanOrEqual(4.5);
  });

  test("broken fixture fails the gate with the pair named", () => {
    const gate = runContrastGate(
      {
        name: "broken",
        files: [{ path: path.join(FIXTURES, "contrast-broken.tokens.json"), tier: "semantic" }],
      },
      [{ fg: "text.primary", bg: "surface.content", level: "AA" }],
    );
    expect(gate.pass).toBe(false);
    expect(gate.failures).toHaveLength(1);
    expect(gate.failures[0].fg).toBe("text.primary");
    expect(gate.failures[0].bg).toBe("surface.content");
    expect(gate.failures[0].ratio).toBeLessThan(4.5);
  });
});
