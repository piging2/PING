/**
 * FYD Builder V1 family (product lane).
 *
 * Public render family: 11 components, every locked variant, rendered
 * from HomePagePlan intent through the theme seam. Public/owner/trust/dev
 * surfaces are separate modules by construction.
 */

export { PublicFamilyPage } from "./family-page";
export { FamilyOwnerEntry, FamilyInspectLink, FamilyLabPanel } from "./surfaces";
export { resolveFamilySection, isFamilyComponent } from "./registry";
export {
  buildFamilyCtx,
  resolveThemeDataTheme,
  objectsForRole,
  mediaForAsset,
  mediaBindingsFor,
  type FamilyRenderInput,
  type FamilyCtx,
  type MediaAssetRef,
  type MediaManifest,
} from "./types";
export {
  visualScaleFor,
  motionFor,
  fallbackVisualScale,
  fallbackMotionFor,
  SCALE_RHYTHM,
  type VisualScale,
  type MotionIntent,
} from "./hierarchy";
export { InView, EmphaticCta, CountUp, type InViewIntent } from "./motion";
export { ResponsiveImage, SectionShell } from "./shared";
export {
  generatedCopy,
  sectionChrome,
  verifierSourceFor,
  renderAtomClassificationFor,
  FAMILY_GENERATED_COPY_REF,
  type GeneratedCopy,
  type RenderBindingKind,
  type SectionChrome,
} from "./bindings";
