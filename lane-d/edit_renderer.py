"""MEDIA INTO HERO lane: wire the canonical media selector into the generic Hero.

Edit 1 of 3: src/fyd/components/renderer.tsx
- type-only DisplayMedia import (erased at compile; client bundle safe)
- RenderContext.heroMedia field
- Hero renders the threaded hero image, or stays typographic when null
"""
import sys

PATH = "src/fyd/components/renderer.tsx"
src = open(PATH, encoding="utf-8").read()

# --- R1: type-only media import ---
old_import = 'import { resolveSafeLink, type SafeLinkResult } from "../sitespec/safe-link";\n'
new_import = (
    'import { resolveSafeLink, type SafeLinkResult } from "../sitespec/safe-link";\n'
    '// Type-only: erased at compile, so the client bundle never touches the\n'
    '// server-only media store. The selector runs at the server render seam.\n'
    'import type { DisplayMedia } from "../media/select";\n'
)
assert src.count(old_import) == 1, "R1 anchor not unique"
src = src.replace(old_import, new_import)

# --- R2: RenderContext.heroMedia ---
old_ctx = """  siteId?: string;
}"""
new_ctx = """  siteId?: string;
  /**
   * Hero media for the spec owner, resolved once at the server render seam
   * via the canonical media selector (heroMediaFor in src/fyd/media/select).
   * Serialized DisplayMedia: the renderer never selects media itself.
   * Null (or absent) means the owner has no acquired media, and the Hero
   * renders its honest typographic state, never an invented image.
   */
  heroMedia?: DisplayMedia | null;
}"""
assert src.count(old_ctx) == 1, "R2 anchor not unique"
src = src.replace(old_ctx, new_ctx)

# --- R3: Hero renders the threaded image ---
old_hero = '''function Hero({ objects, presentation, theme, ctx }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  const website = safeWebsite(ctx);
  const heading = presentation.heading ?? boundTitle(ctx, o);
  const copy = presentation.copy ?? boundDescription(ctx, o);
  return (
    <section className="w-full px-4 py-16 sm:px-6 sm:py-24" style={{ background: theme.ink }}>
      <div className="mx-auto max-w-5xl">
        <ClaimBadge />'''

new_hero = '''function Hero({ objects, presentation, theme, ctx }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  const website = safeWebsite(ctx);
  const heading = presentation.heading ?? boundTitle(ctx, o);
  const copy = presentation.copy ?? boundDescription(ctx, o);
  // Media is threaded through RenderContext from the server render seam;
  // the renderer never selects it. Null keeps the honest typographic hero.
  const hero = ctx.heroMedia ?? null;
  return (
    <section className="w-full" style={{ background: theme.ink }}>
      {hero ? (
        <div
          className="relative h-64 w-full overflow-hidden sm:h-80"
          data-hero-media={hero.id}
        >
          {hero.blurUrl ? (
            <img
              src={hero.blurUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-md"
            />
          ) : null}
          <img
            src={hero.src}
            alt={hero.alt}
            width={hero.width}
            height={hero.height}
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <ClaimBadge />'''

assert src.count(old_hero) == 1, "R3 anchor not unique"
src = src.replace(old_hero, new_hero)

# --- R4: close the extra wrapper div ---
old_close = '''          </a>
        </div>
      </div>
    </section>
  );
}

function BusinessSummary('''
new_close = '''          </a>
        </div>
      </div>
      </div>
    </section>
  );
}

function BusinessSummary('''
assert src.count(old_close) == 1, "R4 anchor not unique"
src = src.replace(old_close, new_close)

open(PATH, "w", encoding="utf-8").write(src)
print("renderer.tsx patched OK")
