#!/bin/bash
# automation-health-report.sh
# READ-ONLY automation health report generator for Nolan's automation-resilience program.
# It must NEVER mutate state: no writes, no deletes, no network actions, no cron changes.
# All inputs are read from log/state files; every missing input degrades to "no data",
# never to a crash. Exit code is always 0 so the report itself can never fail a cron run.
#
# DESIGN (2026-09-24 reporter repair lane): the reporter reasons about CURRENT STATE,
# never about whole-log historical text. Warnings attach to current-state records with
# timestamps and terminal dispositions:
#   - per-platform status comes from the last pass block's Classification taxonomy
#     (SUCCESS_ACTION / ELIGIBILITY_EMPTY / DEPENDENCY_FAILURE / TEMPORARY_FAILURE /
#      AUTH_FAILURE / RATE_LIMIT / PENDING / IN FLIGHT), not from phrase greps;
#   - capability warnings come from the LIVE capability-state JSON files
#     (~/workspace/pig-fb/*-capability-state.json), not from log text;
#   - meta-ai capture backlog counts only artifacts whose sidecar has NO terminal
#     disposition transition (capture_failed_closed et al.), not filenames;
#   - open intent-ledger intents are attributed to in-flight vs stale passes;
#   - pass headings are matched generically ("^#{1,4} .*Pass ") so per-platform
#     heading formats all resolve to the same current-state block.
# Fixed rule: resolved history != current incident. Restriction tripwire
# (checkpoint / action block / verification challenge, negation-aware) is preserved:
# any genuine signal still flips the pass to minimum volume; false positives are gone.
set -u

OUT="${HEALTH_OUT:-$HOME/workspace/outreach}"
TANDEM="${HEALTH_TANDEM:-$HOME/workspace/tandem/reconciliation}"
GOALS="${HEALTH_GOALS:-$HOME/workspace/goals}"
PIGFB="${HEALTH_PIGFB:-$HOME/workspace/pig-fb}"
TODAY="$(TZ=America/Denver date +%F)"
NOW="$(TZ=America/Denver date +'%H:%M MDT')"
NOW_EPOCH="$(date +%s)"

# Terminal classification taxonomy (writer: the engagement passes themselves).
# Any ALL-CAPS classification token the passes emit is reported verbatim;
# the mapping below decides the report symbol only.

# ---------- helpers ----------
cron_file() { # $1 = job id -> definition .md path (first match)
  find "$GOALS" -path "*crons*" -name "$1__*.md" 2>/dev/null | head -1
}

cron_field() { # $1 = cron file, $2 = field name (frontmatter, between the --- lines)
  awk -v f="$2" 'NR==1&&$0=="---"{inm=1;next} inm&&$0=="---"{exit} inm&&$1==f":"{$1="";sub(/^ /,"");print;exit}' "$1" 2>/dev/null
}

cron_cadence() { # $1 = cron file -> human cadence + enabled
  local f="$1"
  [ -z "$f" ] && { echo "no schedule found"; return; }
  local en kind every time
  en="$(cron_field "$f" "enabled")"
  kind="$(grep -m1 '^  kind:' "$f" 2>/dev/null | awk '{print $2}')"
  every="$(grep -m1 '^  every:' "$f" 2>/dev/null | awk '{print $2}')"
  time="$(grep -m1 '^  time:' "$f" 2>/dev/null | awk '{print $2}')"
  local s=""
  case "$kind" in
    interval) s="every ${every:-?}" ;;
    daily)    s="daily ~${time:-?}" ;;
    *)        s="${kind:-unknown} schedule" ;;
  esac
  [ "$en" = "true" ] && s="$s, enabled" || s="$s, DISABLED"
  printf '%s' "$s"
}

pass_heading_line() { # $1 = log file -> the last pass-heading line (any platform format)
  local f="$1"
  [ -f "$f" ] || { echo ""; return; }
  grep -E '^#{1,4} .*Pass ' "$f" 2>/dev/null | tail -1
}

last_pass_block() { # $1 = log file -> text starting at the last pass heading
  local f="$1"
  [ -f "$f" ] || { echo ""; return; }
  local ln
  ln="$(grep -nE '^#{1,4} .*Pass ' "$f" 2>/dev/null | tail -1 | cut -d: -f1)"
  [ -z "$ln" ] && { tail -40 "$f"; return; }
  tail -n +"$ln" "$f" | head -80
}

pass_classification() { # $1 = block text -> last ALL-CAPS Classification token (or "")
  # Accepts both "Classification: X" (pass bodies) and "classification X" (X headings).
  # The keyword match is case-insensitive but the TOKEN must be ALL-CAPS, so
  # prose like "Classification pending worker completion" never counts.
  local t="$1"
  printf '%s' "$t" | grep -oE '[Cc][Ll][Aa][Ss][Ss][Ii][Ff][Ii][Cc][Aa][Tt][Ii][Oo][Nn]:?[[:space:]]*[A-Z][A-Z_]+' | tail -1 | sed -E 's/^[Cc][Ll][Aa][Ss][Ss][Ii][Ff][Ii][Cc][Aa][Tt][Ii][Oo][Nn]:?[[:space:]]*//'
}

pass_classification_reason() { # $1 = block text -> writer's parenthetical after the classification (or "")
  local t="$1"
  printf '%s' "$t" | grep -oE '[Cc][Ll][Aa][Ss][Ss][Ii][Ff][Ii][Cc][Aa][Tt][Ii][Oo][Nn]:?[[:space:]]*[A-Z][A-Z_]+[[:space:]]*\([^)]{0,140}\)' | tail -1 | sed -E 's/^[^(]*\((.*)\)$/\1/' | head -c 140
}

last_guard_filter() { # $1 = log file, $2 = platform -> last "filter <platform>:" line
  grep -E "filter $2:" "$1" 2>/dev/null | tail -1
}

caps_from_body() { # $1 = cron file -> "75 likes + 20 comments per pass" style snippet
  local f="$1"
  [ -z "$f" ] || [ ! -f "$f" ] && { echo "unknown"; return; }
  python3 - "$f" <<'EOF'
import re,sys
text=open(sys.argv[1],errors='ignore').read()
cands=[]
for m in re.finditer(r'(\d+\s+likes(?:\s*(?:\+|plus)\s*(?:up to\s*)?\d+\s+comments)?[^.\n]{0,70})',text,flags=re.I):
    seg=m.group(1).strip()
    if re.search(r'per pass',seg,re.I): cands.append(seg)
if cands:
    print(cands[0]); sys.exit(0)
print("unknown")
EOF
}

# Restriction tripwire: genuine platform restriction signals (checkpoint / action
# block / verification challenge), with negation-aware filtering. Hedged signals
# ("possible checkpoint") are checked on raw text; unhedged signals on text with
# negated/definitional lines stripped. fail-closed is NOT a restriction: it is the
# guard/worker behaving correctly, so it never trips this gate.
restriction_signal() { # $1 = block text -> "SYMBOL|reason" if a restriction signal exists
  local t="$1"
  local hedged clean hit why
  hedged="$(printf '%s' "$t" | grep -oiE '(possible|suspected|potential)[^,.;]{0,40}(action block|checkpoint|verification challenge)' | head -1)"
  clean="$(printf '%s' "$t" \
    | grep -viE 'no [a-z /-]*(action block|checkpoint|verification challenge|violations?|restrictions?|warnings?)( signal)?( observed)?' \
    | grep -viE 'without (any|an|the) (action block|checkpoint|verification challenge|restrictions?|warnings?)' \
    | grep -viE 'not a (genuine |platform )?(restriction|checkpoint|action block)' \
    | grep -viE 'does not count toward|no restriction warning was observed')"
  hit="$(printf '%s' "$clean" | grep -iE 'action block|checkpoint|verification challenge' | head -1)"
  if [ -n "$hit" ]; then
    why="$(printf '%s' "$hit" | grep -oiE 'action block|checkpoint|verification challenge' | head -1)"
    echo "⛔|restriction signal: $why (volume drops to minimum per tripwire)"
  elif [ -n "$hedged" ]; then
    why="$(printf '%s' "$hedged" | grep -oiE '(action block|checkpoint|verification challenge)' | head -1)"
    echo "⚠|possible $why reported (unconfirmed)"
  fi
}

credential_signal() { # $1 = block text -> credential-health note (e.g. X 401)
  local t="$1"
  if printf '%s' "$t" | grep -qiE '401' && printf '%s' "$t" | grep -qiE 'credential|unauthorized'; then
    echo "; credential-health: 401 Unauthorized observed this pass, check credential health"
  fi
}

# status of a pass block: prints "SYMBOL|one-line reason"
pass_status() { # $1 = log file, $2 = block text, $3 = heading text
  local log="$1" t="$2" head="$3"
  [ -z "$t" ] && { echo "⚠|no pass data in log"; return; }
  local cls rs
  cls="$(pass_classification "$t")"
  # Tripwire first: any genuine restriction signal overrides classification.
  rs="$(restriction_signal "$t")"
  if [ -n "$rs" ]; then echo "$rs"; return; fi
  # IN FLIGHT passes: outcome is unknown by definition; report dispatch age and
  # the last terminal classification before this pass for context.
  if printf '%s' "$head" | grep -qi 'IN FLIGHT'; then
    local disp age_h prev
    disp="$(printf '%s' "$head" | grep -oE 'dispatched [0-9]{4}-[0-9]{2}-[0-9]{2} ~?[0-9]{1,2}:[0-9]{2} MDT' | head -1)"
    if [ -n "$disp" ]; then
      age_h="$(python3 - "$disp" <<'EOF'
import re,sys,datetime
m=re.search(r'(\d{4}-\d{2}-\d{2})\s*~?(\d{1,2}):(\d{2})',sys.argv[1])
try:
    dt=datetime.datetime.strptime(m.group(1)+' '+m.group(2).zfill(2)+':'+m.group(3),'%Y-%m-%d %H:%M')
    dt=dt.replace(tzinfo=datetime.timezone(datetime.timedelta(hours=-6)))
    import time
    print(int((time.time()-dt.timestamp())/3600))
except Exception:
    print('?')
EOF
)"
    else
      age_h="?"
    fi
    prev="$(grep -nE '^#{1,4} .*Pass ' "$log" 2>/dev/null | tail -2 | head -1 | cut -d: -f1)"
    next="$(grep -nE '^#{1,4} .*Pass ' "$log" 2>/dev/null | tail -1 | cut -d: -f1)"
    local prevcls=""
    if [ -n "$prev" ] && [ -n "$next" ] && [ "$next" -gt "$prev" ]; then
      prevcls="$(pass_classification "$(sed -n "${prev},$((next-1))p" "$log")")"
      [ -n "$prevcls" ] && prevcls="; last terminal: $prevcls"
    fi
    if [ "$age_h" != "?" ] && [ "$age_h" -ge 6 ]; then
      echo "⚠|in flight since ${disp#dispatched } (~${age_h}h, stale: no completion recorded)${prevcls}"
    else
      echo "⏳|in flight since ${disp#dispatched } (~${age_h}h), outcome pending${prevcls}"
    fi
    return
  fi
  local landed cred
  landed="$(printf '%s' "$t" | grep -oiE '[0-9]+/[0-9]+' | head -1)"
  cred="$(credential_signal "$t")"
  case "$cls" in
    SUCCESS_ACTION)
      if printf '%s' "$t" | grep -qiE '[1-9][0-9]* violations?|violations? (found|detected|recorded)'; then
        echo "⛔|post-pass verify VIOLATION${landed:+; $landed}${cred}"
      else
        echo "✓|${landed:+$landed actions reconciled, }no warnings${cred}"
      fi
      ;;
    SUCCESS_EMPTY)
      echo "✓|empty pass, no action needed${cred}"
      ;;
    ELIGIBILITY_EMPTY)
      local streak
      streak="$(printf '%s' "$t" | grep -oiE 'genuine[- ]empty streak( = |: )?[0-9]+' | head -1)"
      echo "⚠|ELIGIBILITY_EMPTY${streak:+ ($streak)}${cred}"
      ;;
    DEPENDENCY_FAILURE|TEMPORARY_FAILURE)
      local na reason
      na="$(printf '%s' "$t" | grep -oiE '[0-9]+ (targets?|intents?|actions?) (all )?NOT_ATTEMPTED' | head -1)"
      reason="$(pass_classification_reason "$t")"
      echo "⚠|$cls${reason:+ ($reason)}${na:+ ($na)}: no actions; not a restriction, no hold${cred}"
      ;;
    AUTH_FAILURE)
      echo "⛔|AUTH_FAILURE: session/auth problem, needs manual login${cred}"
      ;;
    RATE_LIMIT)
      echo "⚠|RATE_LIMIT${cred}"
      ;;
    SURFACE_DRIFT)
      echo "⚠|SURFACE_DRIFT: platform surface changed${cred}"
      ;;
    SITE_FIXED_SESSION_LOST)
      echo "⚠|site fixed, session lost: needs manual login${cred}"
      ;;
    PENDING)
      echo "⏳|outcome pending (classification PENDING)${cred}"
      ;;
    "")
      # No classification emitted: legacy block. Fall back to landed counts and
      # observed zero-action markers, never to phrase-based guessing.
      if [ -n "$landed" ]; then
        echo "✓|$landed, no warnings${cred}"
      elif printf '%s' "$head" | grep -qi 'NOT ATTEMPTED'; then
        echo "⚠|not attempted (no classification recorded)${cred}"
      else
        echo "⚠|no classification recorded for last pass, check log${cred}"
      fi
      ;;
    *)
      echo "⚠|$cls${landed:+; $landed}${cred}"
      ;;
  esac
}

platform_section() { # $1 = LABEL, $2 = log file, $3 = platform key, $4 = cron id
  local label="$1" log="$2" plat="$3" cid="$4"
  echo ""
  echo "$label"
  local cf head block st sym reason guard caps cad
  cf="$(cron_file "$cid")"
  head="$(pass_heading_line "$log")"
  block="$(last_pass_block "$log")"
  st="$(pass_status "$log" "$block" "$head")"
  sym="${st%%|*}"; reason="${st#*|}"
  guard="$(last_guard_filter "$log" "$plat")"
  if [ -z "$guard" ]; then
    # Fallback: some platforms log candidate counts only inside the pass section.
    guard="$(printf '%s' "$block" | grep -oiE '([0-9]+ (candidates|eligible)[^,.;]{0,40}|candidates: none)' | tail -1)"
    [ -n "$guard" ] && guard="pass-section note: $guard"
  fi
  caps="$(caps_from_body "$cf")"
  cad="$(cron_cadence "$cf")"
  if [ -n "$guard" ]; then
    if [[ "$guard" == pass-section\ note:* ]]; then
      echo "enumeration: ${guard#pass-section note: } (from last pass section; no guard filter line in log)"
    else
      local ce el bl
      ce="$(printf '%s' "$guard" | grep -oE 'checked=[0-9]+' | cut -d= -f2)"
      el="$(printf '%s' "$guard" | grep -oE 'eligible=[0-9]+' | cut -d= -f2)"
      bl="$(printf '%s' "$guard" | grep -oE 'blocked=[0-9]+' | cut -d= -f2)"
      echo "enumeration: checked=${ce:-?} eligible=${el:-?} blocked=${bl:-?} (last guard filter)"
    fi
  else
    echo "⚠ enumeration: no guard filter line found in log"
  fi
  [ "$caps" != "unknown" ] && [ -n "$caps" ] && echo "✓ strategy: $caps" || echo "⚠ strategy: caps not parseable from schedule"
  echo "$sym actions: $reason"
  echo "✓ next run: $cad"
}

# ---------- report ----------
echo "AUTOMATION HEALTH - $TODAY ($NOW)"

platform_section "FACEBOOK"  "$OUT/facebook-engagement.md"  "facebook"  "facebook-engagement-pass"
platform_section "INSTAGRAM" "$OUT/instagram-engagement.md" "instagram" "instagram-engagement-pass"
platform_section "THREADS"   "$OUT/threads-engagement.md"   "threads"   "threads-engagement-pass"
platform_section "TIKTOK"    "$OUT/tiktok-engagement.md"    "tiktok"    "tiktok-engagement-pass"
platform_section "X"         "$OUT/x-engagement.md"         "x"         "x-engagement-pass"

# ---------- unfollow batches ----------
echo ""
echo "UNFOLLOW"
for spec in "facebook-unfollow:$OUT/facebook-unfollow/state.json:facebook-unfollow-batch" "instagram-unfollow:$OUT/instagram-unfollow/state.json:instagram-unfollow-batch"; do
  name="${spec%%:*}"; rest="${spec#*:}"; sj="${rest%%:*}"; cid="${rest##*:}"
  if [ -f "$sj" ]; then
    lb="$(python3 -c "
import json,sys
try:
  d=json.load(open('$sj'))
  lb=d.get('last_batch',{})
  print(str(lb.get('date','?'))+' unfollowed='+str(lb.get('unfollowed',lb.get('completed','?')))+' target/day='+str(d.get('target_per_day','?'))+' status='+str(d.get('status','?')))
except Exception as e:
  print('unparseable: '+str(e)[:80])
")"
    echo "✓ $name: last batch $lb | $(cron_cadence "$(cron_file "$cid")")"
  else
    echo "⚠ $name: no state.json yet"
  fi
done

# ---------- meta-ai / ping pipeline ----------
echo ""
echo "META AI + PING PIPELINE"
if [ -f "$TANDEM/LATEST.json" ]; then
  python3 -c "
import json
try:
  d=json.load(open('$TANDEM/LATEST.json'))
  g=d.get('gap_count','?')
  sym='✓' if g==0 else ('⛔' if isinstance(g,int) and g>=20 else '⚠')
  print(sym+' reconcile gaps: '+str(g)+' (checked '+(d.get('meta',{}).get('checked_at','?'))+')')
except Exception as e:
  print('⚠ LATEST.json unparseable: '+str(e)[:80])
"
else
  echo "⚠ no reconciliation LATEST.json"
fi
# Capture backlog counts only artifacts whose sidecar carries NO terminal
# disposition transition. Historical capture_failed_closed records are resolved
# history, not current backlog.
mi_log="$GOALS/ping-social-outreach-campaign/hidden_files/meta-ai-intel"
if [ -d "$mi_log" ]; then
  python3 - "$mi_log" <<'EOF'
import json,glob,os,sys
d=sys.argv[1]
arts=glob.glob(os.path.join(d,'*.CAPTURE_FAILED'))
open_b=[]; closed=0; noside=[]
for a in sorted(arts):
    side=None
    for suffix in ('.md.CAPTURE_FAILED','.CAPTURE_FAILED'):
        if a.endswith(suffix):
            side=a[:-len(suffix)]+'.provenance.json'; break
    if not os.path.isfile(side):
        noside.append(os.path.basename(a)); continue
    try:
        p=json.load(open(side))
        states={t.get('state') for t in p.get('transitions',[])}
    except Exception:
        open_b.append(os.path.basename(a)); continue
    if 'capture_failed_closed' in states:
        closed+=1
    else:
        open_b.append(os.path.basename(a))
n=len(open_b)+len(noside)
if n==0:
    print('✓ capture-failed artifacts: %d on disk, all with terminal disposition capture_failed_closed (open backlog: 0)' % (closed,))
else:
    print('⚠ capture-failed backlog: %d open artifact(s) without terminal disposition (closed: %d): %s' % (n,closed,', '.join(open_b+noside)[:200]))
EOF
else
  echo "⚠ meta-ai-intel: intel dir not found"
fi

# ---------- intent ledger / action truth ----------
echo ""
echo "INTENT LEDGER"
ledger="$OUT/action-intent-ledger.jsonl"
if [ -f "$ledger" ]; then
  # Open intents are attributed to in-flight vs stale passes by consulting the
  # current pass headings in the engagement logs: intents belonging to a pass
  # that is still IN FLIGHT are expected to be open; the rest are stale.
  # 2026-10-04: headings changed format in October ("## FB Pass <ts> MDT —
  # DISPATCHED (pass-NNN; ...)" carries no full pass_id; the Status line below
  # it does). A pass DISPATCHED within the last 4h with open intents is still
  # mid-flight (80 actions x 120s pacing = 2.7h max); an older DISPATCHED pass
  # with opens is a worker-death suspect, not in-flight.
  # Stale intents with a documented disposition (deliberate UNKNOWN reviews,
  # worker-death boundary UNKNOWNs) are broken out so the residual
  # "unclassified stale" line is the real action item. The annotations below
  # are projection labels only; the ledger stays canonical.
  python3 - "$ledger" "$OUT" "$NOW_EPOCH" <<'EOF'
import json,sys,re,os,glob,time
from collections import Counter
from datetime import datetime, timedelta, timezone
ledger, out = sys.argv[1], sys.argv[2]
now_epoch = int(sys.argv[3]) if len(sys.argv)>3 else int(time.time())
KNOWN_DOCUMENTED_UNKNOWN = {
 'fb-20260924-175129': 'deliberate UNKNOWN, Stream E review 2026-09-26 (per-post like unprovable; never retry)',
 'fb-20261003-014112': 'worker-death boundary UNKNOWN seq 14 (orphan-sweep 2026-10-03)',
 'fb-20261003-192742': 'worker-death boundary UNKNOWN seq 6 (orphan-sweep 2026-10-04)',
 'fb-20261003-232714': 'worker-death boundary UNKNOWN seq 28 (orphan-sweep 2026-10-04)',
}
intents={}
try:
    for line in open(ledger):
        line=line.strip()
        if not line: continue
        r=json.loads(line)
        iid=r.get('intent_id')
        if not iid: continue
        if r.get('record_type')=='intent' and iid not in intents:
            intents[iid]=(r.get('pass_id'),r.get('platform'))
        if 'outcome' in r or 'terminal' in r:
            intents.pop(iid,None)
except Exception as e:
    print('⚠ ledger unparseable: '+str(e)[:80]); sys.exit(0)
inflight_heads={}
inflight_note={}
for log in glob.glob(os.path.join(out,'*-engagement.md')):
    try:
        lines=open(log,errors='ignore').read().splitlines()
    except Exception:
        continue
    for idx,ln in enumerate(lines):
        if not re.match(r'^#{1,4} .*Pass ',ln):
            continue
        if 'IN FLIGHT' in ln:
            m=re.search(r'[a-z]{2,3}-\d{8}-\d{6}',ln)
            if m:
                inflight_heads[m.group(0)]=ln.strip()[:90]
                inflight_note[m.group(0)]='IN FLIGHT heading'
        elif 'DISPATCHED' in ln:
            tm=re.search(r'(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) (MDT|MST)',ln)
            if not tm:
                continue
            off=-6 if tm.group(3)=='MDT' else -7
            try:
                dep=datetime.strptime(tm.group(1)+' '+tm.group(2),'%Y-%m-%d %H:%M').replace(tzinfo=timezone(timedelta(hours=off))).timestamp()
            except Exception:
                continue
            if not (0 <= now_epoch-dep <= 4*3600):
                continue
            pid=None
            for fl in lines[idx+1:idx+16]:
                if 'pass_id' not in fl:
                    continue
                m2=re.search(r'pass_id\s+([a-z]{2,3}-\d{8}-\d{6})',fl)
                if m2:
                    pid=m2.group(1); break
            if pid and pid not in inflight_heads:
                inflight_heads[pid]=ln.strip()[:90]
                inflight_note[pid]='DISPATCHED %s %s %s (worker mid-pass)' % (tm.group(1),tm.group(2),tm.group(3))
by_pass=Counter(v[0] for v in intents.values())
inflight_c=Counter({p: by_pass[p] for p in by_pass if p in inflight_heads})
stale_c=Counter({p: by_pass[p] for p in by_pass if p not in inflight_heads})
n_inflight=sum(inflight_c.values()); n_stale=sum(stale_c.values())
doc_c=Counter({p: stale_c[p] for p in stale_c if p in KNOWN_DOCUMENTED_UNKNOWN})
unclass_c=Counter({p: stale_c[p] for p in stale_c if p not in KNOWN_DOCUMENTED_UNKNOWN})
n_doc=sum(doc_c.values()); n_unclass=sum(unclass_c.values())
sym='✓' if n_unclass==0 else '⚠'
print('%s open intents: %d total = %d in-flight + %d documented-UNKNOWN + %d unclassified stale' % (sym,len(intents),n_inflight,n_doc,n_unclass))
for p,n in inflight_c.most_common():
    print('  in-flight: %s x%d (%s)' % (p,n,inflight_note.get(p,'')))
if doc_c:
    det='; '.join('%s x%d (%s)' % (p,doc_c[p],KNOWN_DOCUMENTED_UNKNOWN[p]) for p in sorted(doc_c))
    print('  documented UNKNOWN: %s' % det[:400])
if unclass_c:
    det='; '.join('%s x%d' % (p,unclass_c[p]) for p in sorted(unclass_c))
    print('  ⛔ unclassified stale (needs reconciliation): %s' % det[:300])
EOF
else
  echo "⚠ action-intent-ledger.jsonl not found"
fi
truth="$OUT/action-truth.jsonl"
if [ -f "$truth" ]; then
  n="$(wc -l < "$truth" 2>/dev/null | tr -d ' ')"
  echo "✓ action-truth store: $n records"
else
  echo "⚠ action-truth.jsonl not present yet (owned by another agent; using engagement logs)"
fi

# ---------- system ----------
echo ""
echo "SYSTEM"
enabled_n="$(find "$GOALS" -path "*crons*" -name "*.md" 2>/dev/null | while read -r f; do cron_field "$f" "enabled"; done | grep -c '^true$' || true)"
disabled_n="$(find "$GOALS" -path "*crons*" -name "*.md" 2>/dev/null | while read -r f; do cron_field "$f" "enabled"; done | grep -c '^false$' || true)"
echo "✓ scheduler: $enabled_n enabled / $disabled_n disabled cron definitions on disk"
# Capability state comes from the LIVE state files, never from historical log text.
python3 - "$PIGFB" <<'EOF'
import json,sys,os
pigfb=sys.argv[1]
specs=[('ig-capability-state.json','instagram-browser-automation'),
       ('th-capability-state.json','threads-browser-automation')]
any_blocker=False
for fname,cap in specs:
    p=os.path.join(pigfb,fname)
    if not os.path.isfile(p):
        print('⚠ capability: no live state file for '+cap); continue
    try:
        d=json.load(open(p))
    except Exception as e:
        print('⚠ capability: '+cap+' state unparseable: '+str(e)[:80]); continue
    st=d.get('status','UNKNOWN')
    reason=d.get('reason','')
    if st=='AVAILABLE':
        rec=d.get('last_recovery',{}).get('run','')
        print('✓ capability '+cap+': AVAILABLE (recovered '+str(d.get('unblocked_at','?'))[:10]+')')
    elif st=='READY_AWAITING_LOGIN':
        print('⚠ capability '+cap+': READY_AWAITING_LOGIN ('+str(reason)+'; needs manual login, no browser restart needed)')
    elif st=='BLOCKED':
        any_blocker=True
        print('⛔ capability '+cap+': BLOCKED since '+str(d.get('blocked_since','?'))[:10]+' ('+str(reason)+')')
    else:
        print('⚠ capability '+cap+': status='+st+' ('+str(reason)[:120]+')')
if not any_blocker:
    print('✓ no global blockers in live capability state')
else:
    print('⛔ blockers: capability BLOCKED in live state (see above)')
EOF
echo ""
echo "Report generated read-only from engagement logs, intent ledger, and reconciliation state. No state was modified."
exit 0
