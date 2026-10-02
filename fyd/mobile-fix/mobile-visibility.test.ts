/**
 * Mobile regression test: objects must not silently disappear on mobile.
 *
 * Root cause (2026-09-23): `[data-motion='enter']` cards start at
 * `opacity: 0` and rely on CSS `animation-timeline: view()` to become
 * visible. The `/sites` pages rendered these cards but never mounted
 * `FydMotionFallback`, so on browsers where the scroll timeline does not
 * drive (or mis-reports support), the cards stayed invisible. Desktop
 * Chrome was unaffected, which hid the regression.
 *
 * Invariant: any client shell that renders `[data-motion='enter']`
 * elements MUST also render `<FydMotionFallback />`.
 */
import * as fs from "fs";
import * as path from "path";

const REPO = "/home/nolan/projects/ping";

describe("mobile object visibility invariant", () => {
  test("SiteClient mounts FydMotionFallback", () => {
    const p = path.join(REPO, "src/app/sites/_shared/site-client.tsx");
    const src = fs.readFileSync(p, "utf8");
    // Import present
    expect(src).toMatch(
      /import\s*\{\s*FydMotionFallback\s*\}\s*from\s*"@\/fyd\/components\/fyd-motion-fallback"/
    );
    // Component rendered in the main return
    expect(src).toContain("<FydMotionFallback />");
  });

  test("FydMotionFallback handles stuck native timelines", () => {
    const p = path.join(REPO, "src/fyd/components/fyd-motion-fallback.tsx");
    const src = fs.readFileSync(p, "utf8");
    // Must not blindly trust CSS.supports: verifies elements actually
    // become visible, and forces them visible if stuck.
    expect(src).toContain("fyd-force-visible");
    expect(src).toContain("getComputedStyle");
    // Must still honor reduced motion
    expect(src).toContain("prefers-reduced-motion");
  });

  test("renderer defines fyd-force-visible escape hatch", () => {
    const p = path.join(REPO, "src/fyd/components/renderer.tsx");
    const src = fs.readFileSync(p, "utf8");
    expect(src).toContain("fyd-force-visible");
  });

  test("motion fallback is a client component", () => {
    const p = path.join(REPO, "src/fyd/components/fyd-motion-fallback.tsx");
    const src = fs.readFileSync(p, "utf8");
    expect(src).toContain('"use client"');
    expect(src).toMatch(/export function FydMotionFallback/);
  });
});
