# Evidence index: social-interdependence/instagram

Built 2026-10-01. sha256 digests of the skill's load-bearing files, so a
later reader can verify what was reviewed. Paths are relative to
`~/workspace/skills/social-interdependence/instagram/`.

## Skill definition

- d4c997e10875f493460461bfc20958bc9b5c098977bc31ddd8d8c15267804481  SKILL.md

## Machinery (bin/)

- 2b5355ec64614a1dbb45fc0251165a5bdc0f43b7e160cb88c898845ccd52e74b  bin/siig_states.py (19-state machine, transition-evidence log)
- f90f195e40857f1492993a82e31b0270afaf68a14fde31e727630e8fea4f76b7  bin/siig_executor.py (build/execute/reconcile/verify)
- bb1febbe49a47de742c672338c12213c8f6f422941b71ac44283bb1fede45d29  bin/siig_guard.py (binding to the real guard + authority gate)
- 21768b6891929818440f64b79b0d8a6019f10a2483c0f0db3a799352467f0b46  bin/siig_verify.py (read-after-write verification)

Supporting modules (same dir, covered by the suite): siig_common.py,
siig_budgets.py, siig_leases.py, siig_breakers.py, siig_decisions.py,
siig_watchdog.py, siig_learner.py, siig_relationship.py,
siig_adapter_contract.py, si-ig.py.

## Fixture (the only mock; adapter boundary only)

- 186fc4028fc183e4c34f797b3300ef1dc98fa08b5c7a39fda5c977caa255bcf8  fixtures/fixture_ig_adapter.py

## Tests (33/33 passing 2026-10-01, scratch trees only)

- 4a90bcb0e036746307b8a7bc2773c67cf675656834602862d9ad02d34f78b9e1  tests/test_si_ig.py
- f43e08cc498a4e5c3894313e6098b73c6eef19a6fb74a06bd9ed7ae2a89d28a6  tests/run_tests.py
- 876e2027fd26eff571ed908357dac215967723853109dd0d8ae4bb842d04b2a9  tests/data/make_scratch.py
- e8b72ca4117d646b34ce3286f5ff1319e8b718d5aa3ddf055d1d531d4d9ef998  tests/data/discovery_feed.json

## Schemas

- 1ee007d30db07dff2efc0c25d89f1caaba346abd7a16b8c137571635d5e97914  schemas/intent.schema.json
- 4610e51c8c427e4cedc3463cf1d98b64c1b1fb9978177d6e444ae1a363c2cdf3  schemas/decision-record.schema.json
- f77d01c0152a10760443921322dfeab0198ebef6f9285b8adcb2640def6c0cfa  schemas/autonomy-envelope.schema.json
- 78263655fb3a27cfdd198dd82fdeb5ec2230a67aff18bdd15d5cb352070aeef9  schemas/evidence-package.schema.json

## External authorities this skill binds to (not copied)

- ~/workspace/outreach/engagement-guard.py: the single deterministic
  eligibility function (imported by code path, never forked).
- ~/workspace/outreach/authority-check.py: the executable authority
  gate (step 0 fail-closed on holds.json).
- ~/workspace/outreach/eligibility-data/action-capability.json:
  instagram = like + comment only (read live, never copied).
- ~/workspace/outreach/holds.json: the only hold surface.
- PING primitives reused, none created: MissionRuntime,
  MissionScheduler, WorkerRuntime, CapabilityAuthority,
  IdentityAuthority, HashAuthority, Witness, Lineage, Replay.
  Event Authority integration is marked at the persistence boundary;
  no independent social event database exists.
