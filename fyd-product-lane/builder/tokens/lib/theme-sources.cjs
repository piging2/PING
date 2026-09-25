"use strict";
/**
 * Canonical per-theme source file sets for the FYD token pipeline.
 *
 * Single source of truth for the CJS side (build.cjs, contrast gate,
 * tests). The Style Dictionary ESM config imports this via
 * createRequire so both sides compile the same file sets in the same
 * order.
 */
const path = require("path");

const TOKENS_DIR = path.join(__dirname, "..", "tokens");

function f(name, tier) {
  return { path: path.join(TOKENS_DIR, name), tier };
}

const SHARED = [
  f("type.tokens.json", "shared"),
  f("space.tokens.json", "shared"),
  f("media.tokens.json", "shared"),
  f("motion.tokens.json", "shared"),
];

const THEME_SOURCES = {
  hpp: {
    name: "hpp",
    themeId: "fyd/hpp-warm-craftsman@1",
    selector: ':root[data-theme="hpp"]',
    exportName: "hppTokens",
    typeName: "HppTokens",
    files: [
      f("primitives.common.tokens.json", "primitive"),
      f("primitives.hpp.tokens.json", "primitive"),
      f("semantic.hpp.tokens.json", "semantic"),
      f("component.hpp.tokens.json", "component"),
      ...SHARED,
    ],
  },
  coppersmith: {
    name: "coppersmith",
    themeId: "fyd/coppersmith-trade-authority@1",
    selector: ':root[data-theme="coppersmith"]',
    exportName: "coppersmithTokens",
    typeName: "CoppersmithTokens",
    files: [
      f("primitives.common.tokens.json", "primitive"),
      f("primitives.coppersmith.tokens.json", "primitive"),
      f("semantic.coppersmith.tokens.json", "semantic"),
      f("component.coppersmith.tokens.json", "component"),
      ...SHARED,
    ],
  },
};

module.exports = { THEME_SOURCES, TOKENS_DIR };
