# Phase 1 Evidence Manifest: Sprint Receipts Freeze (2026-09-17)

**Produced:** 2026-09-17 05:35 MDT (11:35 UTC) by Worker A (Phase 1: freeze the sprint receipts).

**Read-only attestation:** This manifest was produced with read-only operations only.
No git state was changed (no commits, pushes, merges, resets, checkouts, clean,
stash operations, branch changes, or history rewrites). No database rows were
written, updated, or deleted (SELECT-only queries against live Postgres). No
containers or services were restarted, rebuilt, or reconfigured. No files were
created, modified, or deleted anywhere except this manifest file itself. No
credential, token, password, or .env VALUE appears anywhere in this document;
only variable names and file metadata are recorded. Playbook revision node
194a2b85bde957ed was inspected via read-only SELECT only; its state is unchanged.

**Sources:** Pig WSL repo at /home/nolan/ping (branch constitutional-convergence-v2),
Oracle host ping-core-01 (/opt/ping), sprint report
workspace/ping-overnight/PING_TEN_HOUR_CONVERGENCE_2026-09-17.md,
evidence dirs under workspace/ping-overnight/.

---

## 1. Worktree inventory

Registered worktrees per `git worktree list` (run in /home/nolan/ping):

| Path | Branch | HEAD (full sha) |
|---|---|---|
| /home/nolan/ping | constitutional-convergence-v2 | 099927152b93e0de7c1a120bc88d73fb939c1502 |
| /home/nolan/ping/worktrees/agent-exec | sprint/agent-exec | 5b102c66425a346bd3074df0822b5bed184d13ba |
| /home/nolan/ping/worktrees/agent-smoke-abc123def456 | recovery/agent-smoke-2026-09-16 | 3e0c3ddd1ee48ed35ddc80283accea1958e3e71c |
| /home/nolan/ping/worktrees/oracle-assembly | main | 5b102c66425a346bd3074df0822b5bed184d13ba |
| /home/nolan/ping/worktrees/playbook | sprint/playbook | 5b102c66425a346bd3074df0822b5bed184d13ba |
| /home/nolan/ping/worktrees/python-prod | sprint/python-prod | 5b102c66425a346bd3074df0822b5bed184d13ba |

Six locations inventoried plus one unregistered directory (see VerifyReplay note).
All match the sprint report's stated HEADs. No HEAD moved during this pass.

### 1a. /home/nolan/ping (constitutional-convergence-v2 @ 099927152)

`git status --porcelain`:
```
 M .env.base
 M gateway/bootstrap/gateway_runtime.js
 M gateway/bootstrap/wiring.js
 M gateway/end_to_end_verifier.js
 M gateway/generated/deployment_generator.js
 M gateway/generated/deployment_manifest.json
 M gateway/launch_bg.ps1
 M gateway/launch_bg2.ps1
 M gateway/start_bg.js
 M gateway/test_pg_init.js
?? gateway/bootstrap/db_guard.js
?? worktrees/agent-exec/
?? worktrees/agent-smoke-abc123def456/
?? worktrees/oracle-assembly/
?? worktrees/playbook/
?? worktrees/python-prod/
```

`git diff --stat HEAD`: 10 files changed, 15 insertions(+), 15 deletions(-)
(.env.base 2+-, gateway_runtime.js 4+-, wiring.js 6+-, end_to_end_verifier.js 2+-,
deployment_generator.js 2+-, deployment_manifest.json 2+-, launch_bg.ps1 4+-,
launch_bg2.ps1 2+-, start_bg.js 2+-, test_pg_init.js 4+-).
Pre-existing modifications from before the sprint, untouched per the report.
Contents of the .env.base diff were NOT inspected (secret-bearing file).

Untracked sprint-relevant: gateway/bootstrap/db_guard.js (single file; worktree dirs
show as untracked because nested worktrees are not registered as submodules).

### 1b. worktrees/agent-exec (sprint/agent-exec @ 5b102c664)

Status: clean except `?? external-agent/`. `git diff --stat HEAD`: empty.
Untracked sprint files:
- external-agent/external_agent_adapter.js
- external-agent/external_agent_adapter.test.js
- external-agent/WORKORDER_SCHEMA.json
- external-agent/RESULT_SCHEMA.json
- external-agent/BOUNDARY.md

### 1c. worktrees/agent-smoke-abc123def456 (recovery/agent-smoke-2026-09-16 @ 3e0c3ddd1)

Status: ` M .env.base` (single modified file; dirty as the sprint report stated,
not touched by the sprint). `git diff --stat HEAD`: .env.base, 1 insertion(+),
1 deletion(-). Diff contents NOT inspected (secret-bearing file).

### 1d. worktrees/oracle-assembly (main @ 5b102c664)

Status:
```
 M infrastructure/oracle/docker-compose.oracle.yml
?? infrastructure/oracle/docker-compose.oracle.yml.pre-canonical-20260916
?? infrastructure/oracle/oracle.env.template
?? multiruntime-proof/
?? oracle-assembly-patches/
```
`git diff --stat HEAD`: infrastructure/oracle/docker-compose.oracle.yml,
6 insertions(+), 60 deletions(-) (canonical compose installed; scheduler removed).

Untracked sprint files:
- infrastructure/oracle/docker-compose.oracle.yml.pre-canonical-20260916
- infrastructure/oracle/oracle.env.template
- oracle-assembly-patches/gateway/routes/events.js (the live /events fix)
- oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js (the retry fix)
- multiruntime-proof/: python_worker_adapter.mjs, worker_runtime.mjs,
  mission_runtime.mjs, canonical_id.mjs, event_authority.mjs, run_proof.mjs,
  proof-events.jsonl, capabilities/ping_canonical_hash.py

### 1e. worktrees/playbook (sprint/playbook @ 5b102c664)

Status: clean except `?? playbook/`. `git diff --stat HEAD`: empty.
Untracked sprint files: playbook/PLAYBOOK_SPEC.md, playbook/run_phases.py,
playbook/run_phases_1415.py, playbook/run_phases_15.py.

### 1f. worktrees/python-prod (sprint/python-prod @ 5b102c664)

Status: clean except `?? prod/`. `git diff --stat HEAD`: empty.
Untracked sprint files: prod/python_prod_adapter.cjs, prod/dlq_authority.cjs,
prod/run_phase7.cjs, prod/run_phase8.cjs, prod/lib/ids.cjs,
prod/capabilities/ping_canonical_hash.py, prod/capabilities/ping_flaky.py,
prod/capabilities/ping_always_fail.py, prod/results-phase7.jsonl,
prod/results-phase8.jsonl, prod/dlq-phase8.jsonl
(plus __pycache__ .pyc artifacts).

### 1g. Stash

One shared stash entry visible from every worktree (worktrees share the repo's
refs namespace):
```
stash@{0}: On night-shift-2026-09-15: WIP night-shift-2026-09-15: dist+node_modules churn, gateway/oracle/tsconfig edits
```
Pre-existing, untouched.

### 1h. VerifyReplay: UNREGISTERED directory (not a git worktree)

`/home/nolan/ping/worktrees/VerifyReplay` exists on disk but is ABSENT from
`git worktree list`. It is 8 KB and contains exactly one file:
`worktree.json` (sha256 ed6c141e49e7c443141f3fcdc9a58605f113f0724f26f1e84ab65c564df49a9a,
224 bytes, dated 2026-09-16 10:40). Contents:
{"mission":"VerifyReplay","path":"C:\\Users\\nolan\\PING\\worktrees\\VerifyReplay","mode":"git-worktree","status":"prepared","notes":["no-commit","no-edit-main-tree","replay-required"]}

It is a leftover mission-prep artifact (Windows-side path, never materialized).
There is no `.git` file or directory inside it. CAUTION for future forensics:
running git commands with cwd inside VerifyReplay silently resolves to the
PARENT repo (/home/nolan/ping) and reports the parent's status; it must not be
treated as an independent worktree.

### 1i. Bonus: website repo (outside the ping repo, referenced by the sprint)

/home/nolan/projects/ping: branch main @ f6386ee16473185a7089393aa44898a4521030d1,
21 uncommitted files (matches the sprint report: same count as the prior night).
Modified: src/app/newsletter/page.tsx, src/app/page.tsx, src/app/technology/page.tsx,
src/components/newsletter-signup.tsx, src/components/ping-wordmark.tsx,
src/components/site-footer.tsx, src/config/brand.v1.json, src/config/brand.v1.main.json,
src/config/media.v1.json, src/config/media.v1.main.json, src/config/seo.ts,
src/lib/api/client.ts, src/lib/authority-loader.ts, src/lib/infrastructure/audit.ts,
src/lib/infrastructure/auth-manager.ts, src/lib/infrastructure/controller.ts,
src/lib/strings.ts. Untracked: public/images/ping-social-logo.png, research/,
src/components/architecture/, src/components/maturity-label.tsx.

---
## 2. Sprint evidence file hashes (workspace/ping-overnight/)

sha256 of the report, patch, and evidence files the sprint produced or referenced
(26 files):

```
5334fb9a2e60c3b0418eac4020425e040d103e362d694337f65f6c32092703b2  PING_TEN_HOUR_CONVERGENCE_2026-09-17.md
e3d39c640b3ef5801a1dfab9fd8f3a08b01cdf7c9f2bd931019e35adab445980  PING_OVERNIGHT_2026-09-16.md
69f0742e2f9b81bb2d32a076fd2a4743705495e5d458f7e2dfc6fd75f6d65007  STATUS.md
ecd0f0b6f4eda083fd8bc3b26773ef6abc25d27bf938877ced5014dc1a64404e  agent-exec/REPORT.md
58f05cac7fa4f2676e5c1418788d916f7329bb676db4680dd9ed175a58fc10f5  backup/REPORT.md
d3e9fb1d06ef964104f4d3304d2505166744bdc411654fca2de6cc66df9bd6db  event-boundary/REPORT.md
43b899790ddc98b102fc671b7bcc57d1d9486cb2be2f78f4cffaa7d157b43600  event-boundary/trigger-append-only.sql
49a5dcfd7fd48e900487fc961829f51c9973030df538cb868349fffee81f7452  forensics/AUTHORITY_FORENSICS.md
d11ae6d145d7cd2bd1a9d1abc7b70deef52ef09b78bd9a56e03c42471db75c8b  multiruntime/CROSS_RUNTIME_PROOF.md
1d38b1a60c30a92d30659ecd868a9178457250ddf456fc89088c952a49cd55b0  multiruntime/EXECUTION_CONTRACT.md
49a39f10e83184f7e31eac6c23cd0d7d3e0c48a100a7953ac8e4af7ccfbdeb13  multiruntime/PYTHON_ADAPTER.md
3c52f4d0c324d92602725b8ad701f3d72b3b780f4eabd70d7454b21905e3771b  oracle-deploy/REPORT.md
5163084ec2f15b710159d53bf491b0dc40ccdff762f3019f6b055d4a9e4f6749  oracle-deploy/docker-compose.oracle.yml
d5181072eece68ae54f07c03401d0128385eb40fd3ac7a8b4e2ca778f9660297  oracle-deploy/oracle.env.template
b96121a21808fa8284fd5f6d76518d77953d0c0937d198f3493aaa98cd9183e6  oracle/TRIAGE_REPORT.md
39e2048c37bd1b8bb6df8eab405883a533b62423e1e983bcdb57da21d337ede5  playbook/PLAYBOOK_SPEC.md
3a065ec412f47c2a268ed9608b9801360a9843156e5abdad7af3dcfdb838f1ce  playbook/REPORT.md
6207a296372848379868d5e9addecba1f9c528d24d47d55aaea8b14555b763f5  playbook/run_phases.py
77660e99edca19824b9cb3bdf20dc4ee49ffa1777d76268f5589206aa1e5f2e9  playbook/run_phases_1415.py
712128f8f6df401d3be130186d2b78c9c759d4b65b5dac316c3f5f9f59ab9eb9  playbook/run_phases_15.py
e2b3580cfdfa7f24b314d1bff8e578c9536dc6d1a3cbcfbb956e9986c6fc63f  playbook/chain.json
2a9a227d08e08ed70230e6abc111c59f12cf524a9f1e20697e41cfde3cffdb8b  playbook/runlog.jsonl
2ce4d212c0fdbca04334e2378abc36d838e9d908011c045c1c68010d98b7aa07  python-prod/REPORT.md
bede5e8fc505c608b6f8060ac9975df54a1c932c0a321cc959b34a3f99fd602b  website/HOMEPAGE_REPORT.md
a8bf548a9ad1f126e130aa47dba2185d4e1e92312b12e258aa33422fcc59320b  website/TRUTH-UPDATE-2026-09-16.md
25ace421ec0cc45c79abb6d583317364f3dd85e218adef1654daff5df978b0c6  website/TRUTH_MATRIX.md
```

oracle-deploy/remote/ snapshot files (9 files, captured 2026-09-17 02:17-02:18):

```
9bcbe46b5d790b35b2c0a70ba69d4f2778f3dec045a6b5b4d851a022ce8ac02e  remote/Dockerfile.scheduler
9c52b314a4e19e6025f8cf57d6377b0b672549f28812ff0710263ff01b5ee4de  remote/bak.docker-compose.oracle.yml
cc01ab5c9f2f086ea2904e8898ff1974ca46d642e9ab3bc44e19aa6272f1ae0f  remote/bootstrap.sh
dacc189745c7039cdd2538d9bcd72918557435036a8c48f26fe39bf209dd30fa  remote/live.docker-compose.oracle.yml
2a8bcc4ef60d75e0b6358a885a3ed832e33a2882e2194a5809c1995ebe790e8f  remote/older.docker-compose.oracle.yml
2e98d3dbd77a0bebf7f65a7b2f880ac956f94537f84f1cd42cf18da00e065f35  remote/ping-gateway.service
4743c6253f3edaacba8bd42b732e384ff1e7ebe3a4d3f40c19ee160a55cc2f78  remote/ping-postgres.service
265ac13a1adda185fd7761319257953280a3479e90af97f281fe0364a4a160f0  remote/ping-scheduler.service
2f2abcd5ec91b008fa3b3d8c829db23a8e1b41a25f15fb8ed0935  remote/ping-worker.service
9a8757172ae8b78539f5a22f7022b9700217696d51121faed1303f47f6a5af6b  remote/repo-oracle-assembly.docker-compose.oracle.yml
```
(remote/err1, err2, err3 are 0-byte files; not hashed.)

Key sprint patch files in the Pig worktrees (6 files):

```
6f1abebb7c3b38a2405fcbb73518495387c2c7a7592da955715402d544844117  worktrees/oracle-assembly/oracle-assembly-patches/gateway/routes/events.js
880d0d06d5cafb16d72373d57c898e5c11130c07ebd428ddeeaa5dd2c7dcd80c  worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js
5163084ec2f15b710159d53bf491b0dc40ccdff762f3019f6b055d4a9e4f6749  worktrees/oracle-assembly/infrastructure/oracle/docker-compose.oracle.yml
9a8757172ae8b78539f5a22f7022b9700217696d51121faed1303f47f6a5af6b  worktrees/oracle-assembly/infrastructure/oracle/docker-compose.oracle.yml.pre-canonical-20260916
d5181072eece68ae54f07c03401d0128385eb40fd3ac7a8b4e2ca778f9660297  worktrees/oracle-assembly/infrastructure/oracle/oracle.env.template
b232c24929016fc8ea810f21ef4734e8215469a643f2d3aad14546c02dbb74cc  worktrees/oracle-assembly/infrastructure/oracle/schema.sql
521e516a7cfd57dabe1febdcf7f3361911e8e1c9b5d7fb6d771098b2d7836098  worktrees/agent-exec/external-agent/external_agent_adapter.js
0a20be8af6667e9c552207d0067e955f0f6a7720c3fe96204531f36b571a84cb  worktrees/agent-exec/external-agent/BOUNDARY.md
c52cac9529cf583f0484f7dbc913c35b8815e7cfcd6e82cfc63dbe483aaba40b  worktrees/python-prod/prod/python_prod_adapter.cjs
38bc4c4b7034d2540b080117c9d37877e44deeb9ed82cfc63dbe483aaba40b    worktrees/python-prod/prod/dlq_authority.cjs  (see note)
39e2048c37bd1b8bb6df8eab405883a533b62423e1e983bcdb57da21d337ede5  worktrees/playbook/playbook/PLAYBOOK_SPEC.md
```

Note: the dlq_authority.cjs line above was transcribed from terminal output; the
authoritative value recorded at capture time is
38bc4c4b7034d2540b080117c9d37877e44deeb9ed82bc1da3934fc0806ae637.

## 3. Live Oracle file hashes (/opt/ping and container /app)

Containers at capture time (no restarts performed): ping-gateway Up 9 hours
(healthy, image oracle-gateway), ping-qdrant Up 10 hours (healthy,
qdrant/qdrant:v1.7.0), ping-postgres Up 41 hours (healthy, postgres:17-alpine).
The ~9h gateway uptime is consistent with the sprint's 02:27 UTC deploy restart.

Bind-mount tree copies (the on-box source tree under /opt/ping):

```
8de8b43e7a8ec6e95ef9c66f5e6c7d3b59acda4e2477968c630b290c69ab9dd1  /opt/ping/gateway/routes/events.js
7fb781846b1ab5f531dc104b51be270cbbda2817e6cbd8553ebd84b56a1e32e3  /opt/ping/gateway/bootstrap/gateway_runtime.js
ff0eaeb836ec221923a98c75f40eb4c60a0644e73b559f48f1ae87bff540bfd9  /opt/ping/gateway/capability_authority.js
```

Container /app copies (read-only `docker exec ping-gateway sha256sum`):

```
6f1abebb7c3b38a2405fcbb73518495387c2c7a7592da955715402d544844117  /app/gateway/routes/events.js
880d0d06d5cafb16d72373d57c898e5c11130c07ebd428ddeeaa5dd2c7dcd80c  /app/gateway/bootstrap/gateway_runtime.js
7a74d6eaaaadcb1f12e7341ac57a0d5fdde545e8097d098f4f8cdc62db537d2f  /app/gateway/capability_authority.js
```

Cross-reference (ANOMALY, see section 8):
- Container /app/gateway/routes/events.js (6f1abebb...) is BYTE-IDENTICAL to the
  worktree patch file oracle-assembly-patches/gateway/routes/events.js. The sprint
  /events patch IS live in the running container.
- Container /app/gateway/bootstrap/gateway_runtime.js (880d0d06...) is
  BYTE-IDENTICAL to the worktree patch file
  oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js. The retry fix IS
  live in the running container.
- The bind-mount copies under /opt/ping match NEITHER the container copies NOR
  the worktree patches.
- `docker inspect --format '{{json .Mounts}}' ping-gateway` returns `[]`: the
  gateway container has NO bind mounts. Its /app tree comes from the image
  layers, not from /opt/ping. The /opt/ping/gateway tree is therefore NOT the
  code the container is running.

/opt/ping/.env metadata (values never read or printed): exists, 237 bytes,
mtime 2026-09-15 04:10:02 UTC. Variable NAMES only:
POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD,
QDRANT_HOST, QDRANT_PORT, QDRANT_URL, LOG_LEVEL, NODE_ENV.

## 4. Compose hash comparison

- Canonical compose, worktree copy
  (/home/nolan/ping/worktrees/oracle-assembly/infrastructure/oracle/docker-compose.oracle.yml):
  5163084ec2f15b710159d53bf491b0dc40ccdff762f3019f6b055d4a9e4f6749
- Canonical compose, cloud evidence copy
  (workspace/ping-overnight/oracle-deploy/docker-compose.oracle.yml):
  5163084ec2f15b710159d53bf491b0dc40ccdff762f3019f6b055d4a9e4f6749
  BYTE-IDENTICAL to the worktree copy. Matches the sprint report's "sha 5163084e...".
- Live on-box compose (/opt/ping/infrastructure/oracle/docker-compose.oracle.yml):
  2a8bcc4ef60d75e0b6358a885a3ed832e33a2882e2194a5809c1995ebe790e8f
  (5082 bytes, mtime 2026-09-15 04:52:30 UTC).
- The live compose is BYTE-IDENTICAL to remote/older.docker-compose.oracle.yml
  (2a8bcc4e...). The pre-canonical preserved copy in the worktree
  (9a875717...) is BYTE-IDENTICAL to remote/repo-oracle-assembly.docker-compose.oracle.yml.

CONCLUSION: the live on-box compose is NOT byte-identical to the canonical
compose. The canonical definition exists only in the oracle-assembly worktree
and the cloud evidence dir; the live box still runs the pre-canonical
("older") definition, consistent with the sprint report's "live on-box compose
file was not overwritten."

## 5. Backup artifact hashes (Oracle /opt/ping/releases/)

Agent F's verified backup set; all byte sizes match the sprint report exactly:

| Path | Size (bytes) | sha256 |
|---|---|---|
| /opt/ping/releases/pgdata-backup-2026-09-16.sql.gz | 160,927 | 10e315c3ef2570e210149db95b6f57ad4268b6a4816d37764a9bc40875d8f51e |
| /opt/ping/releases/qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot | 67,375,104 | b0a0aa29aca7bc5abb98d4fd303070ba94d65eb106babbf2feef4143a04edfc5 |
| /opt/ping/releases/ping-source-clean-2026-09-16.tar.gz | 26,628,632 | 962beb7c53385c6771dd2197fbca86ac4f67867d9477cab81564d7aba8cb3ed6 |
| /opt/ping/releases/RESTORE-2026-09-16.md (restore guide) | 3,379 | 896156dd801de097367e2fdef3e8983f9be5470100bdf207f87175cbcb85867e |

Also present in /opt/ping/releases/: directory bce92787b0da631ed9218e2255607562c9dff731/
(dated 2026-09-15 14:44, contains ping-oracle-clean-snapshot/, an earlier receipt
tree; not part of the sprint backup set; left untouched).
Also on-box but outside releases/: /opt/ping/ping-oracle-clean-snapshot.tar.gz
(1,083,211,776 bytes, 2026-09-15 14:41; the 1.1 GB tarball the sprint FALSIFIED
as a DR artifact; preserved, not trusted).

---
## 6. Critical IDs from the sprint report (verified live, read-only)

Canonical events (full IDs recovered from live ping_events; prefixes match the
report's truncated forms character for character):

| Full event_id | event_type | namespace | Report role |
|---|---|---|---|
| 5e24e593f6a9f7b762ecedfed45a447faba57b6d1d9dded1dacd28feab3fe443 | ENTITY_CREATED | core::owner | /events boundary receipt |
| 27482dbdabfb57b7190dd9f4ae530bee98ff381c8cc0eebec27349dd04b502a1 | PYTHON_CAPABILITY_VERIFY | test.python-prod | Python chain E1 |
| 21a6af0b72a8cfeb... (prefix-confirmed) | MISSION_DEAD_LETTERED | test.python-prod | dead-letter proof |
| f8c1ae1fc1c7bc32 (prefix-confirmed) | MISSION_COMPLETED | core::system | Python chain completion |
| f326ea70d7cf16ce85c4cc56a23bc147ce0273984023c123b8b5467ea6d507de | ENTITY_CREATED | (Hermes evidence) | exterior-agent event 1 |
| e91681bfd300389e9c8f10c7c3ad2f9cea352342bfe6aa71f962d14c764bb587 | ENTITY_CREATED | (Hermes evidence) | exterior-agent event 2 |
| daaa75fc5b298c5b7fedab679e8bbf8a792099afc779877dd3d8acc7def1bf92 | ENTITY_CREATED | (Hermes evidence) | exterior-agent event 3 |

Missions (status verified live in ping_missions):

| mission_id | status | Report role |
|---|---|---|
| bfe815990337e45d | completed | Python production chain |
| 3daa14285107788e | failed | dead-letter (2 attempts, terminal) |
| 0405c01805096690 | completed | playbook REPLAY_VERIFY |
| 73e08f46f843beb2 | failed | orphaned PYTHON_FLAKY_RUN test mission, neutralized |

WorkOrder: 0d598aef352b9a8a (Hermes v0.21.2, exit 0; recorded from the report;
the exterior execution itself was not re-run).

Playbook revision node 194a2b85bde957ed, CURRENT state from read-only SELECT on
knowledge_nodes at 2026-09-17 11:35 UTC (NOT mutated in any way):
- node_id: 194a2b85bde957ed; node_type: playbook_revision; status: candidate
- confidence: 0.5; namespace: test.playbook
- data.version: 1.1.0; data.lifecycle: (empty); data.decided_by: (empty)
- data.required_approver: "Nolan Geske (human)"
- source_event_id: 93687aab65fb0ddc613089e364ee102934a048b8ab3134844fe7e3019bdc8b30
  (the outcome event from the report)
- updated_at: 2026-09-17 02:38:32.621369+00
- Approval events referencing it: 0 (SELECT count(*) over event_type LIKE
  '%APPROV%' with payload containing the node id). The human gate is intact:
  v1.1.0 candidate, PENDING_HUMAN, decided_by null, exactly as the report states.

Orphan evidence 4917265ee67e678c, CURRENT state from read-only SELECT:
- node_id: 4917265ee67e678c; node_type: playbook; status: candidate
- namespace: test.playbook; confidence: 0.5; source_event_id: (empty)
- created_at: 2026-09-17 02:23:53.978381+00
Confirmed present as residue, consistent with playbook wiring gap 1
(POST /knowledge/nodes drops nodeId/sourceEventId/correlationId).

## 7. Items NOT verified and why

1. How the sprint patches entered the gateway image layers. The container has no
   bind mounts, so the patched files arrived via image build, `docker cp`, or
   `docker commit` during Agent A's deploy; the mechanism is not determinable
   from read-only inspection of the current state.
2. Lineage of the /opt/ping/gateway bind-mount copies (8de8b43e..., 7fb78184...,
   ff0eaeb8...). They match neither the live container nor the worktree patches;
   they were not diffed against git history (kept the pass strictly to hashing
   and status, per the read-only forensics scope).
3. GitHub acceptance of the rewritten constitutional-convergence-v2 branch.
   Per the sprint report this is UNKNOWN from this environment; no network
   check against GitHub was attempted (outside the read-only forensics scope
   and the report already classifies it).
4. Full (non-truncated) IDs for MISSION_DEAD_LETTERED 21a6af0b72a8cfeb... and
   MISSION_COMPLETED f8c1ae1fc1c7bc32... were prefix-confirmed only; the full
   64-hex values were not pulled (prefix match on the indexed column was deemed
   sufficient for the manifest; full values remain in the DB).
5. The Hermes WorkOrder 0d598aef352b9a8a execution was not re-run or
   re-verified; its IDs are carried from the sprint report.
6. Contents of the .env.base diffs (parent repo and agent-smoke worktree) were
   deliberately not inspected: secret-bearing files are recorded as
   "modified" only, never opened.

## 8. Anomalies found

A1. LIVE CODE DOES NOT COME FROM /opt/ping. `docker inspect` shows ping-gateway
    has zero bind mounts; its /app tree is image-layer content. The running
    container's events.js and gateway_runtime.js are byte-identical to the
    sprint worktree patches (the fixes ARE live), but the on-box source tree
    /opt/ping/gateway/* matches neither. This is a sharper instance of the
    sprint's "live-ahead-of-repo drift" (P0 Remaining item 6): there are now
    THREE code locations (image layers, /opt/ping tree, git worktrees) and only
    the image layers reflect the sprint patches. Any future rebuild from
    /opt/ping or from a branch would LOSE the /events fix and the retry fix
    unless the drift is reconciled first.

A2. LIVE COMPOSE IS PRE-CANONICAL. The on-box compose (2a8bcc4e...) is the
    "older" pre-canonical definition; the canonical compose (5163084e...) exists
    only in the oracle-assembly worktree and the cloud evidence dir. If the
    stack is ever recreated from the live on-box file, the obsolete scheduler
    service definition returns. (Consistent with the sprint report; recorded
    here with hashes as the frozen before-state.)

A3. VerifyReplay IS NOT A WORKTREE. It is an 8 KB directory containing one
    mission-prep JSON that references a Windows path
    (C:\Users\nolan\PING\worktrees\VerifyReplay) and was never registered with
    git. Git commands run inside it silently report the PARENT repo's state.
    Recommend either registering it properly, converting it to a real worktree,
    or removing the directory (removal is Nolan's call; Worker A deletes nothing).

A4. agent-smoke worktree remains dirty (M .env.base). Unchanged from the
    sprint's "untouched per standing order" state; recorded here so Phase 2 can
    distinguish it from any new dirt.

A5. One shared stash entry (night-shift-2026-09-15 WIP) is visible from all
    worktrees. Pre-existing; recorded so it is not mistaken for sprint output.

## 9. Manifest integrity

- Worktrees inventoried: 6 registered + 1 unregistered directory = 7 locations.
- Evidence files hashed: 26 (ping-overnight evidence dirs) + 9 (oracle-deploy/remote)
  + 11 (Pig worktree patch files) + 4 (Oracle backup set) + 1 (VerifyReplay worktree.json)
  = 51 file hashes, plus 6 live Oracle file hashes (3 bind-mount + 3 container).
- Compose comparison: 4 distinct compose hashes recorded across 6 locations;
  canonical pair byte-identical, live pair byte-identical, canonical != live.
- Live DB spot-checks: 7 events, 4 missions, 1 revision node, 1 orphan node,
  0 approval events referencing the revision. All SELECT-only.
- No commits, pushes, merges, resets, checkouts, stash operations, file writes
  (outside this manifest), DB writes, or service restarts were performed.
- No secret values appear in this manifest.

End of Phase 1 evidence manifest.
