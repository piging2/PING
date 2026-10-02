def edit(path, old, new):
    src = open(path).read()
    n = src.count(old)
    assert n == 1, "%s: expected 1 match, found %d for: %r" % (path, n, old[:60])
    open(path, "w").write(src.replace(old, new))
    print("OK " + path, flush=True)

P = "src/fyd/proceduralize/planner.ts"

# 2. FeaturedService: remove the per-card call copy (the map defect)
edit(P,
  '    if (ctx.primary && ctx.primary.kind === "call") {\n      ctaBindings.push({ ...ctx.primary, placement: "featuredservice" });\n    }\n',
  '    // No per-card call copy: the phone lives in the site chrome. Cards convert\n'
  '    // through quote-start / schedule; the copy above duplicated the phone once\n'
  '    // per featured service (visitor phone-duplication rule).\n')

# 3. ContactCTA: the call primary is not copied into the contact section
edit(P,
  '  const ctaBindings: PlannedCtaBinding[] = [{ ...ctx.primary, placement: "contactcta" }];',
  '  // The call primary lives in the site chrome; the contact section converts\n'
  '  // through quote-start / schedule.\n'
  '  const ctaBindings: PlannedCtaBinding[] =\n'
  '    ctx.primary.kind === "call" ? [] : [{ ...ctx.primary, placement: "contactcta" }];')

N = "src/fyd/family/components/Navigation.tsx"
# 4. Navigation: skip the in-header primary pill when it is the call CTA
#    (the PhoneLink already serves as the header call action)
edit(N,
  '          {primary && <Cta cta={primary} ctx={ctx} />}',
  '          {/* The call primary is already served by the PhoneLink above; the pill\n'
  '              would duplicate the phone inside the header. */}\n'
  '          {primary && primary.kind !== "call" && <Cta cta={primary} ctx={ctx} />}\n'
  '          {/* The quiet AskFYD entry: one subtle button, never competing with the call. */}')

print("edits 2-4 applied", flush=True)
