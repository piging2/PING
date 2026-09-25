"use strict";
/**
 * WCAG 2.2 AA contrast gate (token-model 8.2 step 2; 7.5 hard gate).
 *
 * Resolves the section-7 contrast pairs against the compiled token values
 * and asserts the required level. Any failing pair fails the build with
 * the pair named. A serious accessibility regression is a hard
 * disqualification: the theme does not ship.
 *
 * Levels:
 *   AA         4.5:1  normal text (WCAG 2.2 AA)
 *   AA-large   3.0:1  large text / decorative-with-text floor
 *   decorative 0       reported only, never gating (decorative-only tokens)
 */
const { loadTokenFiles, resolveAll } = require("./resolve.cjs");

const LEVELS = { AA: 4.5, "AA-large": 3.0, decorative: 0 };

function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`contrast gate needs a hex color, got "${hex}"`);
  const n = parseInt(m[1], 16);
  const r = srgbToLinear((n >> 16) & 0xff);
  const g = srgbToLinear((n >> 8) & 0xff);
  const b = srgbToLinear(n & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgHex, bgHex) {
  const l1 = luminance(fgHex);
  const l2 = luminance(bgHex);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** HPP pairs, measured 2026-09-25 (token-model 7.1). */
const HPP_PAIRS = [
  { fg: "text.primary", bg: "surface.content", level: "AA", note: "primary pair" },
  { fg: "text.primary", bg: "surface.band", level: "AA" },
  { fg: "text.heading", bg: "surface.content", level: "AA" },
  { fg: "text.muted", bg: "surface.content", level: "AA" },
  { fg: "accent.craft-text", bg: "surface.content", level: "AA" },
  { fg: "accent.gold-text", bg: "surface.content", level: "AA" },
  { fg: "accent.craft", bg: "surface.content", level: "AA-large", note: "decorative/large-text only on light" },
  { fg: "accent.gold", bg: "surface.content", level: "decorative", note: "2.20:1, decorative only on light" },
  { fg: "text.inverse", bg: "surface.brand", level: "AA" },
  { fg: "accent.gold-bright", bg: "surface.brand", level: "AA" },
  { fg: "accent.gold", bg: "surface.brand", level: "AA-large", note: "large text / decorative on dark" },
  { fg: "action.primary-text", bg: "action.primary", level: "AA" },
  { fg: "action.secondary-text", bg: "action.secondary", level: "AA" },
];

/** Coppersmith pairs, measured 2026-09-25 (token-model 7.2; provisional palette). */
const COPPERSMITH_PAIRS = [
  { fg: "text.primary", bg: "surface.content", level: "AA" },
  { fg: "text.heading", bg: "surface.content", level: "AA" },
  { fg: "accent.craft-text", bg: "surface.content", level: "AA" },
  { fg: "text.inverse", bg: "surface.brand", level: "AA" },
  { fg: "accent.craft", bg: "surface.brand", level: "AA" },
  { fg: "accent.craft-bright", bg: "surface.brand", level: "AA" },
  // Open verification 10.1, resolved by this gate: dark text on copper.
  { fg: "action.primary-text", bg: "action.primary", level: "AA", note: "open verification 10.1" },
  // Open verification 10.2.
  { fg: "text.muted", bg: "surface.content", level: "AA", note: "open verification 10.2" },
];

const THEME_PAIRS = { hpp: HPP_PAIRS, coppersmith: COPPERSMITH_PAIRS };

/**
 * Run the gate for one theme.
 * theme: { name, files: [{ path, tier }] }.
 * pairs: override pair list (defaults to THEME_PAIRS[theme.name]).
 * Returns { theme, pass, pairs: [...], failures: [...] }.
 */
function runContrastGate(theme, pairs) {
  const list = pairs || THEME_PAIRS[theme.name] || [];
  const flat = loadTokenFiles(theme.files);
  const resolved = resolveAll(flat);
  const results = list.map((p) => {
    const fgHex = resolved.get(p.fg);
    const bgHex = resolved.get(p.bg);
    if (typeof fgHex !== "string" || typeof bgHex !== "string") {
      return { ...p, fgHex, bgHex, ratio: null, required: LEVELS[p.level], pass: false, error: "unresolved token" };
    }
    const ratio = contrastRatio(fgHex, bgHex);
    const required = LEVELS[p.level];
    return {
      ...p,
      fgHex,
      bgHex,
      ratio: Math.round(ratio * 100) / 100,
      required,
      pass: ratio >= required,
    };
  });
  const failures = results.filter((r) => !r.pass);
  return { theme: theme.name, pass: failures.length === 0, pairs: results, failures };
}

module.exports = { runContrastGate, contrastRatio, luminance, HPP_PAIRS, COPPERSMITH_PAIRS, THEME_PAIRS, LEVELS };
