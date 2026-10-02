const { Pool } = require("/home/nolan/ping/gateway/node_modules/pg");
const { PingProjector } = require("/tmp/ping-proj-dist/ping-projector.js");
const { execSync } = require("node:child_process");
const PGPW = execSync(
  "docker inspect ping-test-pg --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^POSTGRES_PASSWORD=' | cut -d= -f2-",
).toString().trim();
(async () => {
  const pool = new Pool({
    host: "127.0.0.1",
    port: 55433,
    database: "ping-fyd-demo",
    user: "postgres",
    password: PGPW,
  });
  const proj = new PingProjector({ db: pool });
  const counts = await proj.rebuildAll();
  console.log("rebuildAll OK:", JSON.stringify(counts));
  const r = await pool.query(
    "SELECT relationship_id, subject, predicate, object, status FROM ping_relationships WHERE predicate=$1",
    ["follows"],
  );
  console.log(
    "follows rows:",
    JSON.stringify(
      r.rows.map((x) => ({ ...x, subject: x.subject.slice(-8), object: x.object.slice(-8) })),
    ),
  );
  await pool.end();
})().catch((e) => {
  console.error("PROJECTOR-FAILED:", e.message);
  process.exit(1);
});
