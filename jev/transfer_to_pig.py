"""Chunked base64 transfer to the Pig with md5 verification.

Usage: python3 transfer_to_pig.py <local_path> <remote_path>
Follows AGENTS.md: python-based chunking at 2000 chars, md5 verified per transfer.
"""
import base64
import hashlib
import subprocess
import sys

BRIDGE = '/home/hatch/workspace/pig/pigwsl-run.sh'


def run(cmd):
    return subprocess.run([BRIDGE, cmd], stdin=subprocess.DEVNULL,
                          capture_output=True, text=True, timeout=180)


def main():
    local_path, remote_path = sys.argv[1], sys.argv[2]
    data = open(local_path, 'rb').read()
    b64 = base64.b64encode(data).decode()
    r = run('rm -f %s.b64 && touch %s.b64' % (remote_path, remote_path))
    assert r.returncode == 0, r.stderr
    for i in range(0, len(b64), 2000):
        chunk = b64[i:i + 2000]
        r = run("printf '%%s' '%s' >> %s.b64" % (chunk, remote_path))
        assert r.returncode == 0, 'chunk %d failed: %s %s' % (i, r.stderr, r.stdout)
    decode_py = ("import base64,hashlib;"
                 "d=base64.b64decode(open('%s.b64').read());"
                 "open('%s','wb').write(d);"
                 "print(hashlib.md5(d).hexdigest())") % (remote_path, remote_path)
    r = run('python3 -c "%s"' % decode_py)
    remote_md5 = r.stdout.strip().split()[-1]
    local_md5 = hashlib.md5(data).hexdigest()
    print('local=%s remote=%s match=%s chunks=%d' % (
        local_md5, remote_md5, local_md5 == remote_md5,
        (len(b64) + 1999) // 2000))
    assert local_md5 == remote_md5, 'MD5 MISMATCH — transfer failed'


if __name__ == '__main__':
    main()
