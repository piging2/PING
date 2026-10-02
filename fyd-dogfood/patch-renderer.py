#!/usr/bin/env python3
"""Dogfood quality-pass patch for src/fyd/components/renderer.tsx.

Two generic (zero customer-specific) improvements:
1. Hero: one-glance contact discoverability. Tenants with no safe website
   now get a tel: "Call <phone>" primary button instead of no primary
   action. Phone is read through the binding verifier and gated to a safe
   tel: href, exactly like the Contact section. Tenants WITH a website see
   no change.
2. AskFYD section copy: "FYD Social" was a naming slip (the feature is
   Ask FYD; the business here is PING Social), and "website statements"
   misdescribed owner-asserted evidence. The new copy is accurate for all
   evidence kinds.
"""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/components/renderer.tsx"

with open(PATH, encoding="utf-8") as f:
    src = f.read()

edits = []

# --- Edit 1a: Hero phone binding -------------------------------------------
old_1a = """function Hero({ objects, presentation, theme, ctx }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  const website = safeWebsite(ctx);
  const heading = presentation.heading ?? boundTitle(ctx, o);
  const copy = presentation.copy ?? boundDescription(ctx, o);
"""
new_1a = """function Hero({ objects, presentation, theme, ctx }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  const website = safeWebsite(ctx);
  const heading = presentation.heading ?? boundTitle(ctx, o);
  const copy = presentation.copy ?? boundDescription(ctx, o);
  // Contact discoverability: a tenant with no website still gets a
  // one-glance primary action. The phone is read through the binding
  // verifier (same as the Contact section) and gated to a safe tel:
  // href; an unverifiable or unsafe number renders no button.
  const phone = boundField(ctx, o, "phone");
  const phoneLink = resolveSafeLink(phone, "call");
"""
edits.append((old_1a, new_1a))

# --- Edit 1b: Hero primary-action fallback ---------------------------------
old_1b = """        <div className="mt-8 flex flex-wrap gap-3">
          {website.kind === "safe" ? (
            <a
              href={website.href}
              className="rounded px-6 py-3 font-semibold"
              style={{
                background: theme.accent,
                color: theme.accentForeground,
                borderRadius: theme.radius === "full" ? 9999 : 8,
              }}
            >
              Visit website
            </a>
          ) : null}
"""
new_1b = """        <div className="mt-8 flex flex-wrap gap-3">
          {website.kind === "safe" ? (
            <a
              href={website.href}
              className="rounded px-6 py-3 font-semibold"
              style={{
                background: theme.accent,
                color: theme.accentForeground,
                borderRadius: theme.radius === "full" ? 9999 : 8,
              }}
            >
              Visit website
            </a>
          ) : phoneLink.kind === "safe" && phone ? (
            <a
              href={phoneLink.href}
              className="rounded px-6 py-3 font-semibold"
              style={{
                background: theme.accent,
                color: theme.accentForeground,
                borderRadius: theme.radius === "full" ? 9999 : 8,
              }}
            >
              Call {phone}
            </a>
          ) : null}
"""
edits.append((old_1b, new_1b))

# --- Edit 2: AskFYD section copy -------------------------------------------
old_2 = '{presentation.copy ?? "Questions go to FYD Social. Answers cite website statements, never verified fact."}'
new_2 = '{presentation.copy ?? "Questions go to Ask FYD. Answers come only from this site\'s published information, with sources shown."}'
edits.append((old_2, new_2))

for i, (old, new) in enumerate(edits):
    count = src.count(old)
    if count != 1:
        print(f"EDIT {i}: expected 1 occurrence, found {count}; ABORTING")
        sys.exit(1)
    src = src.replace(old, new)
    print(f"EDIT {i}: applied")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("OK: renderer.tsx patched")
