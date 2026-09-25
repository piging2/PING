/**
 * Shared Style Dictionary v4 wiring for the FYD token pipeline.
 *
 * Registers the two FYD transforms and the three FYD formats on a
 * StyleDictionary class, and builds the per-theme platform set.
 *
 * Architecture note: Style Dictionary v4 loads tokens once per instance
 * from the top-level `source` (per-platform `source` is not honored), so
 * the build runs one instance per theme. Per-theme file sets live in
 * lib/theme-sources.cjs, the single source of truth shared with the
 * validator, the contrast gate, and the tests.
 */
import { createRequire } from "node:module";
import { registerCssVariablesFormat } from "../formats/fyd-css-variables.mjs";
import { registerTailwindThemeFormat } from "../formats/fyd-tailwind-theme.mjs";
import { registerTsTokensFormat } from "../formats/fyd-ts-tokens.mjs";

const require = createRequire(import.meta.url);
const { THEME_SOURCES } = require("../lib/theme-sources.cjs");

export { THEME_SOURCES };

export const TRANSFORMS = ["name/fyd-kebab", "fyd/value-css"];

export function registerFyd(StyleDictionary) {
  /** name/fyd-kebab: --fyd-color-text-primary style names, deterministic. */
  StyleDictionary.registerTransform({
    name: "name/fyd-kebab",
    type: "name",
    transform: (token) => `fyd-${token.path.join("-")}`,
  });

  /**
   * fyd/value-css: normalize values for CSS output.
   * - references ("{group.token}") are left for SD to resolve;
   * - colors are lowercased hex;
   * - bare numbers become px (ms for durations);
   * - everything else (clamp(), font stacks, cubic-bezier, shadows,
   *   aspect ratios, enums) passes through untouched.
   * Transitive so resolved alias values are normalized too.
   */
  StyleDictionary.registerTransform({
    name: "fyd/value-css",
    type: "value",
    transitive: true,
    transform: (token) => {
      const raw = token.value ?? token.$value;
      const v = typeof raw === "string" ? raw : String(raw);
      const trimmed = v.trim();
      if (/^\{.*\}$/.test(trimmed)) return v; // unresolved reference
      if (token.$type === "color") return trimmed.toLowerCase();
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return token.$type === "duration" ? `${trimmed}ms` : `${trimmed}px`;
      }
      return v;
    },
  });

  registerCssVariablesFormat(StyleDictionary);
  registerTailwindThemeFormat(StyleDictionary);
  registerTsTokensFormat(StyleDictionary);
}

/** Platform set for one theme instance: css-variables, tailwind, ts. */
export function platformsFor(themeName, outDir) {
  const theme = THEME_SOURCES[themeName];
  if (!theme) throw new Error(`unknown theme "${themeName}"`);
  return {
    css: {
      transforms: TRANSFORMS,
      buildPath: outDir.endsWith("/") ? outDir : outDir + "/",
      files: [
        {
          destination: `${themeName}.tokens.css`,
          format: "fyd/css-variables",
          options: { theme: themeName, selector: theme.selector },
        },
      ],
    },
    tailwind: {
      transforms: TRANSFORMS,
      buildPath: outDir.endsWith("/") ? outDir : outDir + "/",
      files: [
        {
          destination: `${themeName}.tailwind-theme.css`,
          format: "fyd/tailwind-theme",
          options: { theme: themeName },
        },
      ],
    },
    ts: {
      transforms: TRANSFORMS,
      buildPath: outDir.endsWith("/") ? outDir : outDir + "/",
      files: [
        {
          destination: `${themeName}.tokens.ts`,
          format: "fyd/ts-tokens",
          options: {
            theme: themeName,
            exportName: theme.exportName,
            typeName: theme.typeName,
          },
        },
      ],
    },
  };
}
