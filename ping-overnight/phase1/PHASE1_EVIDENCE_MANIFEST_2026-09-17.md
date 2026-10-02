# Phase 1 Evidence Manifest: Sprint Receipts Freeze (2026-09-17)

**Produced:** 2026-09-17 05:52 MDT (11:52 UTC). Capture window 11:50:30Z to 11:52:33Z,
plus Oracle survey 11:50:37Z to ~11:56Z.

**Read-only attestation:** produced with read-only operations only. No git state was
changed (no commits, pushes, merges, resets, checkouts, cleans, stashes, branch
changes, or history rewrites). No database rows were written, updated, or deleted
(SELECT-only queries against live Postgres). No containers or services were
restarted, rebuilt, or reconfigured. No files were created, modified, or deleted
anywhere except this manifest, its JSON companion, and /tmp scratch scripts. No
credential, token, password, or .env VALUE appears anywhere in this document; only
variable names, file metadata, and SHA256 hashes are recorded. The playbook
revision node 194a2b85bde957ed was inspected via read-only SELECT only; its state
is unchanged.

**Relation to the earlier capture:** an independent Phase 1 capture was produced at
05:35 MDT (11:35 UTC) by a different worker and sits at
workspace/ping-overnight/PHASE1_EVIDENCE_MANIFEST_2026-09-17.md. This manifest is
a FRESH independent re-verification, not a copy. Phase 0 (credential rotation,
11:35 to 11:55 UTC) ran between the two captures, so deltas versus the 05:35
capture are expected and are called out in section 9. Where values agree, the two
independent captures converge.

**Sources:** Pig WSL repo at /home/nolan/ping (branch constitutional-convergence-v2),
Oracle host ping-core-01 (/opt/ping), sprint report
workspace/ping-overnight/PING_TEN_HOUR_CONVERGENCE_2026-09-17.md, evidence dirs
under workspace/ping-overnight/.

---

## 1. Worktree inventory

Registered worktrees per `git worktree list --porcelain` (run in /home/nolan/ping
on the Pig, 2026-09-17 11:50:30Z). Six worktrees, all present, all HEADs unchanged
from the sprint report. (The task context mentioned a PING-promotion worktree; no
such worktree is registered. This matches the sprint report, which also lists six.)

| Path | Branch | HEAD |
|---|---|---|
| /home/nolan/ping | constitutional-convergence-v2 | 099927152b93e0de7c1a120bc88d73fb939c1502 |
| /home/nolan/ping/worktrees/agent-exec | sprint/agent-exec | 5b102c66425a346bd3074df0822b5bed184d13ba |
| /home/nolan/ping/worktrees/agent-smoke-abc123def456 | recovery/agent-smoke-2026-09-16 | 3e0c3ddd1ee48ed35ddc80283accea1958e3e71c |
| /home/nolan/ping/worktrees/oracle-assembly | main | 5b102c66425a346bd3074df0822b5bed184d13ba |
| /home/nolan/ping/worktrees/playbook | sprint/playbook | 5b102c66425a346bd3074df0822b5bed184d13ba |
| /home/nolan/ping/worktrees/python-prod | sprint/python-prod | 5b102c66425a346bd3074df0822b5bed184d13ba |

### 1a. /home/nolan/ping (constitutional-convergence-v2 @ 099927152)

`git status --porcelain` (16 lines), identical to the 05:35 capture:

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

`git diff --stat HEAD`: 10 files changed, 15 insertions(+), 15 deletions(-).
Pre-existing modifications from before the sprint, untouched. Diff contents of
.env.base were NOT inspected (secret-bearing file).

### 1b. worktrees/oracle-assembly (main @ 5b102c664)

```
 M infrastructure/oracle/docker-compose.oracle.yml
?? infrastructure/oracle/docker-compose.oracle.yml.pre-canonical-20260916
?? infrastructure/oracle/oracle.env.template
?? multiruntime-proof/
?? oracle-assembly-patches/
```

`git diff --stat HEAD`: 1 file changed, 6 insertions(+), 60 deletions(-)
(canonical compose installed; dead scheduler service removed).

Untracked sprint files: oracle-assembly-patches/gateway/routes/events.js (the
live /events fix), oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js
(the retry fix), the pre-canonical compose copy, oracle.env.template,
multiruntime-proof/ (last night).

### 1c. worktrees/python-prod (sprint/python-prod @ 5b102c664)

Clean except `?? prod/`. Untracked: prod/python_prod_adapter.cjs,
prod/dlq_authority.cjs, prod/run_phase7.cjs, prod/run_phase8.cjs, prod/lib/ids.cjs,
prod/capabilities/ping_canonical_hash.py, prod/capabilities/ping_flaky.py,
prod/capabilities/ping_always_fail.py, prod/results-phase7.jsonl,
prod/results-phase8.jsonl, prod/dlq-phase8.jsonl.

### 1d. worktrees/agent-exec (sprint/agent-exec @ 5b102c664)

Clean except `?? external-agent/`. Untracked:
external-agent/external_agent_adapter.js,
external-agent/external_agent_adapter.test.js,
external-agent/WORKORDER_SCHEMA.json, external-agent/RESULT_SCHEMA.json,
external-agent/BOUNDARY.md.

### 1e. worktrees/playbook (sprint/playbook @ 5b102c664)

Clean except `?? playbook/`. Untracked: playbook/PLAYBOOK_SPEC.md,
playbook/run_phases.py, playbook/run_phases_1415.py, playbook/run_phases_15.py.
(chain.json and runlog.jsonl live on the cloud VM at
workspace/ping-overnight/playbook/, not in this worktree; hashed in section 3.)

### 1f. worktrees/agent-smoke-abc123def456 (recovery/agent-smoke-2026-09-16 @ 3e0c3ddd1)

Single modified file ` M .env.base` (dirty as the sprint report stated; not
touched by the sprint). Diff contents NOT inspected (secret-bearing file).

### 1g. Website /home/nolan/projects/ping (main @ f6386ee16473185a7089393aa44898a4521030d1)

21 porcelain lines, exactly as the sprint report left it:

```
 M src/app/newsletter/page.tsx
 M src/app/page.tsx
 M src/app/technology/page.tsx
 M src/components/newsletter-signup.tsx
 M src/components/ping-wordmark.tsx
 M src/components/site-footer.tsx
 M src/config/brand.v1.json
 M src/config/brand.v1.main.json
 M src/config/media.v1.json
 M src/config/media.v1.main.json
 M src/config/seo.ts
 M src/lib/api/client.ts
 M src/lib/authority-loader.ts
 M src/lib/infrastructure/audit.ts
 M src/lib/infrastructure/controller.ts
 M src/lib/strings.ts
?? public/images/ping-social-logo.png
?? research/
?? src/components/architecture/
?? src/components/maturity-label.tsx
```

HEAD f6386ee unchanged. Nothing committed or pushed.

---

## 2. Critical sprint patch file hashes (Pig worktrees)

SHA256, captured live on the Pig 2026-09-17 ~11:51 UTC:

```
6f1abebb7c3b38a2405fcbb73518495387c2c7a7592da955715402d544844117  worktrees/oracle-assembly/oracle-assembly-patches/gateway/routes/events.js
880d0d06d5cafb16d72373d57c898e5c11130c07ebd428ddeeaa5dd2c7dcd80c  worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js
5163084ec2f15b710159d53bf491b0dc40ccdff762f3019f6b055d4a9e4f6749  worktrees/oracle-assembly/infrastructure/oracle/docker-compose.oracle.yml
9a8757172ae8b78539f5a22f7022b9700217696d51121faed1303f47f6a5af6b  worktrees/oracle-assembly/infrastructure/oracle/docker-compose.oracle.yml.pre-canonical-20260916
d5181072eece68ae54f07c03401d0128385eb40fd3ac7a8b4e2ca778f9660297  worktrees/oracle-assembly/infrastructure/oracle/oracle.env.template
c52cac9529cf583f0484f7dbc913c35b8815e7cfcd6e82cfc63dbe483aaba40b  worktrees/python-prod/prod/python_prod_adapter.cjs
38bc4c4b7034d2540b080117c9d37877e44deeb9ed82bc1da3934fc0806ae637  worktrees/python-prod/prod/dlq_authority.cjs
521e516a7cfd57dabe1febdcf7f3361911e8e1c9b5d7fb6d771098b2d7836098  worktrees/agent-exec/external-agent/external_agent_adapter.js
0f95ef8748a6b56d3c6865790a9d4f736faf849c60e4ceb8ad7a60599d789999  worktrees/agent-exec/external-agent/external_agent_adapter.test.js
3bca1cfec36b570ae26850deffa436fc42cf823508a309fe777eba623ab28cb3  worktrees/agent-exec/external-agent/WORKORDER_SCHEMA.json
8ccf84e219259cd472a96bf6a0432085c87f8abca490204dab281028d7b537c9  worktrees/agent-exec/external-agent/RESULT_SCHEMA.json
0a20be8af6667e9c552207d0067e955f0f6a7720c3fe96204531f36b571a84cb  worktrees/agent-exec/external-agent/BOUNDARY.md
39e2048c37bd1b8bb6df8eab405883a533b62423e1e983bcdb57da21d337ede5  worktrees/playbook/playbook/PLAYBOOK_SPEC.md
```

All 13 match the 05:35 capture exactly. Cross-reference to live container copies
in section 4: the worktree /events patch (6f1abebb...) and retry patch
(880d0d06...) are byte-identical to the files running in the live gateway
container, including after the Phase 0 container recreate.

---

## 3. Sprint evidence file hashes (cloud VM workspace/ping-overnight/)

SHA256, captured on this VM 2026-09-17 ~11:52 UTC. All match the 05:35 capture:

```
5334fb9a2e60c3b0418eac4020425e040d103e362d694337f65f6c32092703b2  PING_TEN_HOUR_CONVERGENCE_2026-09-17.md
e3d39c640b3ef5801a1dfab9fd8f3a08b01cdf7c9f2bd931019e35adab445980  PING_OVERNIGHT_2026-09-16.md
69f0742e2f9b81bb2d32a076fd2a4743705495e5d458f7e2cfc6fd75f6d65007  STATUS.md
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
2ce4d212c0fdbca04334e2378abc36d838e9d908011c045c1c68010d98b7aa07  python-prod/REPORT.md
39e2048c37bd1b8bb6df8eab405883a533b62423e1e983bcdb57da21d337ede5  playbook/PLAYBOOK_SPEC.md
3a065ec412f47c2a268ed9608b9801360a9843156e5abdad7af3dcfdb838f1ce  playbook/REPORT.md
6207a296372848379868d5e9addecba1f9c528d24d47d55aaea8b14555b763f5  playbook/run_phases.py
77660e99edca19824b9cb3bdf20dc4ee49ffa1777d76268f5589206aa1e5f2e9  playbook/run_phases_1415.py
712128f8f6df401d3be130186d2b78c9c759d4b65b5dac316c3f5f9f59ab9eb9  playbook/run_phases_15.py
e2b3580cfdfa7f24b314d1bff8e578c9536dc6d1a3cbcfbb956e9986c6fc63f  playbook/chain.json
2a9a227d08e08ed70230e6abc111c59f12cf524a9f1e20697e41cfde3cffdb8b  playbook/runlog.jsonl
bede5e8fc505c608b6f8060ac9975df54a1c932c0a321cc959b34a3f99fd602b  website/HOMEPAGE_REPORT.md
a8bf548a9ad1f126e130aa47dba2185d4e1e92312b12e258aa33422fcc59320b  website/TRUTH-UPDATE-2026-09-16.md
25ace421ec0cc45c79abb6d583317364f3dd85e218adef1654daff978b0c6  website/TRUTH_MATRIX.md
```

oracle-deploy/remote/ snapshot files (captured 2026-09-17 02:17-02:18, unchanged):

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

(remote/err1, err2, err3 are 0-byte; sha256 of empty input for all three,
unchanged.)

---

## 4. Live Oracle file hashes (gateway container /app)

Copied read-only via `docker cp` from the running ping-gateway container on
Oracle, 2026-09-17 11:50:37Z. This is AFTER the Phase 0 gateway recreate
(container started 2026-09-17T11:47:30Z).

```
7a74d6eaaaadcb1f12e7341ac57a0d5fdde545e8097d098f4f8cdc62db537d2f  /app/gateway/capability_authority.js   (889 lines)
6f1abebb7c3b38a2405fcbb73518495387c2c7a7592da955715402d544844117  /app/gateway/routes/events.js         (166 lines)
880d0d06d5cafb16d72373d57c898e5c11130c07ebd428ddeeaa5dd2c7dcd80c  /app/gateway/bootstrap/gateway_runtime.js (984 lines)
```

All three match the 05:35 capture exactly, so the sprint patches SURVIVED the
Phase 0 container recreate (they live in the image layers, as the 05:35 capture
established: the container has no bind mounts). The live /events fix and the
retry fix remain the running code.

Container state at capture:

| Container | Image | State | Started |
|---|---|---|---|
| ping-gateway | oracle-gateway | running, healthy | 2026-09-17T11:47:30Z (Phase 0 recreate) |
| ping-postgres | postgres:17-alpine | running, healthy | 2026-09-17T11:42:31Z (see anomaly 9b) |
| ping-qdrant | qdrant/qdrant:v1.7.0 | running, healthy | 2026-09-17T02:00:52Z (untouched ~10h) |

The container /app/gateway tree also contains events.js.bak-agent-a-20260916 and
gateway_runtime.js.bak-agent-a-20260916 (Agent A's pre-deploy backups).

---

## 5. Compose: canonical vs live

- Canonical compose, oracle-assembly worktree
  (infrastructure/oracle/docker-compose.oracle.yml):
  `5163084ec2f15b710159d53bf491b0dc40ccdff762f3019f6b055d4a9e4f6749`
  (byte-identical to the cloud evidence copy and to the sprint report).
- Live compose definition (proven, see below):
  `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml`
  `dacc189745c7039cdd2538d9bcd72918557435036a8c48f26fe39bf209dd30fa`
  (mtime 2026-09-17 01:53, Agent A's deploy; byte-identical to the cloud evidence
  copy remote/live.docker-compose.oracle.yml).
- `/opt/ping/infrastructure/oracle/docker-compose.oracle.yml`:
  `2a8bcc4ef60d75e0b6358a885a3ed832e33a2882e2194a5809c1995ebe790e8f`
  (the "older" pre-canonical definition; NOT the live one).

Proof of which compose is live: `docker inspect ping-gateway` label
`com.docker.compose.project.config_files` =
`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml`,
working_dir = `.../ping-oracle-clean-snapshot/infrastructure/oracle`.
CONCLUSION: the live gateway was created from the releases-snapshot compose
(dacc189745...), which is also the compose file Phase 0 used for the
--force-recreate. The canonical compose (5163084e...) exists only in the
oracle-assembly worktree and the cloud evidence dir. CORRECTION to the 05:35
capture's section 4, which identified /opt/ping/infrastructure/oracle
(2a8bcc4e, "older") as the live compose; the inspect label proves otherwise.

Live project-dir .env (the file compose actually reads):
`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/.env`,
mode 600, mtime 2026-09-17 11:47 (Phase 0 recovery),
sha256 `50e7b6e99981b65f941a48e0f5a827c4d5ae70018a6fbc9904ebb61001834601`
(hash of file bytes only; values never read).
/opt/ping/.env (mode 600, mtime 11:42) and
/opt/ping/infrastructure/oracle/.env (mode 600, mtime 11:47) also present;
values never read.

---

## 6. Backup artifact hashes (Oracle /opt/ping/releases/)

Agent F's verified backup set, re-hashed live 2026-09-17 11:50:37Z. Sizes and
hashes all match the sprint report and the 05:35 capture:

| Path | Size (bytes) | SHA256 |
|---|---|---|
| pgdata-backup-2026-09-16.sql.gz | 160,927 | 10e315c3ef2570e210149db95b6f57ad4268b6a4816d37764a9bc40875d8f51e |
| qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot | 67,375,104 | b0a0aa29aca7bc5abb98d4fd303070ba94d65eb106babbf2feef4143a04edfc5 |
| ping-source-clean-2026-09-16.tar.gz | 26,628,632 | 962beb7c53385c6771dd2197fbca86ac4f67867d9477cab81564d7aba8cb3ed6 |
| RESTORE-2026-09-16.md | 3,379 | 896156dd801de097367e2fdef3e8983f9be5470100bdf207f87175cbcb85867e |

Also present in releases/: bce92787b0da631ed9218e2255607562c9dff731/ (2026-09-15
receipt tree, not part of the sprint backup set; now also the live compose
project dir, see section 5). The 1.1 GB FALSIFIED tarball remains at
/opt/ping/ping-oracle-clean-snapshot.tar.gz (1,083,211,776 bytes); preserved,
not trusted.

---

## 7. Critical IDs, verified live (read-only SELECT)

Column names in this database are event_id / mission_id / node_id (not `id`).

Canonical events (prefixes from the sprint report, verified character for
character; full IDs recovered live):

| Full event_id | event_type | namespace | source | Report role |
|---|---|---|---|---|
| 5e24e593f6a9f7b762ecedfed45a447faba57b6d1d9dded1dacd28feab3fe443 | ENTITY_CREATED | core::owner | api:muse-level-2 | /events boundary receipt |
| 27482dbdabfb57b7190dd9f4ae530bee98ff381c8cc0eebec27349dd04b502a1 | PYTHON_CAPABILITY_VERIFY | test.python-prod | agent-c-phase7 | Python chain E1 |
| a6e70b783956e4c1 (prefix) | TASK_STARTED | test.python-prod | python-worker | Python task |
| 9bbbfff731a2023d (prefix) | TASK_COMPLETED | test.python-prod | python-worker | Python task completion |
| f8c1ae1fc1c7bc32 (prefix) | MISSION_COMPLETED | core::system | mission-runtime | Python chain completion |
| 21a6af0b72a8cfeb (prefix) | MISSION_DEAD_LETTERED | test.python-prod | mission-scheduler | dead-letter proof |
| f326ea70d7cf16ce85c4cc56a23bc147ce0273984023c123b8b5467ea6d507de | ENTITY_CREATED | core::owner | api:muse-level-2 | Hermes evidence 1 |
| e91681bfd300389e9c8f10c7c3ad2f9cea352342bfe6aa71f962d14c764bb587 | ENTITY_CREATED | core::owner | api:muse-level-2 | Hermes evidence 2 |
| daaa75fc5b298c5b7fedab679e8bbf8a792099afc779877dd3d8acc7def1bf92 | ENTITY_CREATED | core::owner | api:muse-level-2 | Hermes evidence 3 |
| 3586f5ee8176bb708bfd4d4d4733f3e89a3ac2ab2c21d228b4db9e8cf3f80692 | OBSERVATION_CREATED | tenant::rotation-proof | api:muse | Phase 0 rotation proof |
| 9d5b14d34e1a445f (prefix) | OBSERVATION_CREATED | core::playbook | api:muse-level-2 | playbook proposal |
| 3c1985a53d9fa1e5 (prefix) | SNIPPET_APPROVED | core::playbook | api:muse-level-2 | playbook approval |
| 0bc80b9de9cc41f7 (prefix) | OBSERVATION_CREATED | core::playbook | api:muse-level-2 | activation |
| 04e4808ae4067a27 (prefix) | PROJECTION_CREATED | core::playbook | api:muse-level-2 | projection |
| 408247b6cd7f2ba0 (prefix) | REPLAY_COMPLETED | core::playbook | replay | replay 1 |
| 2c75c8da1fdb6b22 (prefix) | WITNESS_CREATED | core::playbook | witness | witness 1 |
| 93687aab65fb0ddc (prefix) | OBSERVATION_CREATED | core::playbook | api:muse-level-2 | outcome |
| ead4be8a1eaaa77c (prefix) | REPLAY_COMPLETED | core::playbook | replay | mission-driven replay |
| 4aa7b0ebecdbf2fc (prefix) | WITNESS_CREATED | core::playbook | witness | witness 2 |
| c4b129f76a8afd17 (prefix) | OBSERVATION_CREATED | core::playbook | api:muse-level-2 | restart probe |
| d1b47668c4b71b12 (prefix) | OBSERVATION_CREATED | core::owner | api:muse-level-2 | known-vector self-test |

Missions:

| mission_id | mission_type | status | retries | Report role |
|---|---|---|---|---|
| bfe815990337e45d | PYTHON_CAPABILITY_RUN | completed | 0 | Python production chain |
| 3daa14285107788e | PYTHON_FAIL_RUN | failed | 2 | dead-letter (terminal) |
| 0405c01805096690 | REPLAY_VERIFY | completed | 0 | playbook REPLAY_VERIFY |
| 945689817fdad075 | REPLAY_VERIFY | completed | 0 | mission-driven replay |
| 73e08f46f843beb2 | PYTHON_FLAKY_RUN | failed | 1 | orphaned test mission, neutralized |

Hermes WorkOrder 0d598aef352b9a8a: referenced in the payloads of 3 live events
(the three exterior-agent evidence events above). The exterior execution itself
was not re-run (correct for a freeze).

Playbook revision node 194a2b85bde957ed, CURRENT state at 2026-09-17 ~11:56 UTC
(read-only SELECT on knowledge_nodes; NOT mutated):

- node_id 194a2b85bde957ed, node_type playbook_revision, status candidate
- confidence 0.5, namespace test.playbook
- source_event_id 93687aab65fb0ddc613089e364ee102934a048b8ab3134844fe7e3019bdc8b30
- data.version 1.1.0, data.lifecycle empty, data.decided_by empty,
  data.required_approver "Nolan Geske (human)"
- updated_at 2026-09-17 02:38:32.621369+00 (unchanged since the sprint)
- Approval events referencing it: 0. The human gate is intact: v1.1.0 candidate,
  PENDING_HUMAN, decided_by null, active v1.0.0 untouched.

Other nodes: 94043c0eb1d3918d = playbook/approved/confidence 1.0 (source
9d5b14d34e1a445f); 4917265ee67e678c = playbook/candidate/confidence 0.5 with
NULL source_event_id (orphan residue from wiring gap 1, still present).

---

## 8. Live counts sanity snapshot (before-state for the next phase)

Captured 2026-09-17 11:56 UTC via read-only SELECT (credential used only as
PGPASSWORD inside the postgres container shell; never printed or stored):

- ping_events: 1380 rows (sprint backup: 1158; Phase 0 proof: rotation event added)
- ping_missions: 264 rows (sprint backup: 222; Phase 0: 257)
- public tables: 31 (unchanged)
- trg_ping_events_append_only: LIVE on ping_events (confirmed in pg_trigger)
- Qdrant collection knowledge: points_count 34, vectors_count 34
  (sprint backup: 13 points; Phase 0: 30 points)

Event activity in the trailing 12 hours (for before/after comparison):

| event_type | count |
|---|---|
| MISSION_STARTED | 72 |
| MISSION_CREATED | 72 |
| MISSION_ASSIGNED | 72 |
| MISSION_COMPLETED | 70 |
| WITNESS_CREATED | 12 |
| REPLAY_COMPLETED | 12 |
| LINEAGE_CREATED | 12 |
| PROJECTION_CREATED | 9 |
| ENTITY_CREATED | 9 |
| CLAIM_CREATED | 8 |
| CLASSIFICATION_CREATED | 8 |
| RECOMMENDATION_CREATED | 8 |
| OBSERVATION_CREATED | 8 |
| TASK_STARTED | 5 |
| MISSION_FAILED | 3 |

---

## 9. Anomalies and observations

a. COMPOSE LIVE-IDENTITY CORRECTION. The 05:35 capture concluded the live compose
was /opt/ping/infrastructure/oracle/docker-compose.oracle.yml (2a8bcc4e,
"older"). The gateway's own compose labels (config_files) prove the running
container was created from the releases-snapshot compose
(bce92787.../ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml,
dacc189745...), which Phase 0 also used for the --force-recreate. The
/opt/ping/infrastructure/oracle copy is not the live definition.

b. POSTGRES CONTAINER RESTARTED DURING PHASE 0. ping-postgres shows
STARTED=2026-09-17T11:42:31Z, i.e. it was restarted (or recreated) at the start
of the Phase 0 rotation window. The Phase 0 report states "Postgres and Qdrant
data untouched" and "minimum services restarted (gateway only)". The DATA is
intact (all Phase 0 proofs passed; this capture re-verified every critical ID),
but the "gateway only" restart claim is inaccurate for the postgres container.
Qdrant was genuinely untouched (started 02:00:52Z).

c. EVENT/MISSION GROWTH SINCE BACKUP. ping_events 1158 to 1380 (+222) and
ping_missions 222 to 264 (+42) since the 02:26 UTC backup; trailing-12h activity
shows ~70 missions completing with witness/replay/lineage events. This is
post-sprint runtime activity, not sprint residue; the next phase should diff
against these frozen counts.

d. QDRANT POINT GROWTH. knowledge collection points_count went 13 (backup) to
30 (Phase 0) to 34 (now). Recorded as observed.

e. SCHEMA NAMES. The event/mission/node tables use event_id, mission_id,
node_id as their primary key columns (not `id`). First probe with `id` failed
cleanly; all queries were re-run with correct columns.

f. PING-promotion worktree. Named in the task context but not registered in
`git worktree list`; consistent with the sprint report (six worktrees). Not an
anomaly, just confirming the inventory.

g. CONVERGENCE WITH THE 05:35 CAPTURE. Every hash re-verified here matches the
independent 05:35 capture except the deliberate Phase 0 deltas (gateway
container start time, new rotation-proof event, .env mtimes, mission/event
counts) and the compose live-identity correction in (a).

---

## 10. Manifest integrity

The authoritative SHA256 of this file is recorded in the JSON companion
(manifest_markdown_sha256), computed after this file was finalized. The JSON
companion itself was validated as well-formed JSON. Capture scripts used:
/tmp/phase1_pig.sh, /tmp/phase1_oracle.sh, /tmp/phase1b_oracle.sh,
/tmp/phase1c_oracle.sh, /tmp/phase1d_oracle.sh (scratch on the operators'
machines; /tmp/phase1 on Oracle holds only docker-copied gateway files, created
2026-09-17 ~11:50 UTC; no production paths touched).
Capture scripts used: /tmp/phase1_pig.sh, /tmp/phase1_oracle.sh,
/tmp/phase1b_oracle.sh, /tmp/phase1c_oracle.sh, /tmp/phase1d_oracle.sh
(scratch on the operators' machines; /tmp/phase1 on Oracle holds only
docker-copied gateway files, created 2026-09-17 ~11:50 UTC, no production
paths touched).
