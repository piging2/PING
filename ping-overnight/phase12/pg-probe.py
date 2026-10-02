import psycopg2, socket, os
pw = os.environ.get("DB_PASSWORD") or os.environ.get("POSTGRES_PASSWORD") or ""
print("postgres resolves to:", socket.gethostbyname("postgres"))
c = psycopg2.connect(host="postgres", port=5432, dbname="crx_runtime", user="ping", password=pw)
cur = c.cursor()
cur.execute("SELECT current_database(), inet_server_addr(), version()")
print(cur.fetchone())
cur.execute("SELECT count(*) FROM pg_tables WHERE tablename = 'playbook_revisions'")
print("playbook_revisions tables:", cur.fetchone())
cur.execute("SELECT status, version, human_gate_state, decided_by FROM playbook_revisions WHERE revision_id = '194a2b85bde957ed'")
print("guard row:", cur.fetchone())
c.close()
