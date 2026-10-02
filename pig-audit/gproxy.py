#!/usr/bin/env python3
"""SSH ProxyCommand: CONNECT tunnel through the hatch egress proxy with auth."""
import base64, os, socket, sys, threading, urllib.parse

def main():
    host, port = sys.argv[1], int(sys.argv[2])
    p = urllib.parse.urlparse(os.environ["HTTPS_PROXY"])
    s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    s.settimeout(45)
    s.connect((p.hostname, 3130, 0, 0))
    auth = base64.b64encode(f"{p.username}:{p.password}".encode()).decode()
    s.sendall(f"CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n"
              f"Proxy-Authorization: Basic {auth}\r\n\r\n".encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            sys.stderr.write("proxy: connection closed\n"); sys.exit(1)
        buf += chunk
    status = buf.split(b"\r\n", 1)[0].decode(errors="replace")
    if " 200 " not in status:
        sys.stderr.write(f"proxy: {status}\n"); sys.exit(1)

    stop = threading.Event()
    def up():
        try:
            while not stop.is_set():
                d = os.read(0, 65536)
                if not d:
                    break
                s.sendall(d)
        except Exception:
            pass
        finally:
            stop.set()
            try: s.shutdown(socket.SHUT_WR)
            except Exception: pass
    def down():
        try:
            while not stop.is_set():
                d = s.recv(65536)
                if not d:
                    break
                os.write(1, d)
        except Exception:
            pass
        finally:
            stop.set()
            try: os.close(0)
            except Exception: pass
    t = threading.Thread(target=up); t.start()
    down(); t.join(timeout=5)

main()
