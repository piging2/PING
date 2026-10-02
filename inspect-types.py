import subprocess
src = '/home/nolan/projects/ping/src/lib/ping/types.ts'
r = subprocess.run(['grep', '-n', 'provenance', src], capture_output=True, text=True)
print(r.stdout)
r2 = subprocess.run(['sed', '-n', '1,120p', src], capture_output=True, text=True)
print(r2.stdout)
print('==== head of renderer.tsx ====')
r3 = subprocess.run(['sed', '-n', '1,60p', '/home/nolan/projects/ping/src/fyd/components/renderer.tsx'], capture_output=True, text=True)
print(r3.stdout)
