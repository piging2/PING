# B9: digest-authority confusion

`b9-digest-confusion.mjs` demonstrates that the tree ships TWO canonicalizers
behind one digest claim:

- `digest.ts` (`sha256-canonical-json-v1`): an object key whose value is
  `undefined` is EMITTED as `"key":null`.
- `dev-signer.canonicalizeJson` (used for owner event ids): undefined-valued
  keys are DROPPED.

Modules: `digest.ts` is a verbatim read-only copy (pure, no imports).
`canonicalizeJson` is a verbatim extract of `dev-signer.ts:46-59` (the full
file drags key machinery; the function is pure).

One logical record (`{"action":"publish","site":"happy-place",
"reason":undefined,"seq":3}`) digests to `29ee1b6b...` under digest.ts and
`4e507a15...` under dev-signer. A control payload without undefined keys
digests identically under both, proving the divergence is exactly the
undefined rule.

Consequence: one logical record carries two valid "canonical" digests, so
digest-keyed identity/dedupe spanning the two formulations splits, and the
"lanes import, never re-implement" one-authority claim in digest.ts is FALSE.

Replay: `node b9-digest-confusion.mjs`
