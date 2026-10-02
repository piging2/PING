# vendor-pinned/ PROVENANCE

Byte-exact read-only copies of production PING contract modules, pinned so the
gauntlet harness (which runs in a different VM from the Pig) exercises the REAL
modules rather than reimplementations.

**Source worktree (Pig):** `/home/nolan/worktrees/orca-autonomy`
**Pinned at:** 2026-09-23 ~19:20 MDT
**Method:** base64 copy via pigwsl-run.sh (read-only; repo untouched)

| File | sha256 |
|---|---|
| ping-runtime/external-agent/external_agent_adapter.js | b32ad888aa8e5404a1ec0ae54361c0379d301d3f840f4e4d1cea78625e410c9f |
| ping-runtime/canonicalization/canonicalization_service.js | d8be9cd81f45e4ef4f65db16b5f2b2888e3c826837bc81d083feb2ca2dce9b57 |
| ping-runtime/canonicalization/canonical_object.js | 3aefda5772f10939cd3aee970f31c2f851c69a7f9fe4ad29da6b86002a915615 |
| orca/control-loop/policy/orca_policy.js | 5a42d8fb51356d840eba25504b17adaa162a6d07b89e7d333921ed3cc4991101 |
| orca/control-loop/policy/orca_status_model.js | edb4b609748e0f1247aa31b94e730bc4d6cc2ede8bb7dace792a17e5c7103e94 |
| orca/control-loop/policy/recovery_decisions.js | eedcdb20067235139f648488286ca2c4a8f44d72fa3824c8418a6f979362a009 |

### Transitive-closure completion (2026-09-24 ~01:45 UTC, swarm-20)

The 2026-09-23 pin set was incomplete: `canonical_object.js` requires
`../authorities/canonical_authority.js` (plus identity and constitutional-time
authorities), and those require the kernel authorities. The harness could not
load until the closure was pinned. All files below are from the SAME source
worktree (`/home/nolan/worktrees/orca-autonomy`), same base64 read-only copy
method, preserving the original relative layout so requires resolve.

| File | sha256 |
|---|---|
| ping-runtime/authorities/canonical_authority.js | 291ddad17fa2e8cbdf103f916c70372dce850281ed886a37462e9dd676325ee0 |
| ping-runtime/authorities/identity_authority.js | c05060d00d710b5261c2aa69bdf8968f778c535b2e643e00ffa6cf98d601110f |
| ping-runtime/authorities/constitutional_time_authority.js | 778790a734d78414e66e220da1d647d02a323fb374446121d2900aa9a95fdfbf |
| runtime/kernel/authorities/canonical_authority.js | 7e9751585d1b618c253c36be9352041b8b8786b336eebfc1f114a9bcdac536a8 |
| runtime/kernel/authorities/identity_authority.js | bd09057a4d47744499bff72333e255c9bbe2d57ba4a6b45edca6a76729b484a5 |
| runtime/kernel/authorities/constitutional_time_authority.js | 2c69f8845f46364d28631238f6757e3a5c2035507528c888a3da3503106c48ad |
| runtime/kernel/authorities/constitutional_clock.js | c00705e0f483fb93ea5b696af9f56f712a2a533f98d294591f76a7fa9a0f6db8 |
| infrastructure/physical_clock_adapter.js | ffac4bc70371fc1bd5af2a022df5f281809acc8067083f0873ea2ae0055f0829 |

Dependency edges pinned by this completion (all `require` targets inside the
vendor tree; `crypto`/`os` are node builtins):
- canonical_object.js -> ping-runtime/authorities/{canonical_authority, identity_authority, constitutional_time_authority}.js
- ping-runtime/authorities/*.js -> runtime/kernel/authorities/{canonical_authority, identity_authority, constitutional_time_authority}.js
- kernel identity_authority -> ./canonical_authority + lazy ./constitutional_time_authority
- kernel constitutional_time_authority -> ./constitutional_clock -> ../../../infrastructure/physical_clock_adapter

Correction note: the recovery_decisions.js hash recorded on 2026-09-23 was a
63-char transcription typo (missing leading `e`); corrected 2026-09-24 after
the file itself verified byte-identical. The typo was in the record, not the pin.

**Why pinned copies instead of a live require:** the harness must run without
touching the live worktree (ONE-WRITER RULE; read-only vs the repo). These
copies are test-harness pinning, NOT a competing implementation: the source
of truth remains the worktree modules. If the worktree modules change, the
pin is stale by design — re-pin and re-run; do not hand-edit these files.

**Integrity check:** `sha256sum -c` against the table above. The harness
itself does not self-verify (keep the harness simple); verification is a
manual step before any gauntlet run that claims production relevance.
