import sys

def replace_once(path, old, new):
    with open(path) as f:
        src = f.read()
    n = src.count(old)
    if n != 1:
        print(f"FAIL {path}: found {n} occurrences, expected 1")
        sys.exit(1)
    with open(path, "w") as f:
        f.write(src.replace(old, new, 1))
    print(f"OK {path}")

R = "/home/nolan/projects/ping"

# ---------- src/app/layout.tsx ----------
replace_once(
    R + "/src/app/layout.tsx",
    'import { MotionProvider } from "@/components/motion-provider";',
    'import { MotionProvider } from "@/components/motion-provider";\nimport { EffectsProvider } from "@/components/effects-provider";',
)
replace_once(
    R + "/src/app/layout.tsx",
    '<ThemeProvider defaultTheme="light" storageKey="ping-theme">\n          <MotionProvider>',
    '<ThemeProvider defaultTheme="light" storageKey="ping-theme">\n          <EffectsProvider>\n          <MotionProvider>',
)
replace_once(
    R + "/src/app/layout.tsx",
    "</LenisProvider>\n          </MotionProvider>",
    "</LenisProvider>\n          </MotionProvider>\n          </EffectsProvider>",
)
replace_once(
    R + "/src/app/layout.tsx",
    """              })();
            `,
          }}
        />""",
    """              })();
              (function() {
                try {
                  var p = localStorage.getItem('ping-effects');
                  var r = p || (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full');
                  document.documentElement.classList.add('effects-' + r);
                } catch (e) {}
              })();
            `,
          }}
        />""",
)

# ---------- src/components/site-header.tsx ----------
replace_once(
    R + "/src/components/site-header.tsx",
    'import { ThemeToggle } from "@/components/theme-toggle";',
    'import { ThemeToggle } from "@/components/theme-toggle";\nimport { EffectsToggle } from "@/components/effects-toggle";',
)
replace_once(
    R + "/src/components/site-header.tsx",
    "          <ThemeToggle />\n          {contact && (",
    "          <ThemeToggle />\n          <EffectsToggle />\n          {contact && (",
)
replace_once(
    R + "/src/components/site-header.tsx",
    '''              <span className="text-sm text-black dark:text-text-on-dark">Theme</span>
              <ThemeToggle />''',
    '''              <span className="text-sm text-black dark:text-text-on-dark">Display</span>
              <div className="flex items-center gap-1">
                <EffectsToggle />
                <ThemeToggle />
              </div>''',
)

# ---------- src/app/page.tsx ----------
replace_once(
    R + "/src/app/page.tsx",
    'import { PingWordmark } from "@/components/ping-wordmark";',
    'import { HeroIntro } from "@/components/hero-intro";',
)
replace_once(R + "/src/app/page.tsx", "<BlueprintGrid />", "<BlueprintGrid drift />")
replace_once(
    R + "/src/app/page.tsx",
    """            <ScrollReveal>
              <div className="mb-6">
                <PingWordmark className="scale-125 origin-left" />
              </div>
              <p className="text-lg font-medium text-honey">{tenant.tagline}</p>
              <h1 className="mt-4 text-4xl font-bold text-text-on-dark sm:text-5xl lg:text-6xl" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>
                Systems that remember,<br />agents you can trust
              </h1>
              <p className="mt-6 max-w-xl text-lg text-text-on-dark/90" style={{ lineHeight: 'var(--leading-body)' }}>
                PING turns information into reliable understanding, understanding into useful action,
                and action into evidence that can be trusted and replayed.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#architecture"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-honey px-8 font-semibold text-honey-foreground transition-colors hover:bg-honey-hover"
                >
                  Explore the architecture
                </Link>
                <Link
                  href="#ping-social"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-text-on-dark/30 px-8 font-semibold text-text-on-dark transition-colors hover:bg-text-on-dark/10"
                >
                  PING Social
                </Link>
              </div>
              <p className="mt-6 text-sm text-text-on-dark/60">
                This site is a live TenantOS tenant. The runtime behind it is under active construction.
                Maturity labels on this page say what is real.
              </p>
            </ScrollReveal>""",
    "            <HeroIntro tagline={tenant.tagline} />",
)

# ---------- src/motion/motionTokens.ts ----------
replace_once(
    R + "/src/motion/motionTokens.ts",
    "Standardized animation durations in milliseconds",
    "Standardized animation durations in seconds",
)
replace_once(
    R + "/src/motion/motionTokens.ts",
    "Standardized animation delays in milliseconds",
    "Standardized animation delays in seconds",
)

print("ALL EDITS APPLIED")
