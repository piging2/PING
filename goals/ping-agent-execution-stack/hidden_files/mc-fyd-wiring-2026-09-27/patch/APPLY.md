# APPLY.md — Pig-side apply procedure (QUEUED on transport recovery)

**Do not run until:** (1) Pig SSH transport is healthy, (2) the 19:00 MDT adjudication verdict is in OR Nolan gives explicit word. The :3200 served tree stays frozen until then.

## Preconditions (read-only checks)

```powershell
# 1. Worktree map — confirm :3100/:3200 layout
git -C /home/nolan/projects/ping worktree list
# 2. Does the design branch contain the dispatch plane? (decides Case A vs B)
git -C /home/nolan/projects/ping ls-tree -r design/sprint-visual-v1 --name-only | grep "src/app/api/mc/"
git -C /home/nolan/projects/ping ls-tree -r design/sprint-visual-v1 --name-only | grep "src/app/mission-control/page"
```

- **Case A** (routes present): the new pages call same-origin; no env needed.
- **Case B** (routes absent): set `NEXT_PUBLIC_MC_API_BASE` to the :3100 origin at build time; the component code path is identical.

## Apply

```powershell
# 3. Wiring branch from the design integration tip — NEVER from/into the :3200 worktree
cd /home/nolan/projects/ping
git fetch origin
git checkout -b design/mc-fyd-wiring-2026-09-27 origin/design/sprint-visual-v1  # or the integration tip Nolan names
# 4. Copy the patch tree in (4 new files, 0 modifications to existing files)
#    from the sandbox: ~/workspace/goals/ping-agent-execution-stack/hidden_files/mc-fyd-wiring-2026-09-27/patch/
#    -> src/app/sites/_shared/mc-api.ts
#    -> src/app/sites/_shared/tenant-mission-control.tsx
#    -> src/app/sites/happy-place/mission-control/page.tsx
#    -> src/app/sites/coppersmith-plumbing/mission-control/page.tsx
# 5. Verify the diff is additive-only
git status --short   # must show exactly 4 new files, no modifications
```

## Verify (no serve changes)

```powershell
# 6. Typecheck + build to a separate output; do NOT restart :3200
npx tsc --noEmit
npm run build
# 7. Byte-verify the live MC catalog before declaring the UI wired (adapter registry may differ Pig-side)
curl -s http://127.0.0.1:3100/api/mc/dispatch | head -c 600
# 8. Serve the new routes on an EPHEMERAL port only and fetch the HTML; confirm:
#    - tenant badge renders the fixed SITE_ID, no tenant input exists in the HTML
#    - catalog-driven agent options (no hardcoded list)
#    - no changes to /sites/happy-place or /sites/coppersmith-plumbing bytes
```

## After 19:00 GO / Nolan's word

- Propose the wiring branch for merge into the design integration line (parent's call).
- Link placement (owner experience vs trust lab vs operator-known URL) per Nolan's Pig-side guidance.
- Curated mission templates per tenant, Hermes scope decision, and any Pig-side deployment beyond the branch are separate decisions — not this lane's.
