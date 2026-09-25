/**
 * FYD theme registry: planner/renderer seam for the compiled design tokens.
 *
 * The planner selects a theme BY NAME (FYDThemeId, see
 * src/fyd/sitespec/types.ts). This registry resolves the name to the
 * compiled artifacts the token build produced. The renderer then:
 *   1. links the theme's .tokens.css (or inlines it),
 *   2. sets data-theme="<name>" on the document root,
 *   3. references tokens only as var(--fyd-...) or Tailwind utilities.
 *
 * Hard rules (token-model 10.3, 8.5):
 * - Unknown theme ids throw. There is no fallback theme.
 * - No token VALUES are inlined anywhere in this registry or in SiteSpec.
 *   Values live only in the compiled outputs.
 * - Product code references semantic/component tokens only, never
 *   primitives (primitives are compiled for the semantic tier to resolve;
 *   the @theme block deliberately aliases semantic/component slots only).
 */
import {
  FYD_THEME_IDS,
  isKnownThemeId,
  type FYDDesignTokenRef,
  type FYDThemeId,
} from "../sitespec/types";

/** Compiled artifacts for one theme, as emitted by builder/tokens/build.cjs. */
export interface FYDCompiledTheme {
  /** Registry id, e.g. "fyd/hpp-warm-craftsman@1". */
  id: FYDThemeId;
  /** data-theme value the CSS selector keys on. */
  dataTheme: string;
  /** Compiled CSS custom properties (:root[data-theme="..."]). */
  cssFile: string;
  /** Compiled Tailwind v4 @theme block. */
  tailwindThemeFile: string;
  /** Compiled typed, frozen TS token map. */
  tsFile: string;
  /** True while the theme's palette is provisional (Coppersmith). */
  provisional: boolean;
}

const TOKENS_OUT = "builder/tokens/out";

function compiledTheme(
  id: FYDThemeId,
  dataTheme: string,
  provisional: boolean,
): FYDCompiledTheme {
  return {
    id,
    dataTheme,
    cssFile: `${TOKENS_OUT}/${dataTheme}.tokens.css`,
    tailwindThemeFile: `${TOKENS_OUT}/${dataTheme}.tailwind-theme.css`,
    tsFile: `${TOKENS_OUT}/${dataTheme}.tokens.ts`,
    provisional,
  };
}

/** Registry: theme id -> compiled artifacts. */
export const FYD_COMPILED_THEMES: Record<FYDThemeId, FYDCompiledTheme> = {
  "fyd/hpp-warm-craftsman@1": compiledTheme(
    "fyd/hpp-warm-craftsman@1",
    "hpp",
    false,
  ),
  "fyd/coppersmith-trade-authority@1": compiledTheme(
    "fyd/coppersmith-trade-authority@1",
    "coppersmith",
    true,
  ),
};

/** Resolve a SiteSpec design-token reference to compiled artifacts. */
export function resolveCompiledTheme(ref: FYDDesignTokenRef): FYDCompiledTheme {
  if (!isKnownThemeId(ref.theme)) {
    throw new Error(
      `Unknown theme "${ref.theme}". Known themes: ${FYD_THEME_IDS.join(", ")}.`,
    );
  }
  return FYD_COMPILED_THEMES[ref.theme];
}

/** Resolve a bare theme id string to compiled artifacts. */
export function resolveCompiledThemeById(id: string): FYDCompiledTheme {
  if (!isKnownThemeId(id)) {
    throw new Error(
      `Unknown theme "${id}". Known themes: ${FYD_THEME_IDS.join(", ")}.`,
    );
  }
  return FYD_COMPILED_THEMES[id];
}
