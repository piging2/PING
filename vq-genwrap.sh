#!/bin/bash
# Wrapper: run the patch generator python on the Pig.
cd /home/nolan/projects/ping || exit 1
command -v python3 >/dev/null || exit 1
python3 - <<'PYEOF'
import hashlib
import subprocess
import sys
import os

REPO = "/home/nolan/projects/ping"
OUT = "/tmp/vq-patches-gen"

os.makedirs(OUT, exist_ok=True)

def md5(p):
    return hashlib.md5(open(p, "rb").read()).hexdigest()

def sh(args):
    r = subprocess.run(args, capture_output=True, text=True, cwd=REPO)
    return r.returncode, r.stdout, r.stderr

def gen(name, relpath, reps):
    full = os.path.join(REPO, relpath)
    orig = open(full, "rb").read()
    before = md5(full)
    text = orig.decode("utf-8")
    for old, new in reps:
        c = text.count(old)
        assert c == 1, "%s: old block count=%d in %s: %r" % (name, c, relpath, old[:70])
        text = text.replace(old, new)
    open(full, "w", encoding="utf-8").write(text)
    rc, diff, err = sh(["git", "diff", "--", relpath])
    assert rc == 0, "%s: git diff failed: %s" % (name, err)
    assert diff.strip(), "%s: empty diff" % name
    open(full, "wb").write(orig)
    after = md5(full)
    assert after == before, "%s: RESTORE MISMATCH for %s" % (name, relpath)
    ppath = os.path.join(OUT, name + ".patch")
    open(ppath, "w", encoding="utf-8").write(diff)
    rc, out, err = sh(["git", "apply", "--check", "--verbose", ppath])
    status = "PASS" if rc == 0 else "FAIL"
    print("%s: %s (%s)" % (status, name, relpath), flush=True)
    if rc != 0:
        print(out)
        print(err)
        sys.exit(1)

gen("vq-001-motion-never-gates-content", "src/fyd/components/renderer.tsx", [(
r'''        "@keyframes fyd-enter { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }",
        "}",
        // Base state is VISIBLE. JS adds .fyd-io-pending only to below-fold elements.
        ".fyd-io [data-motion='enter'] { transition: opacity 480ms ease, transform 480ms ease; }",
        ".fyd-io [data-motion='enter'].fyd-io-pending { opacity: 0; transform: translateY(16px); }",''',
r'''        // VQ-001: motion never gates content. The native view() timeline holds
        // below-fold elements at progress 0 for full-page captures, print,
        // crawlers, and no-scroll contexts, so the entrance keeps its slide
        // but never touches opacity: content is always painted.
        "@keyframes fyd-enter { from { transform: translateY(16px); } to { transform: none; } }",
        "}",
        // Print and other non-interactive renderings: everything visible.
        "@media print { [data-motion='enter'], .fyd-hero-settle { animation: none !important; opacity: 1 !important; transform: none !important; } }",
        // Base state is VISIBLE. JS adds .fyd-io-pending only to below-fold elements.
        ".fyd-io [data-motion='enter'] { transition: opacity 480ms ease, transform 480ms ease; }",
        ".fyd-io [data-motion='enter'].fyd-io-pending { transform: translateY(16px); }",''')])

gen("vq-001-test", "src/fyd/components/__tests__/mobile-visibility.test.ts", [(
r'''    // The unconditional opacity:0 rule must be gone.
    // Only .fyd-io-pending (JS-added, below-fold only) may hide.
    expect(src).not.toMatch(
      /"\.fyd-io \[data-motion='enter'\] \{ opacity: 0;/
    );
    // The pending class exists for JS-controlled hiding.
    expect(src).toContain("fyd-io-pending");
  });''',
r'''    // The unconditional opacity:0 rule must be gone.
    // Nothing may hide via opacity, not even .fyd-io-pending (VQ-001):
    // full-page captures, print, crawlers, and no-scroll contexts never
    // drive the timeline or the observer, so opacity is never a gate.
    expect(src).not.toMatch(
      /"\.fyd-io \[data-motion='enter'\] \{ opacity: 0;/
    );
    expect(src).not.toMatch(
      /"\.fyd-io \[data-motion='enter'\]\.fyd-io-pending \{ opacity: 0;/
    );
    // The pending class still exists for the JS-controlled entrance,
    // but its entrance is transform-only.
    expect(src).toContain("fyd-io-pending");
    // VQ-001: the native scroll-timeline entrance must never zero opacity.
    const enterLine = src
      .split("\n")
      .find((l) => l.includes("@keyframes fyd-enter"));
    expect(enterLine).toBeDefined();
    expect(enterLine).not.toContain("opacity");
    // Print forces everything visible.
    expect(src).toContain("@media print");
  });''')])

gen("vq-002-hero-pill-on-dark", "src/fyd/components/renderer.tsx", [(
r'''function ClaimBadge({ objects }: { objects: PingObject[] }) {
  return (
    <span className="inline-block rounded-full border border-border-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent">
      {claimBadgeLabel(objects)}
    </span>
  );
}''',
r'''/**
 * VQ-002: the badge defaults to the light-surface treatment
 * (border-border-soft / text-accent). On the dark hero slab (theme.ink) those
 * light-theme tokens are illegible, so the Hero passes tone="onDark": text in
 * text-background (the same token as the hero h1, proven legible on ink)
 * with a theme.accent border (the same treatment as the Ask FYD button border
 * on the same slab). Theme tokens only; no invented colors, no literal
 * RGB-complement math.
 */
function ClaimBadge({
  objects,
  theme,
  tone,
}: {
  objects: PingObject[];
  theme?: FYDThemeTokens;
  tone?: "onDark";
}) {
  const dark = tone === "onDark" && theme != null;
  return (
    <span
      className={
        "inline-block rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide" +
        (dark ? " text-background" : " border-border-soft text-accent")
      }
      style={dark && theme ? { borderColor: theme.accent } : undefined}
    >
      {claimBadgeLabel(objects)}
    </span>
  );
}'''), (
r'''      <div className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <ClaimBadge objects={objects} />''',
r'''      <div className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <ClaimBadge objects={objects} theme={theme} tone="onDark" />''')])

gen("vq-004-typographic-hero-treatment", "src/fyd/components/renderer.tsx", [(
r'''    <section
      className="w-full"
      data-motion="hero-settle"
      data-layout-character={character}
      style={{ background: theme.ink }}
    >''',
r'''    <section
      className="w-full"
      data-motion="hero-settle"
      data-layout-character={character}
      data-hero-treatment={hero ? "photo" : "typographic"}
      // VQ-004: designed no-media hero treatment. When the media stage has no
      // acquired photo for this business (hookup: page.tsx heroMediaFor ->
      // SiteClient prop -> ctx.heroMedia), the slab is not a flat empty panel:
      // a deterministic token-derived accent wash. No images, no invented
      // content; photo heroes are untouched.
      style={{
        background: hero
          ? theme.ink
          : "linear-gradient(160deg, " +
            theme.ink +
            " 55%, color-mix(in srgb, " +
            theme.accent +
            " 16%, " +
            theme.ink +
            "))",
      }}
    >''')])

gen("m-issue-2-fab-inflow-mobile", "src/fyd/components/object-rail.tsx", [(
r'''  const autoCss =
    "@media (max-width: " + (bp - 1) + "px){.fyd-rail-auto-rail{display:none!important}}" +
    "@media (min-width: " + bp + "px){.fyd-rail-auto-trigger{display:none!important}}";''',
r'''  const autoCss =
    "@media (max-width: " + (bp - 1) + "px){.fyd-rail-auto-rail{display:none!important}}" +
    "@media (min-width: " + bp + "px){.fyd-rail-auto-trigger{display:none!important}}" +
    // ISSUE-2: below the breakpoint the trigger is in-flow, never fixed. The
    // fixed 153px pill occluded section headings at 320px (48% of viewport).
    "@media (max-width: " +
    (bp - 1) +
    "px){.fyd-rail-auto-trigger .fyd-rail-auto-trigger-btn{position:static!important;margin:0.75rem auto 0}}";'''), (
r'''            className="fixed bottom-6 right-6 z-40 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-5 py-3 text-sm font-semibold shadow-lg"''',
r'''            className="fyd-rail-auto-trigger-btn fixed bottom-6 right-6 z-40 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-5 py-3 text-sm font-semibold shadow-lg"''')])

gen("m-issue-3-mobile-hero-call-cta", "src/fyd/components/renderer.tsx", [(
r'''        <div className="mt-8 flex flex-wrap gap-3">
          {website.kind === "safe" ? (''',
r'''        <div className="mt-8 flex flex-wrap gap-3">
          {/* ISSUE-3: thumb-reachable dial action on mobile. phoneMethod is a
              binding-verified ContactMethod; when the primary slot is taken by
              Visit website, mobile also gets a Call button (md:hidden keeps
              desktop untouched). It opens the FYD contact flow (value +
              provenance + the real Call action), never a raw tel: link. */}
          {website.kind === "safe" && phoneMethod ? (
            <span className="md:hidden">
              <FydContactLink method={phoneMethod} theme={theme} variant="button" />
            </span>
          ) : null}
          {website.kind === "safe" ? (''')])

print("ALL PATCHES GENERATED AND CHECKED")
PYEOF
echo "=== repo status after generation ==="
git -C /home/nolan/projects/ping status --porcelain | head -5
echo "(only pre-existing entries expected above)"
ls -la /tmp/vq-patches-gen/
