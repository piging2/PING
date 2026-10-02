import subprocess
r = subprocess.run(['grep', '-rn', 'ObjectAffordance', '/home/nolan/projects/ping/src', '--include=*.tsx'], capture_output=True, text=True)
print(r.stdout)
print('---- WhyThis mentions ----')
r2 = subprocess.run(['grep', '-rni', 'whythis', '/home/nolan/projects/ping/src', '--include=*.tsx', '--include=*.ts'], capture_output=True, text=True)
print(r2.stdout)
