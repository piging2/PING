import sys

p = "/home/nolan/projects/ping/src/app/page.tsx"
s = open(p).read()

old1 = 'import { buildPortalProjection, HOMEPAGE_CIRCLE_SITE_IDS } from "@/fyd/preview/pipeline";\nimport { HomeCircles } from "@/fyd/ui/home-circles";'
new1 = 'import { buildPortalProjection } from "@/fyd/preview/pipeline";\nimport { InlineObjectCircle } from "@/fyd/ui/inline-object-circle";'
assert s.count(old1) == 1, "old1 not found"
s = s.replace(old1, new1)

old2 = '  const portalProjections = HOMEPAGE_CIRCLE_SITE_IDS.flatMap((id) => { const pr = buildPortalProjection(id); return pr ? [{ siteId: id, projection: pr }] : []; });'
new2 = '  const happyPlace = buildPortalProjection("happy-place");'
assert s.count(old2) == 1, "old2 not found"
s = s.replace(old2, new2)

old3 = '''      {/* Portal margin: PING circles inhabit unused peripheral space only. Geometry, not breakpoints, decides whether a slot is honest. */}
      <HomeCircles portals={portalProjections} />'''

new3 = '''      {/* FYD OBJECT LAB: one PING object beside a real body paragraph.
          The circle lives in the left margin like a citation or an
          interactive footnote. Ask FYD stays out of this test. */}
      {happyPlace ? (
        <Section size="minor">
          <Container className="max-w-4xl">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-honey">/object</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-[232px_1fr]">
              <div className="flex justify-start">
                <InlineObjectCircle
                  objectId={happyPlace.circle.id}
                  name={happyPlace.circle.name}
                  imageSrc={happyPlace.preview?.src ?? null}
                  imageSrcSet={happyPlace.preview?.srcSet ?? null}
                  websiteUrl={happyPlace.websiteHref}
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text">One object, in the margin</h2>
                <p className="mt-4 text-lg text-text-muted" style={{ lineHeight: 'var(--leading-body)' }}>
                  This circle is the PING object for Happy Place Carpentry. It rests small in the
                  margin and expands where it sits. Hover, focus, or tap it: inside are exactly
                  three actions, follow, like, and the business website. Nothing leaves the circle.
                </p>
                <p className="mt-4 text-text-muted">
                  The question under test is simple. Can a PING object live naturally beside web
                  content, like a citation or an interactive footnote, instead of floating over it?
                </p>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}'''

assert s.count(old3) == 1, "old3 not found"
s = s.replace(old3, new3)

open(p, "w").write(s)
print("page.tsx patched OK")
