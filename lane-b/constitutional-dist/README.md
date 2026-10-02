# constitutional-dist (lane-local test-harness shims)

`knowledge_ingest_adapter.js` requires `./constitutional-dist/*.js` because in
production those paths are the compiled constitutional modules
(`runtime/constitutional/src/*.ts` compiled to `gateway/constitutional-dist`
at Docker build time; see the adapter header: "never reimplemented here").

This sandbox has no gateway build, so these three files are pure re-export
shims onto the lane's sibling reference copies (`../identity-authority.js`,
`../hash-authority.js`, `../ping-vocabulary.js`). They exist only so the
unit tests (`node test_knowledge_ingest_adapter.js`) run without a build.

Rules:
- Do NOT add logic here. The sibling file is the implementation.
- If the real compiled dist becomes available, delete this directory; the
  adapter's require paths then resolve to the real thing unchanged.
