# Failure classes discovered by worker R1 (093 evidence rebase)

Date: 2026-09-24. Scope: re-verifying P-20260923-093 evidence citations against
`tenanos-wave-gateway/integration` (@ 870069ca72c604bb8435543f45287b476aca36f0)
on the Pig via `git show`/`git grep` on the ref.

## FC-R1-001: fail-open permission check on the branch tool plane

- Where: `gateway/tool_authority.js:109-122` (`_checkToolPermission`).
- What: when no permission authority is configured, the method returns
  `{ allowed: true }` — "No permission authority, allow all". Every
  `executeTool` call (line 142-146) consults this, so a gateway wired without
  a permission authority dispatches every registered tool to every mission.
- Why it matters to P-20260923-093: the diff's guard model assumes a deny path
  exists server-side; the branch's actual plane fails OPEN in this
  configuration. The rebased test-10 comment and fs.read evidence now record
  this caveat. The guard itself is client-side and unaffected, but any claim
  that the branch "denies by default" is false without a permission authority.
- Suggested follow-up: server-side REFACTOR — default-deny when the
  permission authority is absent, matching the registry's fail-closed law.

## FC-R1-002: audit gap is worse than the E6 observation

- Where: `gateway/tool_authority.js` (executeTool, line 134) and
  `gateway/tool_gateway.js` (executeTool, line 102).
- What: the SWARM-04 E6 finding described a best-effort audit with an
  in-memory fallback. On the branch there is NO audit sink at all — zero
  audit references in either execute path (verified by grep). The observed
  failure mode is strictly worse than the modeled one.
- Why it matters: `auditOrHalt` remains the correct client-side posture
  (halt when the sink fails), but there is currently no server-side ledger
  for the halt to protect. Recorded as a REFACTOR item on the authority.

## FC-R1-003: phantom-snapshot evidence divergence (process class)

- What: P-20260923-093 cited `gateway/capability_authority.js:NNN` line
  numbers from Pig-local snapshot commit 43a6cd2e4, which is not an ancestor
  of `tenanos-wave-gateway/integration`, and the file does not exist on the
  branch. The diff was verified INTEGRATE-READY as pure-additive code while
  its evidence citations pointed at a phantom file.
- Invariant for future diffs: every `file:line` evidence citation must resolve
  against the integration ref (`git cat-file -e <ref>:<path>` + line read)
  before a diff is marked INTEGRATE-READY. A citation that cannot resolve is
  UNVERIFIED-ON-BRANCH or the diff does not ship.
- Note: the same divergence class also produced a secondary count bug — the
  original header said "21 advertised capabilities" while the table lists 20.
