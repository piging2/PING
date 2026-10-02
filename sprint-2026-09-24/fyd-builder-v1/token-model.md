# FYD Builder V1 — Locked Token Model

Status: LOCKED by product-lane spec pass, 2026-09-25. Binding on the implementation sequence steps 2 (token model) and 8 (compile plan) in the rebuild authorization.

Sources this locks: W3C DTCG 2025.10 (stable), Style Dictionary v4, research docs 02/03/04/05, existing `motionTokens.ts` motion semantics, `sitespec/types.ts` token extension points.

Rule of this document: concrete JSON and named values, not vibes. A planner implementer and a renderer implementer must be able to work directly from it.

## 1. Three-tier structure (DTCG 2025.10)

```
PRIMITIVE -> SEMANTIC -> COMPONENT
```

**PRIMITIVE tier.** Brand-neutral foundation, shared across the whole design family. Raw material: color ramps, font stacks, spacing units, durations. Primitives never carry intent. One family may have one primitive set shared by several themes, or per-brand primitive sets; what is fixed is that primitives are never referenced by product code.

**SEMANTIC tier.** Intent-named tokens that alias primitives. Examples: `surface.content`, `surface.raised`, `surface.brand`, `text.primary`, `text.muted`, `text.inverse`, `brand.deep`, `accent.craft`, `accent.craft-text`, `action.primary`, `action.primary-text`, `status.success`, `status.warning`, `status.danger`, `border.subtle`, `border.strong`. Names describe PURPOSE, never appearance. The planner selects semantic intent; the compiler emits implementation.

**COMPONENT tier.** Per-family-component slots that alias semantic tokens. Examples: `hero.headline.text`, `hero.overlay.scrim`, `nav.surface`, `nav.link.text`, `cta.primary.background`, `cta.primary.text`, `trust-bar.surface`, `trust-bar.text`, `footer.surface`, `footer.text`, `footer.link.text`. A component slot exists so one component can be re-pointed at different semantic intent per theme without touching the component.

**Hard rule (binding):** product code references semantic or component tokens only, NEVER primitives. A primitive id appearing in component code, in SiteSpec, or in planner output is a spec violation. The only legal consumers of primitive ids are semantic-tier definitions.

## 2. Seed palettes

### 2.1 Palette A: HPP warm-neutral craftsman

Derived from SOURCE DESIGN SIGNAL (research doc 02, served HTML/CSS of the real HPP site, fetched 2026-09-25). All values below are OBSERVED, not invented. The seed preserves good source design: warm off-white content bands, deep teal-green brand dark, terracotta + amber craft accents, Georgia serif display.

**Provenance note:** these hex values were extracted from served markup by the research pass. If the presentation-observation layer later reports different brand values for HPP, the observation output supersedes this seed and this file is revised.

#### 2.1.1 Primitive layer

```json
{
  "$description": "FYD design family primitives. Brand-neutral foundation.",
  "color": {
    "warm": {
      "010": { "$value": "#F6F4F0", "$type": "color", "$description": "lightest warm neutral" },
      "020": { "$value": "#F3EFE8", "$type": "color" },
      "030": { "$value": "#F1EDE6", "$type": "color" },
      "040": { "$value": "#EFECE5", "$type": "color" },
      "050": { "$value": "#E7E2D8", "$type": "color" },
      "100": { "$value": "#D8D2C4", "$type": "color" },
      "300": { "$value": "#A8A094", "$type": "color" },
      "500": { "$value": "#7A7468", "$type": "color" },
      "700": { "$value": "#4E4A42", "$type": "color" },
      "900": { "$value": "#26241F", "$type": "color" }
    },
    "sage": {
      "500": { "$value": "#7E8278", "$type": "color" },
      "600": { "$value": "#5E6259", "$type": "color", "$description": "HPP primary text, observed 47 occurrences" },
      "700": { "$value": "#4A4E45", "$type": "color" },
      "800": { "$value": "#353832", "$type": "color" }
    },
    "teal": {
      "700": { "$value": "#2E5250", "$type": "color" },
      "800": { "$value": "#254240", "$type": "color", "$description": "HPP brand dark, observed" },
      "900": { "$value": "#1B322F", "$type": "color" },
      "950": { "$value": "#12211F", "$type": "color" }
    },
    "terracotta": {
      "300": { "$value": "#D89E87", "$type": "color" },
      "500": { "$value": "#AC6B53", "$type": "color", "$description": "HPP craft accent, observed" },
      "700": { "$value": "#8A5240", "$type": "color", "$description": "darkened terracotta that passes AA on light" }
    },
    "amber": {
      "200": { "$value": "#F0C070", "$type": "color", "$description": "observed gold family" },
      "300": { "$value": "#E7AD63", "$type": "color", "$description": "observed gold family" },
      "400": { "$value": "#D99A4E", "$type": "color", "$description": "observed gold family" },
      "600": { "$value": "#B07A35", "$type": "color" },
      "700": { "$value": "#8A5A22", "$type": "color", "$description": "darkened amber that passes AA on light (5.36:1)" },
      "800": { "$value": "#6E4A16", "$type": "color" }
    },
    "white": { "$value": "#FFFFFF", "$type": "color" }
  },
  "font": {
    "serif": { "$value": "Georgia, 'Times New Roman', serif", "$type": "fontFamily" },
    "sans": { "$value": "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "base": { "$value": "4", "$type": "dimension", "$description": "4px base unit; all spacing is a multiple" }
  }
}
```

Note: `warm.050`, `warm.100`, `warm.300`, `warm.500`, `warm.700`, `warm.900`, `sage.500`, `sage.700`, `sage.800`, `teal.700/900/950`, `terracotta.300`, `amber.600` are INTERPOLATED filler to make complete ramps around the observed anchors. They exist so the semantic tier has a stable ramp to alias; the observation layer may correct them. The observed anchors (marked above) are the contract.

#### 2.1.2 Semantic layer

Alias values use DTCG reference syntax `{group.token}`. Every alias must resolve; the compiler errors on dangling references.

```json
{
  "surface": {
    "content":  { "$value": "{color.warm.010}", "$type": "color", "$description": "default page/content band (#F6F4F0)" },
    "band":     { "$value": "{color.warm.030}", "$type": "color", "$description": "alternating section band (#F1EDE6)" },
    "raised":   { "$value": "{color.white}",    "$type": "color", "$description": "cards, elevated panels" },
    "sunken":   { "$value": "{color.warm.040}", "$type": "color", "$description": "recessed wells (#EFECE5)" },
    "brand":    { "$value": "{color.teal.800}", "$type": "color", "$description": "deep brand sections (#254240)" },
    "brand-deep":{ "$value": "{color.teal.950}", "$type": "color", "$description": "footer, darkest sections" }
  },
  "text": {
    "primary":  { "$value": "{color.sage.600}", "$type": "color", "$description": "body/headline text on light (5.68:1 on surface.content)" },
    "heading":  { "$value": "{color.teal.800}", "$type": "color", "$description": "display headings on light (9.90:1 on surface.content)" },
    "muted":    { "$value": "{color.sage.700}", "$type": "color", "$description": "secondary text; 7.75:1 on surface.content" },
    "inverse":  { "$value": "{color.warm.010}", "$type": "color", "$description": "text on brand dark (9.90:1 on surface.brand)" },
    "inverse-muted": { "$value": "{color.warm.100}", "$type": "color", "$description": "secondary text on brand dark" }
  },
  "brand": {
    "deep":     { "$value": "{color.teal.800}", "$type": "color" },
    "deep-text":{ "$value": "{color.warm.010}", "$type": "color" }
  },
  "accent": {
    "craft":        { "$value": "{color.terracotta.500}", "$type": "color", "$description": "craft accent; decorative/large-text only on light (3.84:1)" },
    "craft-text":   { "$value": "{color.terracotta.700}", "$type": "color", "$description": "craft accent safe for body text on light (5.69:1)" },
    "gold":         { "$value": "{color.amber.400}", "$type": "color", "$description": "gold; on dark only for text" },
    "gold-bright":  { "$value": "{color.amber.300}", "$type": "color", "$description": "gold text on brand dark (5.46:1)" },
    "gold-text":    { "$value": "{color.amber.700}", "$type": "color", "$description": "gold safe for body text on light (5.36:1)" }
  },
  "action": {
    "primary":      { "$value": "{color.teal.800}", "$type": "color", "$description": "primary buttons = brand dark" },
    "primary-text": { "$value": "{color.warm.010}", "$type": "color", "$description": "9.90:1 on action.primary" },
    "primary-hover":{ "$value": "{color.teal.900}", "$type": "color" },
    "secondary":    { "$value": "{color.terracotta.700}", "$type": "color", "$description": "secondary CTA = deep craft accent; white text on it is 6.25:1" },
    "secondary-text":{ "$value": "{color.white}", "$type": "color", "$description": "6.25:1 on action.secondary" }
  },
  "border": {
    "subtle": { "$value": "{color.warm.050}", "$type": "color" },
    "strong": { "$value": "{color.warm.100}", "$type": "color" },
    "inverse-subtle": { "$value": "{color.teal.700}", "$type": "color", "$description": "hairlines on brand dark" }
  },
  "status": {
    "success": { "$value": "{color.teal.700}", "$type": "color" },
    "warning": { "$value": "{color.amber.700}", "$type": "color" },
    "danger":  { "$value": "#9C3B2E", "$type": "color", "$description": "muted brick red; harmonized with terracotta family" }
  },
  "focus": {
    "ring": { "$value": "{color.amber.400}", "$type": "color", "$description": "focus ring on light; large-text contrast is enough for a 3px ring" },
    "ring-inverse": { "$value": "{color.amber.200}", "$type": "color", "$description": "focus ring on brand dark" }
  }
}
```

Caution flags from the real ratio math (computed 2026-09-25, documented so implementers do not regress):
- `accent.gold` (#D99A4E) on brand dark is 4.49:1: LEGAL FOR LARGE TEXT ONLY (WCAG 3:1 large-text floor). Body text on dark uses `accent.gold-bright` (#E7AD63, 5.46:1) or `#F0C070` (6.46:1).
- `accent.craft` (#AC6B53) on light is 3.84:1: large text / decorative only. Body text on light uses `accent.craft-text` (#8A5240, 5.69:1).
- `accent.gold-text` (#8A5A22) on light is 5.36:1: passes AA normal text.

#### 2.1.3 Component layer (key slots)

```json
{
  "nav": {
    "surface":  { "$value": "{surface.content}", "$type": "color" },
    "link": {
      "text":   { "$value": "{text.primary}", "$type": "color" },
      "active": { "$value": "{text.heading}", "$type": "color" }
    },
    "cta": {
      "background": { "$value": "{action.primary}", "$type": "color" },
      "text":       { "$value": "{action.primary-text}", "$type": "color" }
    }
  },
  "trust-bar": {
    "surface": { "$value": "{surface.brand}", "$type": "color" },
    "text":    { "$value": "{text.inverse}", "$type": "color" },
    "accent":  { "$value": "{accent.gold-bright}", "$type": "color", "$description": "numbers/badges on the trust strip" }
  },
  "hero": {
    "headline":   { "$value": "{text.heading}", "$type": "color" },
    "headline-inverse": { "$value": "{text.inverse}", "$type": "color", "$description": "image-overlay variant" },
    "subhead":    { "$value": "{text.primary}", "$type": "color" },
    "subhead-inverse": { "$value": "{text.inverse-muted}", "$type": "color" },
    "scrim":      { "$value": "{color.teal.950}", "$type": "color", "$description": "overlay scrim base; opacity set by variant, never a new color" },
    "kicker":     { "$value": "{accent.craft-text}", "$type": "color" },
    "kicker-inverse": { "$value": "{accent.gold-bright}", "$type": "color" }
  },
  "cta": {
    "primary": {
      "background": { "$value": "{action.primary}", "$type": "color" },
      "text":       { "$value": "{action.primary-text}", "$type": "color" },
      "hover":      { "$value": "{action.primary-hover}", "$type": "color" }
    },
    "secondary": {
      "background": { "$value": "{action.secondary}", "$type": "color" },
      "text":       { "$value": "{action.secondary-text}", "$type": "color" }
    },
    "ghost": {
      "border": { "$value": "{border.strong}", "$type": "color" },
      "text":   { "$value": "{text.primary}", "$type": "color" }
    }
  },
  "service-card": {
    "surface":  { "$value": "{surface.raised}", "$type": "color" },
    "border":   { "$value": "{border.subtle}", "$type": "color" },
    "title":    { "$value": "{text.heading}", "$type": "color" },
    "body":     { "$value": "{text.primary}", "$type": "color" },
    "hook":     { "$value": "{accent.craft-text}", "$type": "color", "$description": "per-card conversion link" }
  },
  "footer": {
    "surface": { "$value": "{surface.brand-deep}", "$type": "color" },
    "text":    { "$value": "{text.inverse}", "$type": "color" },
    "muted":   { "$value": "{text.inverse-muted}", "$type": "color" },
    "link":    { "$value": "{accent.gold-bright}", "$type": "color" },
    "border":  { "$value": "{border.inverse-subtle}", "$type": "color" }
  },
  "story": {
    "surface":  { "$value": "{surface.band}", "$type": "color", "$description": "BusinessStory trust anchor sits on an alternating band" },
    "quote":    { "$value": "{text.heading}", "$type": "color" }
  }
}
```

### 2.2 Palette B: Coppersmith trade-authority

**Observed vs assumed (binding disclosure).** Research doc 03 extracted information architecture and conversion design from coppersmithplumbing.com, NOT a color system: no hex values were recorded, and the doc explicitly warns not to clone the Elementor visual design. What is OBSERVED:

- Brand identity is the word "Coppersmith" as a craft title, not generic plumber: "You Don't Need A Plumber, You Need A Coppersmith."
- 25+ years servicing Western Colorado; phone-first conversion (970-245-3869); 630 Maldonado Street, Grand Junction CO 81501.
- Product-led funnel with named manufacturer products (American Standard Colony Pro, Moen 7622, Delta Trinsic Pro 1.8, Kohler Purist 1.5).
- Serious-business trust footer (Service Agreement, Financing, Rebates).

What is ASSUMED (provisional, flagged for the presentation-observation layer to fill properly): a copper/amber trade-metal accent family on deep charcoal darks, warm bone light surfaces, a sturdy trade serif display. The observation layer must recover Coppersmith's real brand colors, contrast relationships, and typographic character from the live site before this seed ships as a default. Until then this palette is labeled `status: provisional`.

**Design intent (locked regardless of exact hex):** trade authority, not craftsman warmth. Darker, higher-contrast, metal-and-shadow rather than wood-and-linen. The family relationship to HPP is structural (same tiers, same component slots), not chromatic.

#### 2.2.1 Primitive layer (provisional)

```json
{
  "$description": "Coppersmith seed primitives. STATUS: PROVISIONAL. Recovered intent, not observed values.",
  "$extensions": { "fyd.provenance": "provisional-assumed", "fyd.fill-by": "presentation-observation" },
  "color": {
    "bone": {
      "010": { "$value": "#FAF7F2", "$type": "color" },
      "040": { "$value": "#F1EAE0", "$type": "color" },
      "100": { "$value": "#DCD2C2", "$type": "color" },
      "500": { "$value": "#6E6156", "$type": "color" },
      "700": { "$value": "#4A4038", "$type": "color", "$description": "body text on light (9.44:1)" },
      "900": { "$value": "#241E18", "$type": "color" }
    },
    "char": {
      "800": { "$value": "#2A221B", "$type": "color" },
      "900": { "$value": "#1B1410", "$type": "color", "$description": "brand dark" },
      "950": { "$value": "#100C08", "$type": "color", "$description": "footer, deepest sections" }
    },
    "copper": {
      "300": { "$value": "#E8A85C", "$type": "color", "$description": "bright copper for text on dark (8.83:1)" },
      "500": { "$value": "#B87333", "$type": "color", "$description": "classic copper; on dark only for text (4.91:1)" },
      "700": { "$value": "#8F5626", "$type": "color", "$description": "copper safe for body text on light (5.57:1)" }
    },
    "steel": {
      "500": { "$value": "#8A7F72", "$type": "color" },
      "700": { "$value": "#5C5348", "$type": "color" }
    },
    "white": { "$value": "#FFFFFF", "$type": "color" }
  },
  "font": {
    "serif": { "$value": "Georgia, 'Times New Roman', serif", "$type": "fontFamily", "$description": "PROVISIONAL: sturdy trade serif; observation may substitute a slab/condensed stack" },
    "sans": { "$value": "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "base": { "$value": "4", "$type": "dimension" }
  }
}
```

#### 2.2.2 Semantic layer (provisional)

```json
{
  "surface": {
    "content":   { "$value": "{color.bone.010}", "$type": "color" },
    "band":      { "$value": "{color.bone.040}", "$type": "color" },
    "raised":    { "$value": "{color.white}", "$type": "color" },
    "sunken":    { "$value": "{color.bone.100}", "$type": "color" },
    "brand":     { "$value": "{color.char.900}", "$type": "color" },
    "brand-deep":{ "$value": "{color.char.950}", "$type": "color" }
  },
  "text": {
    "primary":  { "$value": "{color.bone.700}", "$type": "color", "$description": "9.44:1 on surface.content" },
    "heading":  { "$value": "{color.char.900}", "$type": "color", "$description": "17.03:1 on surface.content" },
    "muted":    { "$value": "{color.steel.700}", "$type": "color", "$description": "supplemental only; verify ratio when observed palette lands" },
    "inverse":  { "$value": "{color.bone.010}", "$type": "color", "$description": "15.92:1 on surface.brand" },
    "inverse-muted": { "$value": "{color.bone.100}", "$type": "color" }
  },
  "brand": {
    "deep":      { "$value": "{color.char.900}", "$type": "color" },
    "deep-text": { "$value": "{color.bone.010}", "$type": "color" }
  },
  "accent": {
    "craft":       { "$value": "{color.copper.500}", "$type": "color", "$description": "copper; decorative/large-text on dark (4.91:1), NEVER body text on light" },
    "craft-bright":{ "$value": "{color.copper.300}", "$type": "color", "$description": "copper text on dark (8.83:1)" },
    "craft-text":  { "$value": "{color.copper.700}", "$type": "color", "$description": "copper safe for body text on light (5.57:1)" }
  },
  "action": {
    "primary":       { "$value": "{color.copper.500}", "$type": "color", "$description": "Coppersmith converts by PHONE: primary action is high-visibility copper" },
    "primary-text":  { "$value": "{color.char.950}", "$type": "color", "$description": "dark text on copper; verify ratio when palette lands" },
    "primary-hover": { "$value": "{color.copper.300}", "$type": "color" },
    "secondary":     { "$value": "{color.char.900}", "$type": "color" },
    "secondary-text":{ "$value": "{color.bone.010}", "$type": "color" }
  },
  "border": {
    "subtle": { "$value": "{color.bone.100}", "$type": "color" },
    "strong": { "$value": "{color.steel.500}", "$type": "color" },
    "inverse-subtle": { "$value": "{color.char.800}", "$type": "color" }
  },
  "status": {
    "success": { "$value": "#3E7C4F", "$type": "color" },
    "warning": { "$value": "{color.copper.700}", "$type": "color" },
    "danger":  { "$value": "#A83A2C", "$type": "color" }
  },
  "focus": {
    "ring": { "$value": "{color.copper.700}", "$type": "color" },
    "ring-inverse": { "$value": "{color.copper.300}", "$type": "color" }
  }
}
```

Ratio verification on the provisional numbers (computed 2026-09-25):
- `text.primary` #4A4038 on `surface.content` #FAF7F2 = 9.44:1. Passes AAA.
- `text.heading` #1B1410 on `surface.content` = 17.03:1.
- `text.inverse` #FAF7F2 on `surface.brand` #1B1410 = 15.92:1.
- `accent.craft` #B87333 on brand dark = 4.91:1: passes AA normal text, legal for copper accents/numbers on dark.
- `accent.craft-text` #8F5626 on light = 5.57:1: passes AA.
- `action.primary-text` #100C08 on copper #B87333: UNVERIFIED in this pass. The compiler gate (section 8) must verify this pair before the theme ships; if it fails, darken copper or lighten text. This is recorded as an open verification, not a claim.

#### 2.2.3 Component layer (key slots; same slot names as HPP, different intent)

```json
{
  "nav": {
    "surface": { "$value": "{surface.brand}", "$type": "color", "$description": "Coppersmith nav runs dark; the phone IS the nav CTA" },
    "link": {
      "text":   { "$value": "{text.inverse-muted}", "$type": "color" },
      "active": { "$value": "{text.inverse}", "$type": "color" }
    },
    "cta": {
      "background": { "$value": "{action.primary}", "$type": "color" },
      "text":       { "$value": "{action.primary-text}", "$type": "color" }
    }
  },
  "trust-bar": {
    "surface": { "$value": "{surface.brand-deep}", "$type": "color" },
    "text":    { "$value": "{text.inverse}", "$type": "color" },
    "accent":  { "$value": "{accent.craft-bright}", "$type": "color", "$description": "25+ years, license, counties in bright copper" }
  },
  "hero": {
    "headline":   { "$value": "{text.heading}", "$type": "color" },
    "headline-inverse": { "$value": "{text.inverse}", "$type": "color" },
    "subhead":    { "$value": "{text.primary}", "$type": "color" },
    "subhead-inverse": { "$value": "{text.inverse-muted}", "$type": "color" },
    "scrim":      { "$value": "{color.char.950}", "$type": "color" },
    "kicker":     { "$value": "{accent.craft-text}", "$type": "color" },
    "kicker-inverse": { "$value": "{accent.craft-bright}", "$type": "color" },
    "phone-cta":  { "$value": "{accent.craft-bright}", "$type": "color", "$description": "the phone number is the hero conversion; it gets the brightest slot" }
  },
  "cta": {
    "primary": {
      "background": { "$value": "{action.primary}", "$type": "color" },
      "text":       { "$value": "{action.primary-text}", "$type": "color" },
      "hover":      { "$value": "{action.primary-hover}", "$type": "color" }
    },
    "secondary": {
      "background": { "$value": "{action.secondary}", "$type": "color" },
      "text":       { "$value": "{action.secondary-text}", "$type": "color" }
    },
    "ghost": {
      "border": { "$value": "{border.strong}", "$type": "color" },
      "text":   { "$value": "{text.primary}", "$type": "color" }
    }
  },
  "service-card": {
    "surface":  { "$value": "{surface.raised}", "$type": "color" },
    "border":   { "$value": "{border.subtle}", "$type": "color" },
    "title":    { "$value": "{text.heading}", "$type": "color" },
    "body":     { "$value": "{text.primary}", "$type": "color" },
    "hook":     { "$value": "{accent.craft-text}", "$type": "color" }
  },
  "footer": {
    "surface": { "$value": "{surface.brand-deep}", "$type": "color" },
    "text":    { "$value": "{text.inverse}", "$type": "color" },
    "muted":   { "$value": "{text.inverse-muted}", "$type": "color" },
    "link":    { "$value": "{accent.craft-bright}", "$type": "color" },
    "border":  { "$value": "{border.inverse-subtle}", "$type": "color" }
  }
}
```

**Theme relationship (locked):** HPP and Coppersmith share the slot taxonomy (every component slot name in 2.1.3 exists in 2.2.3) but bind different semantic intent: HPP nav is light, Coppersmith nav is dark; HPP primary CTA is brand-deep teal, Coppersmith primary CTA is copper; HPP accents are warm craft, Coppersmith accents are trade metal. Same family, different character. A theme is a complete semantic+component binding, never a partial override of another theme.

## 3. Typography

Family rule (from research doc 05): serif display for emotion, clean sans for utility. Two-level hierarchy, locked per theme.

### 3.1 Stacks

```json
{
  "font": {
    "display": {
      "hpp":  { "$value": "{font.serif}", "$type": "fontFamily", "$description": "Georgia serif, observed on HPP" },
      "coppersmith": { "$value": "{font.serif}", "$type": "fontFamily", "$description": "PROVISIONAL pending observation" }
    },
    "body": {
      "hpp":  { "$value": "{font.sans}", "$type": "fontFamily" },
      "coppersmith": { "$value": "{font.sans}", "$type": "fontFamily" }
    }
  }
}
```

### 3.2 Scale (shared; sizes in px, line heights unitless, letter spacing in em)

Base body 17px (home-service audiences skew older; 16px is the floor, never the target). The modular ratio is 1.25 with editorial overrides at hero.

```json
{
  "type": {
    "hero":    { "$value": "clamp(44, 6vw + 16, 72)", "$type": "dimension", "$description": "px, fluid; display font; line-height 1.05; letter-spacing -0.01em" },
    "h1":      { "$value": "40", "$type": "dimension", "$description": "display; line-height 1.1; letter-spacing -0.005em" },
    "h2":      { "$value": "32", "$type": "dimension", "$description": "display; line-height 1.15" },
    "h3":      { "$value": "24", "$type": "dimension", "$description": "display; line-height 1.25" },
    "body":    { "$value": "17", "$type": "dimension", "$description": "sans; line-height 1.6; measure 65ch" },
    "lead":    { "$value": "20", "$type": "dimension", "$description": "sans; line-height 1.55; hero subheads, section intros" },
    "small":   { "$value": "14", "$type": "dimension", "$description": "sans; line-height 1.5; metadata, captions detail" },
    "caption": { "$value": "12", "$type": "dimension", "$description": "sans; line-height 1.4; uppercase + 0.08em tracking for kickers/labels; NEVER body copy" },
    "measure": { "$value": "65ch", "$type": "dimension", "$description": "max line length for prose" }
  }
}
```

Rules:
- Display font is reserved for headlines, pull quotes, and the business wordmark. Body copy, buttons, nav links, form labels are sans. A button in Georgia is a violation.
- Kicker/eyebrow labels are the ONLY uppercase application, always paired with tracking and the caption size.
- **Never the legal business name as H1 by default.** The H1 is the editorial headline (identity/promise, e.g. HPP's "Your favorite part of coming home should be the home itself."). The business name lives in the nav wordmark, the footer, and schema markup. The planner emits a headline from object evidence; the legal name as H1 requires explicit owner intent.
- `caption` at 12px is for labels only. Any 12px body copy fails the readability gate.

## 4. Spacing and width

4px base. Every spacing token is an integer multiple of the base. No 3px, no 7px, no 13px.

```json
{
  "space": {
    "0":  { "$value": "0", "$type": "spacing" },
    "1":  { "$value": "4", "$type": "spacing" },
    "2":  { "$value": "8", "$type": "spacing" },
    "3":  { "$value": "12", "$type": "spacing" },
    "4":  { "$value": "16", "$type": "spacing" },
    "5":  { "$value": "20", "$type": "spacing" },
    "6":  { "$value": "24", "$type": "spacing" },
    "8":  { "$value": "32", "$type": "spacing" },
    "10": { "$value": "40", "$type": "spacing" },
    "12": { "$value": "48", "$type": "spacing" },
    "16": { "$value": "64", "$type": "spacing" },
    "20": { "$value": "80", "$type": "spacing" },
    "24": { "$value": "96", "$type": "spacing" },
    "32": { "$value": "128", "$type": "spacing" }
  },
  "width": {
    "narrow":  { "$value": "560", "$type": "dimension", "$description": "prose columns, forms, contact blocks" },
    "content": { "$value": "768", "$type": "dimension", "$description": "default content column" },
    "wide":    { "$value": "1024", "$type": "dimension", "$description": "grids, galleries" },
    "page":    { "$value": "1200", "$type": "dimension", "$description": "max page container" }
  },
  "section": {
    "tight":   { "$value": "32", "$type": "spacing", "$description": "stacked sub-blocks inside a section" },
    "section": { "$value": "96", "$type": "spacing", "$description": "default vertical rhythm between sections (desktop); 64 on mobile" },
    "feature": { "$value": "144", "$type": "spacing", "$description": "major beats: hero-to-content, story blocks" },
    "hero":    { "$value": "160", "$type": "spacing", "$description": "hero internal padding, desktop; 96 on mobile" }
  },
  "radius": {
    "sm":   { "$value": "4", "$type": "borderRadius" },
    "md":   { "$value": "8", "$type": "borderRadius", "$description": "default card radius, both themes" },
    "lg":   { "$value": "16", "$type": "borderRadius", "$description": "feature media, large panels" },
    "pill": { "$value": "999", "$type": "borderRadius", "$description": "buttons, badges, chips" }
  },
  "shadow": {
    "sm": { "$value": "0 1px 2px rgb(0 0 0 / 0.06)", "$type": "shadow" },
    "md": { "$value": "0 4px 12px rgb(0 0 0 / 0.08)", "$type": "shadow", "$description": "default card lift" },
    "lg": { "$value": "0 12px 32px rgb(0 0 0 / 0.12)", "$type": "shadow", "$description": "hero media, overlays; sparing" }
  }
}
```

The desktop/mobile section-rhythm reduction (96 -> 64, 160 -> 96) is the renderer's responsive contract, not a second token. One token, one responsive rule.

## 5. Media

### 5.1 Aspect tokens

```json
{
  "media": {
    "aspect": {
      "square":    { "$value": "1 / 1", "$type": "dimension", "$description": "owner portraits, team, profile images" },
      "landscape": { "$value": "4 / 3", "$type": "dimension", "$description": "project cards, service imagery" },
      "portrait":  { "$value": "3 / 4", "$type": "dimension", "$description": "tall trade work, before/after" },
      "wide":      { "$value": "16 / 9", "$type": "dimension", "$description": "feature media, video" },
      "banner":    { "$value": "21 / 9", "$type": "dimension", "$description": "hero image-overlay backgrounds" }
    },
    "treatment": {
      "$value": "documentary",
      "$type": "other",
      "$description": "ENUM documentary | polished | schematic. documentary: real photos of real work, no heavy filters, natural color, no stock gloss. The media-quality gate rejects irrelevant hero media."
    }
  }
}
```

### 5.2 Documentary-treatment intent (locked)

- Images are proof, not decoration. Hero media must depict the trade, the work, or the people.
- No duotone washes, no heavy gradient tints that falsify the work. The hero scrim exists for text legibility and uses the theme's scrim slot (`hero.scrim`) at variant-defined opacity; it never introduces a hue that is not in the theme.
- A hero candidate that fails the relevance gate (wrong trade, stock-looking, conduit on a carpentry site) is REJECTED and the planner falls back to the editorial/minimal hero variant. This is a planner rule, not a token, but the token model records it because the aspect/treatment tokens only apply to media that passed the gate.

## 6. Motion

Keep the existing semantics from `motionTokens.ts` (harvest item 4: ADAPT, keep semantics, re-point at the new family). The canonical union stays `motionIntensity: NONE | SUBTLE | EXPRESSIVE` as defined in `sitespec/types.ts` `MotionTokens`.

Locked motion token values (ported from the existing tables, ms):

```json
{
  "motion": {
    "intensity": {
      "$value": "SUBTLE",
      "$type": "other",
      "$description": "ENUM NONE | SUBTLE | EXPRESSIVE. Default SUBTLE: quiet, quick, no theater."
    },
    "duration": {
      "instant": { "$value": "100", "$type": "duration" },
      "fast":    { "$value": "200", "$type": "duration" },
      "normal":  { "$value": "300", "$type": "duration" },
      "slow":    { "$value": "500", "$type": "duration" },
      "hero":    { "$value": "800", "$type": "duration", "$description": "hero entrance only" }
    },
    "easing": {
      "standard": { "$value": "cubic-bezier(0.22, 1, 0.36, 1)", "$type": "cubicBezier", "$description": "the premium ease from motionTokens.ts" },
      "exit":     { "$value": "cubic-bezier(0, 0, 0.58, 1)", "$type": "cubicBezier" }
    },
    "entrance": {
      "$value": "FADE_RISE",
      "$type": "other",
      "$description": "ENUM FADE_RISE | REVEAL | SCALE, from MotionTokens"
    },
    "stagger": {
      "$value": "TIGHT",
      "$type": "other",
      "$description": "ENUM NONE | TIGHT | RELAXED; TIGHT = 50ms child offset"
    }
  }
}
```

Rules:
- **Quiet by default.** SUBTLE is the family default intensity. EXPRESSIVE is reserved for hero/celebration moments and must be chosen deliberately, never by default.
- **Reduced motion collapses everything.** `prefers-reduced-motion: reduce` or an explicit reduced-motion signal forces effective intensity NONE: durations collapse to ~0, springs to null, decorative motion off, parallax off. This is the existing `effectiveIntensity` / `reducedMotion` behavior in `motionTokens.ts`; the token model restates it as law. Nothing on the page may depend on animation to be usable.
- NONE is the fail-closed value: unknown intensity strings resolve to NONE, never to a guess.
- Hero theater is banned: no full-viewport animated hero sequences, no auto-playing motion that competes with the headline.

## 7. Accessibility (WCAG 2.2 AA)

### 7.1 Contrast pairs, HPP theme (measured 2026-09-25)

Light content sections (surface.content #F6F4F0 unless noted):
- `text.primary` #5E6259 on `surface.content` = **5.68:1**. Passes AA normal text. Primary pair.
- `text.primary` on `surface.band` #F1EDE6 = **5.34:1**. Passes.
- `text.heading` #254240 on `surface.content` = **9.90:1**. Passes AAA.
- `text.muted` #4A4E45 on `surface.content` = **7.75:1**. Passes AA.
- `accent.craft-text` #8A5240 on `surface.content` = **5.69:1**. Passes.
- `accent.gold-text` #8A5A22 on `surface.content` = **5.36:1**. Passes.
- `accent.craft` #AC6B53 on `surface.content` = 3.84:1. FAILS AA normal text: restricted to large text (3:1 floor passes) and decorative use.
- `accent.gold` #D99A4E on `surface.content` = 2.20:1. FAILS: decorative only on light.

Dark brand sections (surface.brand #254240):
- `text.inverse` #F6F4F0 on `surface.brand` = **9.90:1**. Passes AAA. Primary dark pair.
- `#FFFFFF` on `surface.brand` = **10.87:1**. Passes AAA.
- `accent.gold-bright` #E7AD63 on `surface.brand` = **5.46:1**. Passes AA. Body-safe gold on dark.
- `accent.gold-bright` variant #F0C070 on `surface.brand` = **6.46:1**. Passes.
- `accent.gold` #D99A4E on `surface.brand` = 4.49:1. FAILS AA normal text by 0.01: restricted to large text and decorative use on dark. This is why the semantic tier splits `accent.gold` from `accent.gold-bright`.

Action pairs:
- `action.primary-text` #F6F4F0 on `action.primary` #254240 = **9.90:1**. Passes AAA.
- `action.secondary-text` #FFFFFF on `action.secondary` #8A5240 = **6.25:1**. Passes AA. Note: white on the mid terracotta #AC6B53 measured only 4.22:1, which is why the secondary action uses the deep variant.

### 7.2 Contrast pairs, Coppersmith theme (measured 2026-09-25; provisional palette)

Light content sections (surface.content #FAF7F2):
- `text.primary` #4A4038 on `surface.content` = **9.44:1**. Passes AAA.
- `text.heading` #1B1410 on `surface.content` = **17.03:1**. Passes AAA.
- `accent.craft-text` #8F5626 on `surface.content` = **5.57:1**. Passes AA.
- `accent.craft` #B87333 on light: UNMEASURED, presumed failing: barred from body text on light until verified.

Dark brand sections (surface.brand #1B1410):
- `text.inverse` #FAF7F2 on `surface.brand` = **15.92:1**. Passes AAA.
- `accent.craft` #B87333 on `surface.brand` = **4.91:1**. Passes AA normal text.
- `accent.craft-bright` #E8A85C on `surface.brand` = **8.83:1**. Passes AAA.
- `action.primary-text` #100C08 on copper #B87333: UNVERIFIED. Open verification recorded in 2.2.2; the compile gate must check it before ship.

### 7.3 Focus-visible treatment (locked)

```json
{
  "focus": {
    "width":  { "$value": "3", "$type": "dimension", "$description": "3px outline" },
    "offset": { "$value": "2", "$type": "dimension", "$description": "2px outline offset" },
    "style":  { "$value": "solid", "$type": "other" },
    "color":  { "$value": "{focus.ring}", "$type": "color", "$description": "theme semantic: amber on light, gold on dark (HPP); copper on light, bright copper on dark (Coppersmith)" }
  }
}
```

Rules: every interactive element shows the focus ring on `:focus-visible`. The ring color token switches with the section theme (light section vs dark section), not with the page theme. Focus must never be removed without a replacement (`outline: none` without a token ring is a violation).

### 7.4 Target size (locked)

```json
{
  "target": {
    "min": { "$value": "44", "$type": "dimension", "$description": "44px minimum touch target, WCAG 2.2 AA 2.5.8" },
    "min-spacing": { "$value": "8", "$type": "spacing", "$description": "minimum clear space guidance between adjacent small targets" }
  }
}
```

Rules: nav links, CTA buttons, card tap areas, phone links, and the AskFYD entry all meet 44px minimum in both dimensions. Inline text links inside prose are exempt from the 44px box but keep the underline affordance and focus ring. The existing ObjectCircle 44px pattern (harvest item 3) is the reference implementation.

### 7.5 Serious accessibility regression = hard disqualification gate

Per the authorization: a serious accessibility regression is a HARD gate (FYD loses that build, no weighted rescue). The compile gate in section 8 must run the contrast-pair checks as part of every build; a failing pair blocks the theme from shipping.

## 8. Style Dictionary v4 compile plan

**Version pins (locked):** DTCG format 2025.10 (stable). Style Dictionary v4 (pin the exact minor in `package.json`, e.g. `style-dictionary@4.x`; record the resolved version in the package lockfile and in the compiled output header). Tailwind CSS v4 as render target. No other token compiler is authorized.

### 8.1 File layout

```
fyd-product-lane/
  builder/
    tokens/
      tokens/
        primitives.common.tokens.json      # shared foundation (space base, shared ramps)
        primitives.hpp.tokens.json         # HPP primitive set (2.1.1)
        primitives.coppersmith.tokens.json # Coppersmith primitive set, provisional (2.2.1)
        semantic.hpp.tokens.json           # HPP semantic tier (2.1.2)
        semantic.coppersmith.tokens.json   # Coppersmith semantic tier (2.2.2)
        component.hpp.tokens.json          # HPP component tier (2.1.3)
        component.coppersmith.tokens.json   # Coppersmith component tier (2.2.3)
        type.tokens.json                   # typography (3), shared
        space.tokens.json                  # spacing/width/radius/shadow (4), shared
        media.tokens.json                  # aspect/treatment (5), shared
        motion.tokens.json                 # motion (6), shared
      config/
        style-dictionary.config.mjs        # one config, per-theme platforms
      formats/
        fyd-css-variables.mjs              # custom format: DTCG -> :root vars
        fyd-tailwind-theme.mjs             # custom format: DTCG -> Tailwind v4 @theme
        fyd-ts-tokens.mjs                  # custom format: typed TS token map
      out/
        hpp.tokens.css                     # compiled CSS custom properties
        hpp.tailwind-theme.css             # compiled @theme block
        hpp.tokens.ts                      # typed TS (for non-CSS consumers/tests)
        coppersmith.tokens.css
        coppersmith.tailwind-theme.css
        coppersmith.tokens.ts
        build-manifest.json                # input hashes, versions, timestamp
```

Input shape: DTCG 2025.10 JSON, one concern per file, `$value` / `$type` / `$description` on every token, aliases as `"{group.token}"` strings. Every file carries a top-level `$description` and provisional files carry `$extensions.fyd.provenance`.

### 8.2 Pipeline steps (exact, in order)

1. **Validate.** A pre-build step checks: every alias resolves within its theme's file set; every token has `$value` and `$type`; no primitive id is referenced outside semantic-tier files (grep the component-tier and SiteSpec-adjacent sources); provisional files are flagged in the manifest. Failure stops the build.
2. **Contrast gate.** The build resolves the section 7 pairs against the compiled values and asserts AA. Any failing pair fails the build with the pair named. This is the executable form of the hard disqualification gate.
3. **Style Dictionary build.** `style-dictionary build --config config/style-dictionary.config.mjs`. One SD platform per theme per output kind (css-variables, tailwind-theme, ts). SD v4 natively understands DTCG `$value`/`$type`; transforms needed: `name/kebab` with an `fyd` prefix namespace, `color/hex`, `dimension/px`, plus the three custom formats in `formats/`.
4. **Emit CSS custom properties.** `:root[data-theme="hpp"] { --fyd-color-text-primary: #5e6259; ... }`. Variable names are `--fyd-{tier}-{path-kebab}` derived deterministically from token paths. One selector per theme; the renderer switches themes by setting `data-theme` on `<html>`. No theme classes, no body-class switching.
5. **Emit Tailwind v4 @theme.** The `fyd-tailwind-theme.mjs` format emits:
   ```css
   @theme inline {
     --color-text-primary: var(--fyd-color-text-primary);
     --color-surface-brand: var(--fyd-color-surface-brand);
     --font-display: var(--fyd-font-display-hpp);
     ...
   }
   ```
   `@theme` is a RENDER TARGET: it re-exports the compiled custom properties as Tailwind utilities (`bg-surface-brand`, `text-text-primary`, `font-display`). Tailwind never originates a token value. If Tailwind is absent from a renderer, the plain CSS variables in step 4 still work.
6. **Emit typed TS.** `hpp.tokens.ts` exports a frozen object mirroring token paths with literal types, for tests and non-DOM consumers (contrast gate, planner previews). Generated file header says DO NOT EDIT.
7. **Write build-manifest.json.** Records: DTCG version, style-dictionary resolved version, SHA-256 of every input file, output file hashes, build timestamp, provisional flags. The manifest is the determinism receipt.

### 8.3 Where the compiler lives and how the renderer consumes it

- The compiler lives in `fyd-product-lane/builder/tokens/` (product lane). It is build-time only; it never runs in the browser.
- The renderer consumes the COMPILED OUTPUT ONLY: it imports `out/<theme>.tokens.css` (or the bundled equivalent) and uses either the CSS variables directly (`color: var(--fyd-color-text-primary)`) or the Tailwind utilities the `@theme` block enables. The renderer never reads the DTCG JSON, never resolves aliases, never invents values.
- The planner consumes the SEMANTIC tier by name (via the typed TS or a token-name allowlist): it selects `surface.brand`, `action.primary`, never a hex value.

### 8.4 Determinism requirement

Same token inputs -> byte-identical CSS/TS outputs. The build is deterministic: no timestamps inside emitted files (timestamps live only in `build-manifest.json`), no random ordering (token order follows file order), no environment-dependent values. Verification: rebuild and diff against the committed outputs; any byte difference without an input change is a build bug. CI runs the rebuild-and-diff check.

### 8.5 SiteSpec theme reference (additive extension point)

SiteSpec references the theme BY NAME ONLY, as an additive extension to the existing `FYDThemeTokens` (which stays valid; old specs render unchanged):

```json
{
  "designTokens": {
    "theme": "fyd/hpp-warm-craftsman@1",
    "tier": "semantic",
    "overrides": {
      "accent.craft": "{color.terracotta.700}"
    }
  }
}
```

Rules: `theme` is a registry id with a version. `overrides` may only name semantic or component tier tokens and may only assign other token references or theme-registered values, never raw hex, never class strings, never CSS. An override that names a primitive id is rejected by validation.

## 9. Anti-patterns (banned)

1. **Generating a palette from one sampled pixel.** Banned by Correction 1. Presentation observation recovers design CONSTRAINTS (brand colors, contrast relationships, typographic character, image treatment, density, radius tendency, spacing rhythm, CTA emphasis), never a single sampled color promoted to a palette. A seed derived from one eyedropper read is rejected at the validation step.
2. **Tailwind class strings in SiteSpec.** Banned by the authorization (SiteSpec: intent only). No `className`, no utility strings, no `bg-[#254240]` escapes. SiteSpec references the theme by name (8.5); the renderer owns implementation.
3. **Raw CSS or raw hex in SiteSpec.** Same ban. Color values live in the token files; SiteSpec carries intent.
4. **Primitive references in product code.** The hard rule from section 1: components, planner output, and SiteSpec reference semantic/component tokens only. A primitive id outside a semantic-tier definition is a violation.
5. **Appearance-named tokens.** No `light-brown`, `dark-green-2`, `big-padding`. Names are intent (`surface.band`, `text.muted`, `space.6`). If the value changes, the name still makes sense.
6. **Theme-as-partial-override.** A theme is a complete binding (all tiers). No theme inherits another theme's hex values by reference across brands; the slot taxonomy is shared, the values are not.
7. **Strong defaults from thin air.** The Coppersmith palette is provisional and labeled as such (2.2). Nothing in this file presents an assumed palette as observed. When the observation layer lands real Coppersmith signal, this section is revised with provenance, not silently overwritten.
8. **Motion that the content depends on.** Any animation required for comprehension or conversion is a violation of section 6. Reduced motion must leave a fully working page.
9. **Caption-size body copy.** 12px is labels only (3.2). Body copy below 16px is a violation.

## 10. Open verifications (not claims)

1. Coppersmith `action.primary-text` #100C08 on copper #B87333: ratio unverified; the compile contrast gate (8.2 step 2) must check it before the theme ships.
2. Coppersmith `text.muted` #5C5348 on light: ratio unverified; same gate.
3. Coppersmith primitive values are provisional: the presentation-observation layer must recover real brand signal from coppersmithplumbing.com and revise section 2.2 with provenance.
4. RESOLVED during spec writing (2026-09-25): `action.secondary-text` white on mid terracotta #AC6B53 measured 4.22:1 (fails AA normal text), so the HPP semantic tier binds `action.secondary` to the deep terracotta #8A5240 (white on it = 6.25:1). Mid terracotta stays decorative/large-text only.

## 11. Traceability

- DTCG 2025.10 three-tier model: authorization Correction 1; harvest item 7.
- Style Dictionary v4 compile: harvest item 7.
- Tailwind v4 @theme as render target only: authorization Correction 1; harvest item 8.
- Motion semantics NONE/SUBTLE/EXPRESSIVE, reduced-motion collapse: `motionTokens.ts`, `sitespec/types.ts` `MotionTokens`, harvest item 4.
- Additive extension to existing types: `sitespec/types.ts` documents that token fields extend additively; section 8.5 follows that law.
- HPP design signal: research doc 02 (served HTML/CSS, 2026-09-25).
- Coppersmith IA/conversion signal: research doc 03 (with the observed-vs-assumed split recorded in 2.2).
- Component slot names: research doc 05 (11-component family).
- Contrast ratios: computed 2026-09-25 from the locked hex values, recorded in section 7.
