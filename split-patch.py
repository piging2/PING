import subprocess, re

diff = subprocess.run(
    ['git', '-C', '/home/nolan/projects/ping', 'diff', 'src/fyd/components/renderer.tsx'],
    capture_output=True, text=True).stdout

lines = diff.split('\n')
header = []
hunks = []
cur = None
for ln in lines:
    if ln.startswith('@@'):
        cur = [ln]
        hunks.append(cur)
    elif cur is None:
        header.append(ln)
    else:
        cur.append(ln)

mine = [h for h in hunks if any(
    l.startswith('+') and ('whyThisStepsFor' in l or 'WhyThis claim={title}' in l)
    for l in h)]
print('total hunks:', len(hunks), 'mine:', len(mine))
out = '\n'.join(header + [l for h in mine for l in h])
open('/tmp/whythis-renderer-auto.patch', 'w').write(out + '\n')
print('wrote', len(out), 'bytes')
