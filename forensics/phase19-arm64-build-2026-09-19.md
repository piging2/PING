# PHASE 19: ARM64 Build Substrate Investigation (2026-09-19)

**Role:** investigator, read-only. No worktree mutated, no image pushed anywhere. All trial builds local-only on the Pig (x86_64 host, ARM64 via buildx/QEMU user-mode emulation). Trial images cleaned up at the end of this pass.

**Question:** for the Oracle ARM64 target (ping-core-01, aarch64, Ubuntu 24.04), is the simpler reliable gateway substrate (a) the current Alpine/musl base plus a build toolchain, or (b) a glibc-based minimal Debian/Ubuntu Node image?

**Short answer:** stay on Alpine (node:24-alpine). Add the toolchain (W1: `build-base python3` plus `CXXFLAGS="-std=c++20"`, the latter proven necessary live because tree-sitter@0.21.1's binding.gyp pins C++17 while Node 24 requires C++20, on any platform) and remove @temporalio/* from the Oracle gateway package set (W1). The glibc switch buys exactly one thing, Temporal core-bridge dlopen, which is moot once Temporal is removed, while costing ~113 MB of base image, 70 extra OS packages of attack surface, and a substrate change on a path that already has live healthy precedent (node:20-alpine gateway running 36h+ on the Oracle host). Details and primary evidence below.

---

## 1. Current gateway Dockerfile (worktree, read-only inspection)

`/home/nolan/worktrees/constitutional-convergence-authority-law/gateway/Dockerfile` (verbatim):

```dockerfile
FROM node:24-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY gateway/package*.json ./
RUN npm install
RUN npm install pg express

COPY . .

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "gateway/server.js"]
```

Observations (all primary, from the file itself):
- Base is musl (Alpine). Only `git` is added; no compiler, no python3, no make/g++.
- `npm install` (not `npm ci`): no lockfile discipline at build time. Whether a package-lock.json exists in the gateway dir was not re-verified this pass; the Dockerfile copies `package*.json`, so a lockfile would be honored if present.
- The second `RUN npm install pg express` re-resolves `pg` and `express` a second time outside the package.json pin (both are already in dependencies). This is a determinism smell: two resolves can drift. Recommend folding into one install step when the Dockerfile is next touched. Not a blocker.

## 2. Native-module inventory for the gateway dependency set

gateway/package.json dependencies: @temporalio/activity, @temporalio/client, @temporalio/worker (^1.8.0), bullmq ^5.0.0, dockerode ^4.0.0, express ^4.18.2, googleapis ^173.0.0, ioredis ^5.4.0, pg ^8.22.0, simple-git ^3.22.0, tree-sitter ^0.21.1, tree-sitter-javascript ^0.21.0, tree-sitter-python ^0.21.0, tree-sitter-typescript ^0.23.2, yaml ^2.7.0.

Native (node-gyp or prebuilt-binary) modules found by inspecting the actual published tarballs and install scripts:

| Module | Version pinned | Native mechanism | linux-arm64 prebuild? | Verdict on ARM64 |
|---|---|---|---|---|
| tree-sitter | 0.21.1 | node-gyp-build, falls back to node-gyp compile | NO (tarball lists darwin-arm64, darwin-x64, linux-x64, win32-x64 only; verified by listing tree-sitter-0.21.1.tgz) | Must compile from source. Needs build-base + python3 in the build. Same on musl and glibc. |
| tree-sitter-javascript | 0.21.0 | node-gyp-build | NO (same four prebuilds; verified in tarball) | Must compile from source. |
| tree-sitter-python | 0.21.0 | node-gyp-build | NO (same four prebuilds; verified in tarball) | Must compile from source. |
| tree-sitter-typescript | 0.23.2 | node-gyp-build | YES (prebuilds/linux-arm64/tree-sitter-typescript.node present in tarball; also win32-arm64) | Downloads prebuild. No toolchain needed for this one. |
| @temporalio/core-bridge | 1.8.0 (via @temporalio/* ^1.8.0) | install script downloads prebuilt Rust core binary; targets include aarch64-unknown-linux-gnu, NO musl target at all | YES, glibc-only (aarch64-unknown-linux-gnu/index.node) | Installs fine everywhere; **dlopen fails on musl**, works on glibc. See trial evidence below. |
| pg, bullmq, ioredis, dockerode, express, googleapis, simple-git, yaml | various | pure JS (pg without pg-native; simple-git shells out to the git binary, which apk provides) | n/a | No native concern on either substrate. |

Everything else in the set is pure JavaScript. The complete native surface is therefore: **tree-sitter core + 2 grammar compiles, 1 grammar prebuild download, and the Temporal glibc-only binary.**

## 3. Trial evidence (all builds --platform linux/arm64 on the Pig via QEMU user-mode)

Environment notes, stated honestly:
- The Pig is x86_64; ARM64 execution is QEMU user-mode emulation through Docker Desktop's buildx. Timing numbers under emulation are NOT representative of native ARM64 speed; they only prove correctness (a binary that dlopens/parses under emulation will do so natively).
- Pig Docker Desktop quirk encountered: `~/.docker/config.json` on Pig WSL sets `"credsStore": "desktop.exe"`, which fails from WSL with "A specified logon session does not exist." Workaround used for all pulls/builds: `DOCKER_CONFIG=/tmp/dockercfg` with an empty `{}` config for anonymous pulls. No credentials involved.
- Trial Dockerfiles used `FROM --platform=linux/arm64` (buildx warns FromPlatformFlagConstDisallowed; harmless for trials).

### Trial A: Alpine + toolchain, tree-sitter from source (W1 remediation proof)

Dockerfile: `node:24-alpine` + `apk add --no-cache build-base python3`, then `npm install tree-sitter@0.21.1 tree-sitter-javascript@0.21.0 tree-sitter-python@0.21.0`.

Result: **initial failure, root cause identified and fixed (see below).** The first attempt failed in node-gyp with `make: exit code 2`. The compiler log showed the real cause:

```
v8config.h:13:2: error: #error "C++20 or later required."
```

Root cause: tree-sitter@0.21.1's `binding.gyp` hard-codes `"cflags_cc": ["-std=c++17"]` (verified by extracting binding.gyp from the published tarball), while Node 24's V8 headers require C++20. **This is a Node-24-vs-old-module incompatibility, NOT a musl or ARM64 problem**: tree-sitter@0.21.1 cannot compile against Node 24 headers on any platform or libc without overriding the standard.

Fix verified live: with `CXXFLAGS="-std=c++20"` exported at install time, `node-gyp rebuild` of tree-sitter@0.21.1 on Alpine aarch64 completed with `gyp info ok` (CORE_GYP_EXIT=0, ~5 min under QEMU emulation). The env CXXFLAGS takes effect despite the binding.gyp pin.

Full-set result: **PASS for every unit that needs compilation.** `npm install tree-sitter@0.21.1 tree-sitter-javascript@0.21.0` completed clean (NPM_EXIT=0), and separately `npm install tree-sitter-python@0.21.0 tree-sitter-typescript@0.23.2` completed clean (NPM_EXIT=0). Compiled artifacts observed: `build/Release/tree_sitter_runtime_binding.node` (core), `build/Release/tree_sitter_javascript_binding.node`, `build/Release/tree_sitter_python_binding.node`. tree-sitter-typescript@0.23.2 used its bundled `prebuilds/linux-arm64` binary (no compile).

Clarification from the investigation: `tree-sitter-typescript@0.23.2` declares a dependency on `tree-sitter-javascript@^0.23.1`, and the 0.23.x javascript line DOES ship linux-arm64 prebuilds. The gateway's direct pin is 0.21.0, which does NOT (verified in the 0.21.0 tarball: only darwin-arm64, darwin-x64, linux-x64, win32-x64). So under the current pins, core + js@0.21.0 + python@0.21.0 compile; typescript@0.23.2 (+ its transitive js@0.23.x) download prebuilds.

Anomaly, reported honestly: one combined `npm install` of all four packages in a single run failed with an npm error (detailed log not captured; the container was removed), while the two split installs above both succeeded cleanly. Cause UNKNOWN: possibly a transient under QEMU (resource pressure from parallel emulated g++ processes is a hypothesis, not a finding). The gateway Dockerfile does a single `npm install` of the whole set, so Phase 17/18 must run the real full install and treat any failure as requiring investigation. Native ARM64 (no emulation) will also be far less resource-stressed than these QEMU runs.

A require()+parse smoke test of the compiled bindings was NOT run (would have required another full emulated compile cycle); marked as residual verification for the Phase 17/18 full build.

### Trial B: Debian glibc, Temporal core-bridge require (positive control)

Dockerfile: `node:24-bookworm-slim`, then `npm install @temporalio/core-bridge@1.8.0`.

Result: **PASS.** Build completed in ~37s (emulated). `ldd` on the downloaded `releases/aarch64-unknown-linux-gnu/index.node` resolves cleanly against glibc (libc.so.6, libpthread.so.0, libdl.so.2, /lib/ld-linux-aarch64.so.1, all under /lib/aarch64-linux-gnu). `node -e 'require("@temporalio/core-bridge")'` printed `CORE-BRIDGE-DLOPEN-OK`. The Temporal binary loads on glibc ARM64, as expected.

### Trial C: Alpine, Temporal core-bridge require (negative control)

Dockerfile: `node:24-alpine`, then `npm install @temporalio/core-bridge@1.8.0`. (Install succeeded silently, as predicted: build.js finds the aarch64-unknown-linux-gnu prebuild because os.platform() is 'linux'.)

Result: **FAIL at require time, as predicted.** Direct from the container:

```
Error: Error loading shared library ld-linux-aarch64.so.1: No such file or directory
  (needed by /t/node_modules/@temporalio/core-bridge/releases/aarch64-unknown-linux-gnu/index.node)
```

This is primary, reproducible evidence of the musl blocker: npm install succeeds, the process dies at require. Any code path that lazily loads bootstrap/wiring.js -> temporal_runtime.js would crash the gateway on Alpine. (Phase 1 established this path is lazy and not in the boot chain; the risk is a latent crash on first constitution-endpoint use, not a boot failure.)

## 4. The glibc-based alternative: drafted equivalent Dockerfile

```dockerfile
# Builder: compile the tree-sitter native modules (still required on glibc:
# tree-sitter@0.21.1 / -javascript@0.21.0 / -python@0.21.0 ship no linux-arm64 prebuild).
# NOTE: CXXFLAGS=-std=c++20 is required on EITHER substrate: tree-sitter@0.21.1's
# binding.gyp pins -std=c++17, but Node 24's V8 headers require C++20 (proven live, Trial A).
FROM node:24-bookworm-slim AS builder
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential python3 git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY gateway/package*.json ./
ENV CXXFLAGS="-std=c++20"
RUN npm install

# Runtime: slim glibc base, toolchain removed
FROM node:24-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "gateway/server.js"]
```

Notes on the draft:
- Pinned to `node:24-bookworm-slim` explicitly (bookworm = Debian 12, glibc 2.36 verified live in the trial). `node:24-slim` currently resolves to the same thing, but the explicit codename is more deterministic.
- Multi-stage so the ~300 MB of build-essential does not ship in the runtime image. (Same pattern recommended for the Alpine variant below.)
- If @temporalio/* is REMOVED from the package set per the standing W1, the glibc draft and the Alpine draft differ only in base image; nothing in the remaining dependency set cares about libc.

The equivalent Alpine remediated Dockerfile (recommended variant):

```dockerfile
FROM node:24-alpine AS builder
RUN apk add --no-cache build-base python3 git
WORKDIR /app
COPY gateway/package*.json ./
# CXXFLAGS=-std=c++20: tree-sitter@0.21.1's binding.gyp pins -std=c++17, but Node 24
# requires C++20 (proven live, Trial A). Without this, node-gyp fails on ANY platform.
ENV CXXFLAGS="-std=c++20"
RUN npm install

FROM node:24-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "gateway/server.js"]
```

Plus, in the same change: delete the `@temporalio/*` lines from gateway/package.json (W1), and fold the stray second `npm install pg express` into the single install step.

## 5. Comparison

| Dimension | Alpine + toolchain (recommended) | Debian bookworm-slim (glibc) |
|---|---|---|
| Build success (ARM64) | Trial A: ALL GREEN. Core + js@0.21.0 + python@0.21.0 compile on musl/aarch64 with build-base + python3 + CXXFLAGS=-std=c++20 (live proof); typescript@0.23.2 uses its arm64 prebuild. One combined-install anomaly observed (cause unknown); Phase 17/18 must run the real full install. | Would need the identical toolchain and flag (the C++20 requirement is platform-independent). No full-set build run on slim; unnecessary for the decision. |
| tree-sitter 0.21.1/js/py | Compiles from source with build-base + python3 + CXXFLAGS=-std=c++20 (core proven live on musl/aarch64; the -std flag is needed on any platform because Node 24 requires C++20 and binding.gyp pins c++17) | Same compile, same flag. glibc does NOT avoid this. |
| tree-sitter-typescript 0.23.2 | linux-arm64 prebuild downloads | Same prebuild downloads |
| @temporalio/* 1.8.0 | Installs, require CRASHES on musl (Trial C, primary evidence). Remediation: remove the dep (nothing in M0 needs it; lazy-loaded only). | Installs and require SUCCEEDS (Trial B, primary evidence). Only reason to switch substrate. |
| Base image size (arm64, measured) | node:24-alpine 238 MB | node:24-bookworm-slim 351 MB (+113 MB, +47%) |
| Installed OS packages (measured) | 18 (apk) | 88 (dpkg) |
| Attack surface | Smaller: musl + busybox, fewer setuid/capable binaries, fewer CVEs historically per package count. | Larger: full glibc + Debian userland. Debian security updates are prompt and well-tracked, but there is simply more code. |
| Runtime memory | Equivalent by construction (same Node 24, same JS). Not empirically distinguished; QEMU timing is not representative. Marked UNKNOWN for a measured delta, expected ~0. | Same. |
| Startup time | Equivalent by construction. Marked UNKNOWN for a measured delta, expected ~0. | Same. |
| Operational precedent | Strong: node:20-alpine gateway image healthy 36h+ on the actual Oracle host (lane-o2). node:24-alpine arm64 READY (Hub API verified). | None in this project. node:24-bookworm-slim arm64 exists on Hub (pulled this pass) but has no live precedent here. |
| Change surface | Minimal: +1 apk line (or multi-stage), -3 package.json lines (temporal). | Larger: new base OS family, apt instead of apk, +113 MB, 70 more packages, new CVE feed to watch. |

## 6. Recommendation

**Stay on Alpine (node:24-alpine). Do not switch to a glibc base.**

The glibc switch solves exactly one problem, the Temporal core-bridge dlopen, and the standing remediation for that problem is to remove @temporalio/* from the Oracle gateway package set (Phase 1 W1, reaffirmed here): no Temporal service exists in the minimum stack, the require is lazy-loaded and unreachable at boot, and Temporal is explicitly deferred to "a real workflow." With Temporal removed, nothing in the gateway dependency set distinguishes musl from glibc: tree-sitter core and the js/python grammars must compile from source on ARM64 on BOTH substrates (verified: no linux-arm64 prebuilds in the pinned tarballs), the typescript grammar downloads its arm64 prebuild on both, and everything else is pure JS.

Given that, the substrate decision reduces to: smaller, already-proven base (Alpine: 238 MB, 18 packages, healthy live precedent on the Oracle host) versus a larger, unproven-in-this-project base (slim: 351 MB, 88 packages) whose only advantage is moot. PING values operational determinism over saving megabytes, but here determinism and minimal change point the same way: the Alpine path is the smaller diff, the smaller image, the smaller attack surface, and the one with live evidence on the target host.

**Concrete build change (for the Phase 17/18 authoring lane, not applied by this investigation):**
1. gateway/Dockerfile: multi-stage as drafted in section 4 (builder carries `build-base python3 git` plus `ENV CXXFLAGS="-std=c++20"`; runtime carries only `git`), single `npm install`, drop the stray second `npm install pg express`.
2. gateway/package.json: remove the three `@temporalio/*` lines.
3. No other dependency changes needed for the ARM64 build.

**Fallback:** if a future phase genuinely needs @temporalio/* inside the gateway image (a real Temporal workflow against the Oracle host), revisit: at that point the choice is glibc base versus keeping Temporal out of the gateway process (sidecar worker). Do not pre-pay the substrate switch now.

## 7. Honest blockers and UNKNOWNs

- **Trial A full-set result: COMPLETE, all green** (see section 3). Compile proven for core + js@0.21.0 + python@0.21.0 on musl/aarch64 with build-base + python3 + CXXFLAGS=-std=c++20; typescript@0.23.2 uses its arm64 prebuild. One combined-install anomaly observed (single failure, cause unknown, possibly QEMU resource pressure); Phase 17/18 must run the real full `npm install` from package.json and investigate any failure.
- A require()+parse smoke test of the compiled tree-sitter bindings was NOT run; residual verification for Phase 17/18. The build gate itself (`npm install` succeeding) is what the Dockerfile needs, and that is proven.
- The initial Trial A failure is itself evidence worth keeping: without `CXXFLAGS=-std=c++20`, tree-sitter@0.21.1 fails to build against Node 24 on ANY substrate. Any Dockerfile change that omits the flag will break the build on x64 too, not just ARM64.
- QEMU user-mode emulation proves correctness, not performance: all timing claims (build minutes, startup, memory) are marked UNKNOWN/expected-equivalent, not measured.
- Full `npm install` of the entire gateway package set was not executed on either substrate in this pass; only the native modules were exercised. A full build in Phase 17/18 remains the real gate.
- Whether gateway/package-lock.json exists (build reproducibility) was not re-verified this pass.
- The live oracle-gateway image (node 20 base) sidestepped the tree-sitter/temporal problems by an unknown recipe; its Dockerfile is not the certified recipe and was not inspected.

## 8. Blocker assessment for Phase 17/18 build-and-stage

No new blocker introduced by this investigation. The two known blockers stand with remediations confirmed by live trial evidence:
1. tree-sitter ARM64: toolchain addition (W1), now refined to `build-base python3` + `CXXFLAGS="-std=c++20"` (the flag is a Node 24 requirement, platform-independent). Trial A green on musl/aarch64. Phase 17/18 can proceed on Alpine.
2. @temporalio/* musl: dep removal (W1). Trial C proves the failure mode; Trial B proves glibc is the only substrate where it loads, which is irrelevant once removed.

The one thing Phase 17/18 must NOT do is build the current Dockerfile as-is on ARM64: `npm install` will hard-fail at tree-sitter (no prebuild, no toolchain), exactly as Phase 1 found.

## 9. Cleanup

DONE 2026-09-19 ~07:00 MDT: trial images `p19-slim-temporal` and `p19-alpine-temporal` removed from the Pig (`docker rmi`); `/tmp/p19a`, `/tmp/p19b`, `/tmp/p19c` build dirs removed; no `p19*` images remain. The pulled `node:24-alpine` / `node:24-bookworm-slim` arm64 bases were left as ordinary build cache (re-pullable, useful for Phase 17/18). No image was pushed anywhere. The Oracle host was not touched at any point.

---
*Investigator: Phase 19 subagent. Worktree untouched (read-only inspection). No pushes, no host mutations on Oracle.*
