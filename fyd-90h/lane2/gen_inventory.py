import re, os
D = os.path.expanduser('~/workspace/fyd-90h/lane2')
raw = open(D+'/raw-inventory.txt').read().splitlines()
bs = open(D+'/branchstate.txt').read().splitlines()

branchinfo = {}
for ln in bs:
    m = re.match(r'^(\S.*?) \| merged=(\w) \| ahead_main=(\S+) \| last_commit=(\S+)', ln)
    if m: branchinfo[m.group(1)] = dict(merged=m.group(2), ahead=m.group(3), last=m.group(4))

wts = []
cur = {}
for ln in raw:
    p = ln.split('\t')
    if p[0]=='WTREC':
        cur = dict(path=p[1], branch=p[2], head=p[3], headd=p[4],
                   mod=p[5].replace('MOD=',''), untr=p[6].replace('UNTR=',''), uq=p[7].replace('UQVSMAIN=',''),
                   modf='', untrf='')
        wts.append(cur)
    elif p[0]=='MODFILES' and cur and cur['path']==p[1]: cur['modf']=p[2]
    elif p[0]=='UNTRFILES' and cur and cur['path']==p[1]: cur['untrf']=p[2]

detached = {
 '/home/nolan/build-edge-proof': ('e474c89b','2026-09-24|fyd-g4: capability propagation through the authority; no view-layer role table'),
 '/home/nolan/build-purehead': ('e474c89b','2026-09-24|fyd-g4: capability propagation through the authority; no view-layer role table'),
 '/home/nolan/projects/ping-deploy-head': ('0dec40f5','2026-09-22|FYD-001: update hero badge assertions for honest claim labels'),
 '/home/nolan/projects/ping-wave1-build': ('e48ef710','2026-09-23|FYD Wave 1 fixup: current product UI implementation + ask test alignment'),
 '/home/nolan/projects/ping-wave1-check': ('e48ef710','2026-09-23|FYD Wave 1 fixup: current product UI implementation + ask test alignment'),
 '/home/nolan/projects/ping-wave2-ownerloop': ('3235804d','2026-09-29|W2 owner-loop: approve->regen chain + adversarial + last-good proof'),
 '/home/nolan/tenanos-c1-tree': ('51d4a187','2026-09-24|tenanos-wave: integrate P-20260923-101 (run reconciler)'),
 '/tmp/w4-audit-ping': ('f877c391','2026-09-28|trackc: 16 tests for the staged SitePatch pipeline'),
}
servers = {
 '/home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel': 'next start :3213 (editorial-preview)',
 '/home/nolan/projects/ping-wave2-ownerloop': 'next dev :3214',
 '/home/nolan/projects/ping-ws4-converge': 'next dev :3215',
 '/home/nolan/projects/ping-fyd-converged': 'next start :3100 SERVED RUNTIME',
}
removed = {'/home/nolan/build-edge-proof','/home/nolan/build-purehead','/home/nolan/projects/ping-wave1-build','/home/nolan/projects/ping-wave1-check'}

def purpose(branch):
    b = branch
    table = {
      'fyd/builder-harvest-trackc-2026-09-28': 'Writer-B harvest track C fix (owner-asserted provenance lane)',
      'fyd/convergence-2026-09-28': 'convergence integration branch (sibling of served)',
      'copper-v2-serve': 'copper v2 serve experiment',
    }
    if b in table: return table[b]
    for pre, desc in [
      ('copilot/','Copilot worker lane'),('design/','design-sprint lane'),
      ('fyd-frontier-','FYD frontier experiment'),('fyd/','FYD builder lane'),
      ('l1-acq/','Lane-1 acquisition lane'),('lane/','named lane'),
      ('tenanos-wave/','TenantOS wave task'),('worker','worker lane'),
      ('ws2/','wave-2 integration'),('wip/wave4-ledger-20260929/','wave4 ledger-sweep WIP'),
      ('ask-loop/','ask-loop lane'),('codex/','codex review lane'),
      ('decision-fabric/','decision-fabric lane'),('goose/','security research lane'),
      ('hardening/','hardening lane'),('harvest/','harvest lane'),
      ('phase1/','phase-1 approval lane'),('push/','push/pass lane'),
    ]:
        if b.startswith(pre): return desc + ': ' + b
    return 'UNKNOWN-PURPOSE: ' + b

def owner(branch):
    b = branch
    if b.startswith('workerB'): return 'workerB'
    if b.startswith('workerE'): return 'workerE'
    if b.startswith('workerF'): return 'workerF'
    if b.startswith('workerH'): return 'workerH'
    if b.startswith('copilot/'): return 'copilot-worker'
    if b.startswith('codex/'): return 'codex'
    if b.startswith('goose/'): return 'goose'
    if b.startswith('wip/wave4-ledger'): return 'wave4-ledger-sweep'
    if b.startswith('tenanos-wave/'): return 'tenanos-wave'
    if b.startswith('l1-acq/'): return 'lane-1'
    if b.startswith('lane/'): return 'lane-owner'
    if b.startswith('design/'): return 'design-sprint'
    if b.startswith('fyd/'): return 'fyd-builder-lane'
    if b.startswith('fyd-frontier-'): return 'fyd-frontier'
    return 'UNKNOWN-OWNER'

out = []
out.append('# Worktree / Dirty-Tree Inventory — 2026-09-29 (Lane 2 sweep, interval 1)')
out.append('')
out.append('Repo: /home/nolan/projects/ping. Generated from `git worktree list`, `git status --porcelain`,')
out.append('branch merge-state vs main, and live-process cwd scan. MODIFIED tracked files: 0 across ALL worktrees.')
out.append('All remaining dirt is untracked: 5x `.next` build-backup dirs (DELETED this interval, ~1.5GB) and')
out.append('35x `node_modules` dirs (classified GENERATED-DISPOSABLE, left in place: running dev servers + Lane-1 concurrency).')
out.append('')
out.append('Dispositions this interval:')
out.append('- PROVEN-DISPOSABLE deleted: 5 `.next` backup dirs (explicit rm -rf, BUILD_ID-verified, no process attached).')
out.append('- SAFE-REMOVE-WORKTREE executed: 4 duplicate detached checkouts (build-edge-proof, build-purehead,')
out.append('  ping-wave1-build, ping-wave1-check) — clean, HEADs contained in many branches, no recent activity, no servers.')
out.append('- Commits: none required (zero modified/staged tracked files anywhere; no unique untracked implementation).')
out.append('- BLOCKED-COLLISION: /home/nolan/worktrees/copper-v2 (.git gitdir points outside this repo).')
out.append('- Convergence note: fyd/builder-harvest-trackc-2026-09-28 (this repo) and fyd/convergence-2026-09-28')
out.append('  (ping-fyd-converged, served root) carry the identical Writer-B fix — convergence recorded, NOT executed unilaterally.')
out.append('')
hdr = '| # | WORKTREE | BRANCH | HEAD | HEAD-DATE/SUBJECT | DIRTY? | UNTRACKED? | OWNER | PURPOSE | UNIQUE(ahead main) | MERGED? | ACTIVE-SERVER? | SECRET-RISK | REACHED? | HARVESTABLE? | DISPOSITION |'
out.append(hdr); out.append('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
n=0
for w in wts:
    n+=1
    bi = branchinfo.get(w['branch'], dict(merged='?', ahead=w['uq'], last='?'))
    dirty = 'YES' if (int(w['mod'])>0 or int(w['untr'])>0) else 'no'
    untr = w['untrf'].replace(';','; ')[:60] if w['untrf'].strip() else 'none'
    if w['path'] in removed:
        disp='SAFE-REMOVE-WORKTREE (executed this interval)'
    elif w['path']=='/home/nolan/worktrees/copper-v2':
        disp='BLOCKED-COLLISION (gitdir mismatch, do not touch)'
    elif w['path'] in servers or w['path']=='/home/nolan/projects/ping':
        disp='KEEP-ACTIVE'
    elif w['path'] in detached:
        disp='KEEP-ACTIVE (detached; see notes)' if w['path'] in ('/home/nolan/projects/ping-wave2-ownerloop','/tmp/w4-audit-ping','/home/nolan/tenanos-c1-tree','/home/nolan/projects/ping-deploy-head') else 'STRANDED (carried)'
    else:
        disp='STRANDED (carried)'
    srv = servers.get(w['path'],'no')
    harv = 'CANDIDATE' if (bi['ahead'] not in ('?') and bi['ahead'].isdigit() and int(bi['ahead'])<=2 and bi['last']>='2026-09-28') else 'review'
    if w['path']=='/home/nolan/projects/ping-fyd-converged': harv='N/A (served root)'
    subj = w['headd'].replace('|',' — ')[:70]
    out.append('| %d | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | none found | UNKNOWN (tip object present in served clone; serving unproven) | %s | %s |' % (
      n, w['path'], w['branch'], w['head'], subj, dirty, untr, owner(w['branch']), purpose(w['branch']),
      bi['ahead'], bi['merged'], srv, harv, disp))
out.append('')
out.append('## Detached-HEAD worktrees (no branch)')
for p,(h,d) in detached.items():
    status = 'REMOVED this interval' if p in removed else ('KEEP-ACTIVE: running next dev :3214' if p=='/home/nolan/projects/ping-wave2-ownerloop' else 'carried')
    out.append('- %s @ %s (%s) — %s' % (p, h, d.replace('|',' — ')[:80], status))
out.append('')
out.append('## Classification of all dirty/untracked material found')
out.append('- ACTIVE-WIP: none (zero modified tracked files).')
out.append('- REFERENCE: none untracked.')
out.append('- HISTORICAL-SUPERSEDED: none untracked.')
out.append('- GENERATED-DISPOSABLE: 5x .next backup dirs (deleted, proven: BUILD_ID present, regenerated by `next build`, renamed stale copies, no process attached); 35x node_modules dirs (classified, left in place — reproducibility evidence: zero modified tracked files so package.json/lockfiles are committed state and `npm ci` reproduces; deletion deferred because `next dev` servers run in ping-ws4-converge and ping-wave2-ownerloop and Lane 1 is concurrent).')
out.append('- COLLISION-UNKNOWN: /home/nolan/worktrees/copper-v2 (gitdir points to /home/nolan/workspace/.git/worktrees/copper-v2, outside this repo; listed by `git worktree list` as [copper-v2-serve]@c03bc145). DO NOT MODIFY.')
open(D+'/worktree-inventory-20260929.md','w').write('\n'.join(out)+'\n')
print('wrote', len(wts), 'worktree rows')
