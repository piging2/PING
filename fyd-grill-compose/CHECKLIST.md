# COMPOSE lane checklist (2026-09-22)

## Files staged in work/ (edit here, push to Pig at end)
- [ ] work/compose-motion.ts -> src/fyd/components/compose-motion.ts (NEW)
- [ ] work/object-affordance.tsx -> src/fyd/components/object-affordance.tsx (NEW)
- [ ] work/compose.test.ts -> src/fyd/components/__tests__/compose.test.ts (NEW)
- [ ] work/renderer.tsx -> src/fyd/components/renderer.tsx (EDIT, my zones only)
- [ ] work/src_fyd_sitespec_types.ts -> src/fyd/sitespec/types.ts (EDIT: MotionTokens + FYDLayoutCharacter + theme fields)
- [ ] work/src_fyd_components_registry.ts -> src/fyd/components/registry.ts (EDIT: Gallery entry)
- [ ] work/src_fyd_archetypes_profiles.ts -> src/fyd/archetypes/profiles.ts (EDIT: layoutCharacter overrides)
- [ ] work/src_fyd_media_select.ts -> src/fyd/media/select.ts (EDIT: galleryMediaFor)
- [ ] work/src_app_build_[siteId]_page.tsx -> src/app/build/[siteId]/page.tsx (EDIT: thread gallery/object media)
- [ ] work/src_app_build_[siteId]_build-client.tsx -> src/app/build/[siteId]/build-client.tsx (EDIT: thread media + scroll hook)

## Verification
- [ ] jest components suite on Pig
- [ ] tsc --noEmit on Pig
- [ ] perf headless run (LCP/CLS/INP + bundle delta)
- [ ] push.py all files, md5 verified
