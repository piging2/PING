/**
 * Theme registry: the planner/renderer seam resolves theme names to
 * compiled artifacts and rejects unknown themes.
 */
import {
  FYD_COMPILED_THEMES,
  resolveCompiledTheme,
  resolveCompiledThemeById,
} from "../themes";

describe("theme registry", () => {
  test("HPP theme resolves to its compiled artifacts", () => {
    const theme = resolveCompiledThemeById("fyd/hpp-warm-craftsman@1");
    expect(theme.dataTheme).toBe("hpp");
    expect(theme.cssFile).toBe("builder/tokens/out/hpp.tokens.css");
    expect(theme.tailwindThemeFile).toBe("builder/tokens/out/hpp.tailwind-theme.css");
    expect(theme.tsFile).toBe("builder/tokens/out/hpp.tokens.ts");
    expect(theme.provisional).toBe(false);
  });

  test("Coppersmith theme is flagged provisional", () => {
    const theme = resolveCompiledThemeById("fyd/coppersmith-trade-authority@1");
    expect(theme.dataTheme).toBe("coppersmith");
    expect(theme.provisional).toBe(true);
  });

  test("a SiteSpec designTokens ref resolves", () => {
    const theme = resolveCompiledTheme({ theme: "fyd/hpp-warm-craftsman@1", tier: "semantic" });
    expect(theme.id).toBe("fyd/hpp-warm-craftsman@1");
  });

  test("unknown theme id throws with the known list", () => {
    expect(() => resolveCompiledThemeById("fyd/not-a-theme@1")).toThrow(/Unknown theme/);
    expect(() => resolveCompiledTheme({ theme: "tailwind" })).toThrow(/Unknown theme/);
  });

  test("registry covers every known theme id", () => {
    for (const id of Object.keys(FYD_COMPILED_THEMES) as (keyof typeof FYD_COMPILED_THEMES)[]) {
      expect(FYD_COMPILED_THEMES[id].id).toBe(id);
    }
    expect(Object.keys(FYD_COMPILED_THEMES)).toHaveLength(2);
  });

  test("no token values are inlined in the registry", () => {
    const serialized = JSON.stringify(FYD_COMPILED_THEMES);
    expect(serialized).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
