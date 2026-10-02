import subprocess, base64, sys, re
def pig_ps(script, timeout=90):
    enc = base64.b64encode(script.encode('utf-16-le')).decode()
    r = subprocess.run(['/home/hatch/workspace/bin/pig', 'powershell', '-NoProfile', '-EncodedCommand', enc], capture_output=True, timeout=timeout)
    out = r.stdout.decode('utf-8', errors='replace')
    out = re.sub(r'<[^>]{0,200}>', '', out)
    return out
if __name__ == '__main__':
    print(pig_ps(sys.stdin.read()))
