import json, re
OUT='/home/hatch/workspace/outreach'
cands=json.load(open(OUT+'/fb91-candidates.json'))
URL_SEEN=set()
draft=[]

def slug(group, author, text):
    s=(group+' '+author+' '+text[:60]).lower()
    s=re.sub(r"[^a-z0-9 ]","",s)
    s=re.sub(r"\s+"," ",s).strip()
    return s[:80]

# hard drop patterns (content rules)
def drop(c):
    t=(c['text'] or '').lower()
    u=c['url']
    if not c['text'] or len(c['text'].strip())<8: return 'empty-caption'
    if '?sale_post_id=' in u: return 'sale-url'
    for pat in ['witch','witches'] : pass
    # political/doom
    if any(w in t for w in ['protest','maga','democrat','republican','biden','trump','vote for','defund','border wall']): return 'political'
    # real estate listings
    if 'realtor' in t and ('listed' in t or 'for sale' in t or '3200 rd' in t): return 'realestate-listing'
    if 'exceptional custom home' in t: return 'realestate-listing'
    if 'timeless comfort meets' in t: return 'realestate-listing'
    # ads
    if 'progressive' in t and 'insurance' in t: return 'ad'
    # known guard-blocked identities
    au=(c['author'] or '').lower()
    for bad in ['unique solutions handyman','ag property services','teresa','raven','western colorado chimney','taylor lorenzo']:
        pass
    return None

# blocklist by author name (guard-pattern or prior engagement risk)
BLOCKED_AUTHORS=['unique solutions handyman','ag property services',"teresa","raven's grotto","western colorado chimney"]

comments=[
 ("Profinish Drywall & Paint","https://facebook.com/groups/2375845965922391/permalink/3492992100874433/","Drywall and paint that holds up under a builder's eye. Nobody photographs it, but everybody notices it."),
 ("Copley Construction Services LLC","https://facebook.com/groups/2375845965922391/permalink/3492805657559744/","Storm damage excavation is the call nobody wants to make and everybody needs. Being the crew that is ready is the whole business."),
 ("Junk Genies","https://facebook.com/groups/786995948656362/permalink/2007834393239172/","Basements are where good intentions go to die. Someone has to excavate the archive."),
 ("Owen Landscape Architect","https://facebook.com/groups/landscapingideas/permalink/28262855393355782/","That paver patio is doing the heavy lifting for the whole front yard. Formal lines like that age well."),
 ("Hunter Property Services","https://facebook.com/groups/1034795403236979/permalink/28293479893608495/","Garage cleanouts are the before and after that sells itself. The pile always looks worse than you remember."),
]
comment_urls={u for _,u,_ in comments}

# home feed: friends' personal posts only (skip engaged Pages)
for c in cands:
    if c['group']!='home': continue
    au=(c['author'] or '')
    au_l=au.lower()
    if au_l in ['visual capitalist','explore colorado with rupam dewan','secret dallas','robert kiyosaki','logic','guinness world records','progressive','cassi rossgeske','boston celtics','the campaign lab','trill','colorado mesa university']: continue
    reason=drop(c)
    if reason: continue
    u=c['url']
    if u in comment_urls or u in URL_SEEN: continue
    URL_SEEN.add(u)
    draft.append({'type':'like','url':u,'page':au or 'home friend'})

# group pool: local first, then trade/pool
def prio(c):
    g=c['group']
    if g in ('Fruita','Montrose','Durango','Ridgway','Delta','Palisade','Palisade Msg','Orchard Mesa','GJ community','GJ Events','Redlands','WesternCO Msg','GJ Message Board','Living In GJ','CO BizNet','GJ trees'): return 0
    if g in ('coloradobusinessmingle',): return 0
    return 1

pool=[c for c in cands if c['group'] not in ('home',) ]
pool.sort(key=lambda c:(prio(c), c['created'] or ''), reverse=True)
for c in pool:
    if len(draft)>=110: break
    au_l=(c['author'] or '').lower()
    if any(b in au_l for b in BLOCKED_AUTHORS): continue
    reason=drop(c)
    if reason: continue
    u=c['url']
    if u in comment_urls or u in URL_SEEN: continue
    URL_SEEN.add(u)
    name=c['author'] or c['group']
    t=(c['text'] or '')[:50].replace('\n',' ')
    page=f"{name} ({t})" if name!=c['group'] else f"{c['group']} ({t})"
    draft.append({'type':'like','url':u,'page':page[:100]})

for p,u,t in comments:
    draft.append({'type':'comment','url':u,'page':p,'text':t})

job={'actions':draft,'minDelaySec':60,'maxDelaySec':120}
json.dump(job,open(OUT+'/fb91-job.json','w'),indent=1)
n_like=sum(1 for a in draft if a['type']=='like')
n_com=sum(1 for a in draft if a['type']=='comment')
print(f'drafted {len(draft)}: {n_like} likes + {n_com} comments')
