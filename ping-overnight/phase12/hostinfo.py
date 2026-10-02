import socket
for h in ["postgres", "localhost", "ping-postgres"]:
    try:
        print(h, "->", socket.gethostbyname(h))
    except Exception as e:
        print(h, "FAILED", e)
print(open("/etc/hosts").read()[:2000])
