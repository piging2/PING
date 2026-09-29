#!/usr/bin/env python3
"""Emit a PING gateway event for a Meta AI research observation.

Usage: emit-observation.py <brief_id> <observation_text> [aggregate_id] [--force]
       emit-observation.py --drill <brief_id> <observation_text> [--drill-namespace <ns>]
       emit-observation.py --fetch-event <event_id>

Resolves the Bearer token from the gateway container env at runtime (never
stored), POSTs {event_type, aggregate_id, aggregate_type, event_data} to
http://127.0.0.1:8080/events on the Pig via SSH. Prints the event_id or an
error.

Exit codes: 0 = emitted and acknowledged; 2 = refused by a gate (unverified,
duplicate, wrong domain, bad drill input); 3 = accepted and DURABLY SPOOLED
but delivery failed (transport down): the work is safe in
tandem/event-spool.jsonl, ship it later with event-spool.py ship.

Durable spool (2026-09-27): the observation is fsync-spooled BEFORE any
network POST (ACCEPTED -> DURABLY SPOOLED), then delivered
(DELIVERY_PENDING -> DELIVERED -> ACKNOWLEDGED). Transport availability is
not work truth: a POST failure exits 3 with the payload durably spooled
instead of losing it.

Duplicate-emission guard: the sha256 of the observation text is recorded on
the sidecar's accepted_by_ping transition. A second invocation with the same
brief_id and byte-identical observation text is refused (exit 2) unless
--force is given, so a retry after an ambiguous POST outcome cannot silently
double-emit the same observation. Different observation text always emits.

Semantic-domain gate (2026-09-25 Lane G checkpoint): PING is the common
intelligence substrate, NOT a prospect/lead database. Prospect/intel
discovery briefs (a-weak-website-hunt, b-new-business-radar,
c-review-complaint-signals, ...) are prospect-store-only and are refused
with exit 2 before any POST. PING observation emission is reserved for the
outreach-engine step-7 distillation contract: brief_id learn-<sweep-id>
(generalizable campaign learnings; never prospect rows). Controlled --drill
emissions bypass the gate by design; --force does not.

Crash-boundary recovery (2026-09-14; moved to delivery time 2026-09-27): if
the process died after the gateway accepted the POST but before the sidecar
transition was written, the sidecar guard cannot see the emission. The
spooler's probe-before-POST (_find_event_in_ping, called by ship_one)
detects the orphaned event by observation hash; on a hit it acknowledges
without re-POSTing and heals the sidecar with the true event_id. If the
probe itself is unreachable, the item holds DELIVERY_PENDING and no POST
is made: UNKNOWN must reconcile before retry.

Controlled drills (2026-09-14, after the reconstructed-text drill incident):
a production observation may be replayed only from exact canonical bytes
retrieved from the durable source. --drill mode runs a preflight that
classifies TEST INPUT IDENTITY as EXACT (candidate bytes hash to a stored
canonical accepted observation hash, i.e. provably byte-identical to what
PING already accepted), ISOLATED (an explicit --drill-namespace forces the
emission onto a dedicated drill aggregate, never the production aggregate),
or ABORT (neither holds: the drill BLOCKS with exit 2 before any POST).
Reconstructed semantic equivalents are forbidden for byte-identity drills;
they hash differently and therefore always ABORT. --force is refused in
--drill mode. Use --fetch-event <event_id> to retrieve the exact canonical
observation bytes stored by PING for a drill replay. Drill outcomes are
appended to ~/workspace/tandem/drill.log.
"""
import base64, datetime, hashlib, json, os, re, subprocess, sys

META_INTEL_DIR = os.path.expanduser(
    '~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel')
LEDGER_PATH = os.path.join(META_INTEL_DIR, 'runs.jsonl')
DRILL_LOG_PATH = os.path.expanduser('~/workspace/tandem/drill.log')
DRILL_NAMESPACE_RE = re.compile(r'^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$')

# 2026-09-25 Lane G checkpoint: semantic-domain gate.
# PING is the common intelligence substrate, NOT a prospect/lead database
# (DELEGATION-ARCHITECTURE.md; MEMORY.md; PING INTELLIGENCE BOUNDARY
# 2026-09-13, Nolan's call). Prospect/intel discovery briefs
# (a-weak-website-hunt, b-new-business-radar, c-review-complaint-signals,
# d-segment-deep-dive, e-seasonal-demand-calendar, f-trade-network-scan,
# g-local-network-opportunities, h-marketing-intelligence, i-gj-weekend-scan,
# j/k-clowning, ...) are prospect-store-only: their observations belong in
# western-co-prospects.jsonl and the outreach machinery, never in PING.
# The only brief family authorized for PING observation emission is the
# outreach-engine step-7 PING distillation contract: learn-<sweep-id>
# (generalizable campaign learnings: consumer needs, failure patterns,
# market signals, campaign insights, validated relationships,
# contradictions/uncertainty; never prospect rows, never unverified claims).
# Controlled --drill emissions are isolated test artifacts and bypass this
# gate by design. --force does NOT bypass it.
PING_AUTHORIZED_BRIEF_RE = re.compile(r'^learn-[A-Za-z0-9][A-Za-z0-9_-]*$')


def _require_ping_domain(brief, drill=False):
    """Fail-closed semantic-domain gate, called before any network POST.

    Refuses (exit 2) when brief_id is not a PING-authorized acquisition
    brief. Prospect/intel discovery is prospect-store-only; PING observation
    emission is reserved for the step-7 distillation contract.
    """
    if drill:
        return
    if not PING_AUTHORIZED_BRIEF_RE.match(brief or ''):
        print(f"refusing: brief_id {brief!r} is not a PING-authorized "
              f"acquisition brief. Prospect/intel discovery is "
              f"prospect-store-only (canonical home: "
              f"western-co-prospects.jsonl); PING observation emission is "
              f"reserved for the step-7 distillation contract "
              f"(learn-<sweep-id>: generalizable campaign learnings, never "
              f"prospect rows, never unverified claims). To distill "
              f"generalizable intelligence from a discovery pass, create a "
              f"learn-<sweep-id> brief per the engine step-7 contract. "
              f"Nothing was emitted.",
              file=sys.stderr)
        sys.exit(2)


def _newest_ok_run(brief_id, ledger_path=LEDGER_PATH):
    """Newest runs.jsonl line with matching brief_id and outcome ok, or None."""
    target = None
    try:
        with open(ledger_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                if rec.get('brief_id') == brief_id and rec.get('outcome') == 'ok':
                    target = rec  # newest match wins
    except OSError:
        return None
    return target


def _find_event_in_ping(obs_hash):
    """Crash-recovery probe: find an existing ping_events row whose observation
    sha256 matches, independent of the sidecar.

    Covers the AFTER-POST / BEFORE-SIDECAR-WRITE crash boundary: if the
    process died after the gateway accepted the POST but before
    _mark_accepted() wrote the sidecar transition, the sidecar duplicate
    guard cannot see the emission and a retry would double-emit. This probe
    runs at delivery time (spooler probe-before-POST): on a hit the item
    is acknowledged without re-POSTing and the sidecar is healed with the
    true event_id.

    Returns the event_id if found, None if not found, or 'UNCHECKABLE' if
    the Pig/probe is unreachable (caller must fail closed).

    2026-09-18 fix: the old probe read credentials from ping-gateway but ran
    psql inside ping-postgres against localhost, a different store; the inner
    psql died with FATAL role "postgres" does not exist, the wrapper
    swallowed it, and the probe always returned None (never UNCHECKABLE on
    failure), defeating the crash-boundary duplicate guard. The probe now
    runs node inside ping-gateway with its own POSTGRES_* env, the same
    endpoint the gateway writes to, and any failure returns UNCHECKABLE.
    2026-09-25 fix: the pg module path is probed at runtime
    (/app/gateway/node_modules/pg first, /app/node_modules/pg fallback)
    because the rebuilt ping-gateway container moved the app to /app/gateway.
    """
    node_js = (
        "const {Client}=((()=>{let _m;try{_m=require('/app/gateway/node_modules/pg');}catch(_e){_m=require('/app/node_modules/pg');}return _m;})());\n"
        "(async()=>{\n"
        " const c=new Client({host:process.env.POSTGRES_HOST,"
        "port:parseInt(process.env.POSTGRES_PORT||'5432',10),"
        "user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,"
        "database:process.env.POSTGRES_DB,connectionTimeoutMillis:8000});\n"
        " try{await c.connect();}catch(e){console.log('PROBE_ERROR connect:'+e.message);process.exit(2);}\n"
        " try{\n"
        "  const r=await c.query(\"SELECT event_id, payload->>'observation' AS obs FROM ping_events \" +\n"
        "    \"WHERE event_type='OBSERVATION_CREATED' AND source LIKE 'api:%'\");\n"
        "  r.rows.forEach(function(x){console.log('ROW:'+x.event_id+'|'+(x.obs||''));});\n"
        " }catch(e){console.log('PROBE_ERROR query:'+e.message);process.exit(2);}\n"
        " await c.end();\n"
        "})();\n"
    )
    b64 = base64.b64encode(node_js.encode()).decode()
    ps1 = (
        "$b64 = \"" + b64 + "\"\n"
        "$tmp = \"$env:TEMP\\emit-obs-recovery-probe.js\"\n"
        "[IO.File]::WriteAllBytes($tmp, [Convert]::FromBase64String($b64))\n"
        "docker cp $tmp ping-gateway:/tmp/emit-obs-recovery-probe.js\n"
        "if ($LASTEXITCODE -ne 0) { Write-Output 'PROBE_ERROR dockercp failed'; exit 2 }\n"
        "$out = docker exec ping-gateway node /tmp/emit-obs-recovery-probe.js\n"
        "$ec = $LASTEXITCODE\n"
        "Write-Output ($out -join \"`n\")\n"
        "exit $ec\n"
    )
    local = "/tmp/emit-obs-recovery-probe.ps1"
    try:
        with open(local, "w") as f:
            f.write(ps1)
        cp = subprocess.run(
            ["bash", "-lc",
             "source ~/workspace/pig-fb/pig-ssh.sh && "
             "pig_scp %s \"muse-ssh@100.79.154.43:C:/Users/nolan/.local/share/pigi/emit-obs-recovery-probe.ps1\"" % local],
            capture_output=True, text=True, timeout=60)
        if cp.returncode != 0:
            return 'UNCHECKABLE'
        r = subprocess.run(
            ["bash", "-lc",
             "source ~/workspace/pig-fb/pig-ssh.sh && "
             "pig_ssh \"powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/nolan/.local/share/pigi/emit-obs-recovery-probe.ps1\""],
            capture_output=True, text=True, timeout=90)
        out = r.stdout or ''
        if 'PROBE_ERROR' in out or r.returncode != 0:
            return 'UNCHECKABLE'
        for line in out.strip().split('\n'):
            line = line.strip()
            if not line.startswith('ROW:') or '|' not in line:
                continue
            eid, obs = line[4:].split('|', 1)
            if not re.fullmatch(r"[0-9a-f]{64}", eid.strip()):
                continue
            if hashlib.sha256(obs.encode('utf-8')).hexdigest() == obs_hash:
                return eid.strip()
        return None
    except Exception:
        return 'UNCHECKABLE'


def _require_verified_local(brief_id, obs_hash, force=False, ledger_path=LEDGER_PATH, intel_dir=META_INTEL_DIR,
                      drill_ctx=None):
    """Fail-closed LOCAL precondition for the VERIFIED -> ACCEPTED_BY_PING sequence.

    Resolves the newest runs.jsonl line with matching brief_id and outcome ok
    (same resolution _mark_accepted uses) and refuses, before any network
    POST, unless that run's sidecar carries a 'verified' transition. Also
    refuses (unless force) when the sidecar already carries an
    accepted_by_ping transition for this exact observation text (matched by
    sha256), so a retry after an ambiguous POST outcome cannot double-emit.
    Exits 2 with a clear message on refusal; returns the sidecar path and
    the sidecar dict on success. drill_ctx, when given, is
    (brief, obs_hash, namespace, identity) and is recorded in drill.log on
    every refusal so a drill's terminal state is truthful.

    Deliberately LOCAL ONLY (no network): the remote duplicate probe
    (_find_event_in_ping) is NOT a spool precondition. A verified
    observation must be durably spooled even when the Pig is unreachable;
    duplicate reconciliation happens at delivery time via the spooler's
    probe-before-POST, where an UNCHECKABLE probe holds the item
    DELIVERY_PENDING instead of risking a duplicate POST.
    """
    def _refuse(msg, result):
        print(msg, file=sys.stderr)
        if drill_ctx:
            _drill_log(drill_ctx[0], drill_ctx[3], drill_ctx[1], drill_ctx[2],
                       result, msg.split(';')[0][:160])
        sys.exit(2)

    run = _newest_ok_run(brief_id, ledger_path)
    if not run:
        _refuse(f"refusing: no ok run for brief_id {brief_id!r} in the ledger; "
                f"nothing is verified, nothing will be emitted", 'no_ok_run')
    sidecar_name = (run.get('artifact_refs') or {}).get('sidecar')
    if not sidecar_name:
        _refuse(f"refusing: ok run for brief_id {brief_id!r} has no sidecar reference; "
                f"nothing will be emitted", 'no_sidecar')
    p = os.path.join(intel_dir, sidecar_name)
    try:
        d = json.load(open(p, encoding='utf-8'))
    except Exception as e:
        _refuse(f"refusing: cannot read sidecar {sidecar_name!r}: {e}; "
                f"nothing will be emitted", 'sidecar_unreadable')
    tr = d.get('transitions')
    # 2026-09-18: the outreach engine records its independent verification as
    # 'verified_by_outreach_engine' (rounds 76/78, documented in ingested.log);
    # the gate recognizes both vocabularies. This does not weaken the gate:
    # it still requires a genuine verification transition, never 'pending'.
    if not isinstance(tr, list) or not any(
            isinstance(t, dict) and t.get('state') in ('verified', 'verified_by_outreach_engine')
            for t in tr):
        _refuse(f"refusing: sidecar {sidecar_name!r} has no 'verified' transition; "
                f"run ~/workspace/tandem/mark-verified.sh on the answer file first. "
                f"Nothing will be emitted", 'not_verified')
    if not force:
        for t in tr:
            if (isinstance(t, dict) and t.get('state') == 'accepted_by_ping'
                    and t.get('observation_sha256')
                    and t.get('observation_sha256') == obs_hash):
                _refuse(f"refusing: this exact observation was already emitted as "
                        f"event {t.get('event_id')!r}; duplicate emission blocked "
                        f"(use --force to override)", 'duplicate_sidecar')
    return p


# Crash-boundary duplicate reconciliation lives in the spooler's
# probe-before-POST (event-spool.py _deliver_one), not in the local gate:
# _find_event_in_ping is called at delivery time, where a hit heals the
# sidecar via _mark_accepted and acknowledges without re-POSTing, and an
# UNCHECKABLE probe holds the item DELIVERY_PENDING. The local gate above
# must stay network-free so verified work can be spooled while the Pig is
# unreachable.


def _drill_log(brief, identity, obs_hash, namespace, result, note):
    """Append a truthful one-line drill record. Never raises."""
    try:
        ts = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        line = (f"{ts} brief={brief} identity={identity} "
                f"obs_sha256={obs_hash} namespace={namespace or '-'} "
                f"result={result} note={note}\n")
        with open(DRILL_LOG_PATH, 'a', encoding='utf-8') as f:
            f.write(line)
    except Exception:
        pass


def _stored_accepted_hashes(brief_id, ledger_path=LEDGER_PATH, intel_dir=META_INTEL_DIR):
    """observation_sha256 values on accepted_by_ping transitions of the newest
    ok run's sidecar for brief_id. Durable local evidence of what was
    accepted. Returns a set (possibly empty). Never raises."""
    try:
        run = _newest_ok_run(brief_id, ledger_path)
        if not run:
            return set()
        sidecar_name = (run.get('artifact_refs') or {}).get('sidecar')
        if not sidecar_name:
            return set()
        d = json.load(open(os.path.join(intel_dir, sidecar_name), encoding='utf-8'))
        out = set()
        for t in (d.get('transitions') or []):
            if (isinstance(t, dict) and t.get('state') == 'accepted_by_ping'
                    and t.get('observation_sha256')):
                out.add(t['observation_sha256'])
        return out
    except Exception:
        return set()


def _drill_preflight(brief, obs, obs_hash, namespace):
    """Classify TEST INPUT IDENTITY for a controlled drill, before any POST.

    EXACT: candidate bytes hash to a stored canonical accepted observation
    hash, either on the sidecar's accepted_by_ping transitions (durable local
    evidence) or in ping_events itself via the crash-recovery probe (durable
    PING storage). Hash equality is the proof of byte identity: reconstructed
    semantic equivalents hash differently and can never be EXACT.
    ISOLATED: an explicit --drill-namespace was given; the emission is
    forced onto a dedicated drill aggregate and never touches production.
    Otherwise ABORT: print a typed STATE=BLOCKED line, append a truthful
    drill.log record, and exit 2 before any POST.
    """
    accepted = _stored_accepted_hashes(brief)
    if obs_hash in accepted:
        _drill_log(brief, 'EXACT', obs_hash, namespace,
                   'preflight_pass', 'candidate bytes match sidecar accepted observation hash')
        return 'EXACT'
    found = _find_event_in_ping(obs_hash)
    if found and found != 'UNCHECKABLE':
        _drill_log(brief, 'EXACT', obs_hash, namespace,
                   'preflight_pass', f'candidate bytes match stored PING event {found}')
        return 'EXACT'
    if namespace:
        if not DRILL_NAMESPACE_RE.match(namespace):
            print(f"STATE=BLOCKED drill_preflight: drill namespace {namespace!r} "
                  f"is invalid (use 1-40 chars of lowercase letters, digits, hyphens). "
                  f"No POST was made.", file=sys.stderr)
            _drill_log(brief, 'ABORT', obs_hash, namespace,
                       'no_post', 'invalid drill namespace')
            sys.exit(2)
        _drill_log(brief, 'ISOLATED', obs_hash, namespace,
                   'preflight_pass', 'emission forced onto drill aggregate')
        return 'ISOLATED'
    print(f"STATE=BLOCKED drill_preflight: candidate observation bytes "
          f"(sha256 {obs_hash}) are not provably identical to any stored "
          f"canonical accepted observation for brief {brief!r}: no sidecar "
          f"accepted_by_ping hash and no ping_events row match. Reconstructed "
          f"semantic equivalents are forbidden for byte-identity drills. "
          f"Re-run with exact canonical bytes (see --fetch-event) or pass "
          f"--drill-namespace <ns> for an isolated drill. No POST was made.",
          file=sys.stderr)
    _drill_log(brief, 'ABORT', obs_hash, None,
               'no_post', 'candidate bytes not provably identical to stored canonical bytes')
    sys.exit(2)


def _fetch_canonical_observation(event_id):
    """Print the exact observation bytes PING stored for event_id, then exit 0.

    This is the drill-safe way to obtain canonical replay bytes: they come
    from the durable source, not from a reconstruction. Exit 2 on any
    failure (bad id, event not found, probe unreachable).

    2026-09-18 fix: the old probe read credentials from ping-gateway but ran
    psql inside ping-postgres against localhost, a different store; the inner
    psql died with FATAL role "postgres" does not exist and the fetch
    silently returned nothing. The probe now runs node inside ping-gateway
    with its own POSTGRES_* env, the same endpoint the gateway writes to.
    """
    if not re.fullmatch(r'[0-9a-f]{64}', event_id or ''):
        print(f"refusing: {event_id!r} is not a valid 64-hex event id",
              file=sys.stderr)
        sys.exit(2)
    node_js = (
        "const {Client}=((()=>{let _m;try{_m=require('/app/gateway/node_modules/pg');}catch(_e){_m=require('/app/node_modules/pg');}return _m;})());\n"
        "(async()=>{\n"
        " const c=new Client({host:process.env.POSTGRES_HOST,"
        "port:parseInt(process.env.POSTGRES_PORT||'5432',10),"
        "user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,"
        "database:process.env.POSTGRES_DB,connectionTimeoutMillis:8000});\n"
        " try{await c.connect();}catch(e){console.log('PROBE_ERROR connect:'+e.message);process.exit(2);}\n"
        " try{\n"
        "  const r=await c.query(\"SELECT payload->>'observation' AS obs FROM ping_events WHERE event_id=$1\",[process.argv[3]]);\n"
        "  if(r.rows.length){console.log('OBS:'+r.rows[0].obs);}else{console.log('PROBE_ERROR not found');process.exit(2);}\n"
        " }catch(e){console.log('PROBE_ERROR query:'+e.message);process.exit(2);}\n"
        " await c.end();\n"
        "})();\n"
    )
    b64 = base64.b64encode(node_js.encode()).decode()
    ps1 = (
        "$b64 = \"" + b64 + "\"\n"
        "$tmp = \"$env:TEMP\\emit-obs-fetch-event.js\"\n"
        "[IO.File]::WriteAllBytes($tmp, [Convert]::FromBase64String($b64))\n"
        "docker cp $tmp ping-gateway:/tmp/emit-obs-fetch-event.js\n"
        "if ($LASTEXITCODE -ne 0) { Write-Output 'PROBE_ERROR dockercp failed'; exit 2 }\n"
        "$out = docker exec ping-gateway node /tmp/emit-obs-fetch-event.js fetch " + event_id + "\n"
        "$ec = $LASTEXITCODE\n"
        "Write-Output ($out -join \"`n\")\n"
        "exit $ec\n"
    )
    local = "/tmp/emit-obs-fetch-event.ps1"
    try:
        with open(local, "w") as f:
            f.write(ps1)
        cp = subprocess.run(
            ["bash", "-lc",
             "source ~/workspace/pig-fb/pig-ssh.sh && "
             "pig_scp %s \"muse-ssh@100.79.154.43:C:/Users/nolan/.local/share/pigi/emit-obs-fetch-event.ps1\"" % local],
            capture_output=True, text=True, timeout=60)
        if cp.returncode != 0:
            print("refusing: cannot reach the Pig to fetch canonical bytes; "
                  "nothing was emitted", file=sys.stderr)
            sys.exit(2)
        r = subprocess.run(
            ["bash", "-lc",
             "source ~/workspace/pig-fb/pig-ssh.sh && "
             "pig_ssh \"powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/nolan/.local/share/pigi/emit-obs-fetch-event.ps1\""],
            capture_output=True, text=True, timeout=90)
        if r.returncode != 0:
            print("refusing: canonical-byte fetch failed; nothing was emitted",
                  file=sys.stderr)
            sys.exit(2)
        text = (r.stdout or '').strip('\r\n')
        if 'PROBE_ERROR' in text:
            print(f"refusing: canonical-byte fetch failed ({text[:160]}); nothing was emitted",
                  file=sys.stderr)
            sys.exit(2)
        if not text.startswith('OBS:'):
            print(f"refusing: no ping_events row for event {event_id!r}",
                  file=sys.stderr)
            sys.exit(2)
        sys.stdout.write(text[4:])
        sys.exit(0)
    except SystemExit:
        raise
    except Exception as e:
        print(f"refusing: canonical-byte fetch failed ({e}); nothing was emitted",
              file=sys.stderr)
        sys.exit(2)


def _mark_accepted(brief_id, event_id, obs_hash, ledger_path=None):
    """Record the accepted_by_ping knowledge state on the newest ok run's sidecar.

    Finds the newest runs.jsonl line with matching brief_id and outcome ok,
    appends {state:"accepted_by_ping", at, by, event_id, observation_sha256}
    to the sidecar's transitions (idempotent on event_id), and flips legacy
    ping_ingestion pending->ingested. The observation hash is what the
    duplicate-emission guard in _require_verified_local matches on. The ledger is
    never modified. Never raises.
    """
    target = _newest_ok_run(brief_id, ledger_path or LEDGER_PATH)
    if not target:
        return
    sidecar_name = (target.get('artifact_refs') or {}).get('sidecar')
    if not sidecar_name:
        return
    p = os.path.join(META_INTEL_DIR, sidecar_name)
    d = json.load(open(p, encoding='utf-8'))
    tr = d.get('transitions')
    if not isinstance(tr, list):
        tr = []
        d['transitions'] = tr
    if not any(isinstance(t, dict) and t.get('state') == 'accepted_by_ping'
               and t.get('event_id') == event_id for t in tr):
        tr.append({'state': 'accepted_by_ping',
                   'at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                   'by': 'tandem/emit-observation.py',
                   'event_id': event_id,
                   'observation_sha256': obs_hash})
    if d.get('ping_ingestion') == 'pending':
        d['ping_ingestion'] = 'ingested'
    tmp = p + '.tmp'
    json.dump(d, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    os.replace(tmp, p)


class ObservationTransportError(RuntimeError):
    """The gateway POST failed: transport down or refused. The observation
    is NOT lost (it sits durably spooled); retry via event-spool.py ship."""


def deliver_observation(body):
    """POST body to http://127.0.0.1:8080/events on the Pig via SSH.

    Returns the remote event_id. Raises ObservationTransportError when the
    transport fails, so the caller can spool-and-retry instead of losing
    the accepted work. Prints the raw gateway response (callers and logs
    read the event_id from stdout).
    """
    ps = (
        "$t = docker exec ping-gateway printenv MUSE_LEVEL_1_KEY\n"
        "$json = [Text.Encoding]::Utf8.GetString([Convert]::FromBase64String('"
        + base64.b64encode(json.dumps(body).encode()).decode() + "'))\n"
        "$wc = New-Object Net.WebClient; $wc.Proxy = $null\n"
        "$wc.Headers['Authorization'] = 'Bearer ' + $t.Trim()\n"
        "$wc.Headers['Content-Type'] = 'application/json'\n"
        "try { $wc.UploadString('http://127.0.0.1:8080/events','POST',$json) }"
        " catch { Write-Output ('POST-ERR ' + $_.Exception.Message); exit 1 }"
    )
    enc = base64.b64encode(ps.encode('utf-16-le')).decode()
    cmd = ['ssh', '-i', '/home/hatch/.ssh/id_ed25519', '-o', 'BatchMode=yes',
           '-o', 'ConnectTimeout=25', '-o', 'UserKnownHostsFile=/home/hatch/workspace/pig/known_hosts',
           '-o', 'ProxyCommand=nc -X connect -x hatch-egress-proxy:3130 %h %p',
           'muse-ssh@100.79.154.43',
           'powershell', '-NoProfile', '-EncodedCommand', enc]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    out = (r.stdout or '') + (r.stderr or '')
    print(out.strip()[:500])
    ok = r.returncode == 0 and 'POST-ERR' not in out and 'event_id' in out
    if not ok:
        raise ObservationTransportError(
            'gateway POST failed (rc=%s): %s' % (r.returncode, out.strip()[:200]))
    m = re.search(r'"event_id"\s*:\s*"([^"]+)"', out)
    if not m:
        raise ObservationTransportError(
            'gateway POST returned no event_id: %s' % out.strip()[:200])
    return m.group(1)


# Public alias: the spool's crash-recovery probe adapter.
find_event_in_ping = _find_event_in_ping


def _load_spool():
    """Load tandem/event-spool.py (dash in filename: importlib, not import)."""
    import importlib.util
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'event-spool.py')
    spec = importlib.util.spec_from_file_location('event_spool', p)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    force = False
    drill = False
    drill_namespace = None
    if '--fetch-event' in argv:
        i = argv.index('--fetch-event')
        _fetch_canonical_observation(argv[i + 1] if i + 1 < len(argv) else None)
    if '--force' in argv:
        force = True
        argv.remove('--force')
    if '--drill' in argv:
        drill = True
        argv.remove('--drill')
    if '--drill-namespace' in argv:
        i = argv.index('--drill-namespace')
        drill_namespace = argv[i + 1] if i + 1 < len(argv) else None
        del argv[i:i + 2]
    brief = argv[0] if len(argv) > 0 else 'unknown'
    obs = argv[1] if len(argv) > 1 else ''
    agg = argv[2] if len(argv) > 2 else f'meta-ai-{brief}'
    obs_hash = hashlib.sha256(obs.encode('utf-8')).hexdigest()
    identity = 'PRODUCTION'

    if drill:
        # Controlled-drill preflight, before any POST. --force is refused in
        # drill mode: a drill exists to prove the duplicate/idempotency
        # boundary, and bypassing the duplicate check would defeat it.
        if force:
            print("STATE=BLOCKED drill_preflight: --force is not permitted in "
                  "--drill mode; drills must exercise the real duplicate "
                  "guard. No POST was made.", file=sys.stderr)
            _drill_log(brief, 'ABORT', obs_hash, drill_namespace,
                       'no_post', '--force refused in drill mode')
            sys.exit(2)
        identity = _drill_preflight(brief, obs, obs_hash, drill_namespace)
        if identity == 'ISOLATED':
            # Explicit test isolation boundary: the drill can never touch a
            # production aggregate. The drill provenance rides in event_data
            # so the row is self-describing as a test artifact.
            agg = f'drill:{drill_namespace}'
            drill_tag = {'namespace': drill_namespace, 'identity': 'ISOLATED',
                         'note': 'controlled drill emission on isolated test '
                                 'aggregate; not production knowledge'}

    # Semantic-domain gate (2026-09-25 Lane G): prospect/intel discovery is
    # prospect-store-only. Refuses before any network POST when brief_id is
    # not a PING-authorized acquisition brief (learn-<sweep-id>).
    _require_ping_domain(brief, drill)

    # Fail-closed LOCAL precondition: VERIFIED -> ACCEPTED_BY_PING. Refuses
    # (exit 2) when the newest ok run's sidecar has no 'verified'
    # transition, so unverified research can never be promoted. Also
    # refuses when this exact observation text was already emitted
    # (duplicate-emission guard), unless --force. This gate is
    # deliberately network-free: the remote duplicate probe is NOT a
    # precondition for spooling, so a verified observation is durably
    # spooled even when the Pig is unreachable.
    _require_verified_local(brief, obs_hash, force,
                      drill_ctx=(brief, obs_hash, drill_namespace, identity) if drill else None)

    body = {
        'event_type': 'OBSERVATION_CREATED',
        'aggregate_id': agg,
        'aggregate_type': 'drill_pass' if drill and drill_namespace else 'research_pass',
        # Lane L (2026-09-25): POST /events requires an explicit tenant_id.
        # Research observations are unattributed system work, so UNKNOWN.
        'tenant_id': 'UNKNOWN',
        'event_data': {
            'research_agent': 'meta-ai',
            'brief_id': brief,
            'verification_status': 'verified',
            'observation': obs,
        },
    }
    if drill and drill_namespace:
        body['event_data']['drill'] = drill_tag

    # Durable spool (2026-09-27): accepted work must survive loss of
    # Tailscale, SSH, gateway, and Pig connectivity. The local gates above
    # authorized this observation; it is now ACCEPTED -> DURABLY SPOOLED
    # (fsync'd) BEFORE any network POST, so a transport failure can no
    # longer lose it. Duplicate reconciliation happens at delivery time:
    # ship_one probes ping_events by observation hash before every POST;
    # a hit acknowledges without re-POSTing (healing the sidecar), an
    # UNCHECKABLE probe holds the item DELIVERY_PENDING without POSTing.
    # Exit 3 = accepted and durably spooled, delivery pending (retry with
    # event-spool.py ship); exit 0 = emitted and acknowledged. The
    # local duplicate guard (_require_verified_local, above) still
    # refuses re-emission of the same observation text recorded on the
    # sidecar, and the spooler's idempotency_key reuse means a retried
    # observation can never double-spool or double-emit.
    spool = _load_spool()
    spool_id = spool.spool(
        body,
        event_type='OBSERVATION_CREATED',
        aggregate_id=agg,
        aggregate_type='drill_pass' if drill and drill_namespace else 'research_pass',
        idempotency_key=obs_hash,
    )

    def _deliver(payload):
        try:
            return deliver_observation(payload)
        except ObservationTransportError as e:
            raise spool.TransportError(str(e))

    def _probe(key):
        # Three outcomes, never collapsed: event_id | None | 'UNCHECKABLE'.
        try:
            return find_event_in_ping(key)
        except Exception:
            return spool.PROBE_UNCHECKABLE

    def _on_probe_hit(item, event_id):
        # Orphaned emission (POST succeeded, process died before the
        # sidecar write): heal the sidecar with the true event_id.
        try:
            _mark_accepted(brief, event_id, obs_hash)
        except Exception:
            pass

    rec = spool.ship_one(spool_id, _deliver, _probe,
                         on_probe_hit=_on_probe_hit)
    if rec['state'] == 'ACKNOWLEDGED':
        # Success (fresh POST, or probe-hit recovery of an orphaned
        # emission): record the accepted_by_ping knowledge state on the
        # newest ok run's sidecar. Idempotent on event_id; wrapped so it
        # can never fail or mask the emission.
        try:
            _mark_accepted(brief, rec['remote_event_id'], obs_hash)
        except Exception:
            pass
        if rec.get('recovered_via_probe'):
            print('STATE=RECOVERED spool_id=%s observation already emitted '
                  'as event %s (orphaned POST healed; no duplicate emission)'
                  % (spool_id, rec['remote_event_id']))
        if drill:
            _drill_log(brief, identity, obs_hash, drill_namespace,
                       'emitted', 'aggregate=%s' % agg)
        return 0
    # Not acknowledged: delivery pending (transport down, probe
    # uncheckable, or dead-lettered). The work is durably spooled.
    print('STATE=SPOOLED_PENDING spool_id=%s observation_sha256=%s '
          'state=%s error=%s'
          % (spool_id, obs_hash, rec['state'], rec.get('error')))
    print('The observation is durably spooled; delivery will be retried '
          'with: python3 ~/workspace/tandem/event-spool.py ship')
    if drill:
        _drill_log(brief, identity, obs_hash, drill_namespace,
                   'spooled_pending',
                   'aggregate=%s state=%s' % (agg, rec['state']))
    return 3


if __name__ == '__main__':
    sys.exit(main())
