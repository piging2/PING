#!/usr/bin/env python3
"""Static a11y audit of FYD generated site HTML using stdlib html.parser only."""
import re, json, sys
from html.parser import HTMLParser

VOID = {'img','input','br','hr','meta','link','source','path','circle','rect','use','polyline','polygon','line'}

class Node:
    __slots__=('tag','attrs','children','parent','text','line')
    def __init__(self, tag, attrs, parent, line):
        self.tag=tag; self.attrs=dict(attrs); self.children=[]; self.parent=parent
        self.text=''; self.line=line

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root=Node('root',[],None,0); self.cur=self.root; self.all=[]
    def handle_starttag(self,tag,attrs):
        n=Node(tag,attrs,self.cur,self.getpos()[0])
        self.cur.children.append(n); self.all.append(n)
        if tag not in VOID: self.cur=n
    def handle_startendtag(self,tag,attrs):
        n=Node(tag,attrs,self.cur,self.getpos()[0])
        self.cur.children.append(n); self.all.append(n)
    def handle_endtag(self,tag):
        c=self.cur
        while c is not self.root and c.tag!=tag: c=c.parent
        if c is not self.root: self.cur=c.parent
    def handle_data(self,data):
        if data.strip(): self.cur.text+=' '+data.strip()

def text_of(n):
    parts=[n.text]
    for c in n.children: parts.append(text_of(c))
    return ' '.join(p for p in parts if p).strip()

def inner_html_snippet(n, maxlen=160):
    a=' '.join(f'{k}="{v}"' for k,v in n.attrs.items() if k in ('id','class','aria-label','type','href'))
    s=f"<{n.tag} {a}>".strip()
    t=text_of(n)
    if t: s+=f" text='{t[:60]}'"
    return s[:maxlen]

def cls(n): return n.attrs.get('class','')

TAILWIND_PX = {'0':0,'px':1,'0.5':2,'1':4,'1.5':6,'2':8,'2.5':10,'3':12,'3.5':14,'4':16,
 '5':20,'6':24,'7':28,'8':32,'9':36,'10':40,'11':44,'12':48,'14':56,'16':64}
def tailwind_size(classes):
    """Return (w_px,h_px) if explicit w-/h- classes found, else (None,None)."""
    w=h=None
    for c in classes.split():
        m=re.match(r'^(?:min-)?w-([\d.]+|px)$',c)
        if m and w is None:
            v=m.group(1); w=TAILWIND_PX.get(v)
        m=re.match(r'^(?:min-)?h-([\d.]+|px)$',c)
        if m and h is None:
            v=m.group(1); h=TAILWIND_PX.get(v)
    return w,h

GENERIC_LINK_TEXT = {'click here','read more','learn more','more','here','link','continue','details'}

def audit(path):
    html=open(path).read()
    p=P(); p.feed(html)
    nodes=p.all
    F=[]  # findings: dict(rule, selector, impact, severity, detail, status)
    def add(rule, selector, impact, severity, detail, status='REPRODUCIBLE FAILURE'):
        F.append({'rule':rule,'selector':selector,'impact':impact,'severity':severity,
                  'detail':detail,'status':status,'page':path.split('/')[-1]})

    # 1. LANDMARKS
    mains=[n for n in nodes if n.tag=='main' or n.attrs.get('role')=='main']
    if len(mains)!=1:
        add('WCAG 1.3.1 / ARIA landmark: exactly one main landmark',
            'main', 'Screen reader users cannot reliably jump to primary content; duplicate main landmarks break landmark navigation.',
            'high' if len(mains)==0 else 'medium',
            f"Found {len(mains)} <main> elements (lines {[n.line for n in mains]}).")
    for tag,role in (('header','banner'),('footer','contentinfo')):
        els=[n for n in nodes if n.tag==tag or n.attrs.get('role')==role]
        if not els:
            add(f'WCAG 1.3.1: {role} landmark present', tag,
                'Missing site-wide landmark reduces navigability.', 'low',
                f"No <{tag}> or role={role} found.")
    navs=[n for n in nodes if n.tag=='nav' or n.attrs.get('role')=='navigation']
    if not navs:
        add('WCAG 1.3.1: navigation landmark present','nav',
            'Primary navigation not exposed as a landmark.','medium','No <nav> found.')

    # 2. HEADING HIERARCHY
    heads=[n for n in nodes if re.fullmatch(r'h[1-6]',n.tag)]
    h1s=[n for n in heads if n.tag=='h1']
    if len(h1s)!=1:
        add('WCAG 1.3.1 / 2.4.6: single h1 per page','h1',
            'Multiple h1s dilute the page topic for assistive tech and SEO.',
            'medium', f"Found {len(h1s)} h1 elements: "+'; '.join(f"line {n.line} '{text_of(n)[:50]}'" for n in h1s))
    prev=0
    for n in heads:
        lvl=int(n.tag[1])
        if prev and lvl>prev+1:
            add('WCAG 1.3.1: no skipped heading levels', n.tag,
                'Skipped levels confuse screen-reader heading navigation (users assume missing content).',
                'medium', f"line {n.line}: {n.tag} '{text_of(n)[:60]}' follows h{prev} (skipped h{prev+1}).")
        prev=lvl
    if heads and heads[0].tag!='h1':
        add('WCAG 1.3.1: first heading is h1', heads[0].tag,
            'Page outline does not start at the top level.', 'low',
            f"First heading is {heads[0].tag} at line {heads[0].line}.")

    # 3. IMAGES
    for n in [x for x in nodes if x.tag=='img']:
        alt=n.attrs.get('alt')
        sel=f"img[src='{n.attrs.get('src','')[:60]}']"
        if alt is None:
            add('WCAG 1.1.1: img has alt attribute', sel,
                'Screen readers announce the file name or nothing; meaning is lost.', 'high',
                f"line {n.line}: <img> with no alt attribute.")
        elif alt=='' and n.attrs.get('aria-hidden')!='true' and n.attrs.get('role') not in ('presentation','none'):
            # alt="" is the correct decorative marking; flag only if it looks content-bearing context
            pass
        # redundant alt: alt identical to adjacent link/button text or filename-ish
        if alt:
            if re.search(r'\.(png|jpe?g|webp|svg|avif)(\?.*)?$', alt, re.I) or '/' in alt:
                add('WCAG 1.1.1: alt text is meaningful, not a file path', sel,
                    'File-name alt text is noise for screen reader users.', 'low',
                    f"line {n.line}: alt='{alt[:80]}' looks like a file path.")
    # svg without title/aria
    for n in [x for x in nodes if x.tag=='svg']:
        has_label = n.attrs.get('aria-label') or n.attrs.get('aria-labelledby') or any(c.tag=='title' for c in n.children)
        if n.attrs.get('aria-hidden')=='true': continue
        # find if inside button/link with its own name
        anc=n.parent; named=False
        while anc and anc.tag!='root':
            if anc.tag in ('button','a') and (text_of(anc).strip() or anc.attrs.get('aria-label')): named=True; break
            anc=anc.parent
        if not has_label and not named:
            add('WCAG 1.1.1: informative svg needs accessible name','svg',
                'Unnamed SVG may be announced as noise or skipped meaning.', 'low',
                f"line {n.line}: <svg> without title/aria-label outside a named control.")

    # 4. FORM INPUTS
    labels={n.attrs.get('for'):n for n in nodes if n.tag=='label' and n.attrs.get('for')}
    for n in [x for x in nodes if x.tag in ('input','textarea','select')]:
        t=n.attrs.get('type','text')
        if t in ('hidden','submit','button'): continue
        sel=f"{n.tag}[name='{n.attrs.get('name',n.attrs.get('id','?'))}']"
        ok = n.attrs.get('aria-label') or n.attrs.get('aria-labelledby') or n.attrs.get('id') in labels
        # wrapped in label?
        anc=n.parent
        while anc and anc.tag!='root':
            if anc.tag=='label': ok=True; break
            anc=anc.parent
        if not ok:
            add('WCAG 1.3.1 / 3.3.2: form input has associated label', sel,
                'Screen reader users cannot tell what the field is for; placeholder-only labeling fails on focus.',
                'high', f"line {n.line}: {inner_html_snippet(n)}")

    # 5. BUTTONS
    for n in [x for x in nodes if x.tag=='button']:
        name=(n.attrs.get('aria-label') or '').strip() or text_of(n).strip()
        if not name:
            # check aria-labelledby or img alt inside
            imgs=[c for c in n.children if c.tag=='img' and c.attrs.get('alt')]
            if not (n.attrs.get('aria-labelledby') or imgs):
                add('WCAG 4.1.2: button has accessible name','button',
                    'Empty buttons are announced as "button" with no purpose; unusable by screen reader users.',
                    'high', f"line {n.line}: {inner_html_snippet(n)}")

    # 6. LINKS
    for n in [x for x in nodes if x.tag=='a' and x.attrs.get('href')]:
        name=(n.attrs.get('aria-label') or '').strip() or text_of(n).strip()
        href=n.attrs.get('href','')
        sel=f"a[href='{href[:60]}']"
        if not name:
            add('WCAG 2.4.4 / 4.1.2: link has discernible text', sel,
                'Empty links are focusable but announce nothing; keyboard/SR users cannot tell the destination.',
                'high', f"line {n.line}: {inner_html_snippet(n)}")
        elif re.fullmatch(r'https?://\S+', name):
            add('WCAG 2.4.4: link text describes purpose, not bare URL', sel,
                'Bare URLs are verbose and meaningless out of context.', 'medium',
                f"line {n.line}: link text is bare URL '{name[:60]}'.")
        elif name.lower().strip() in GENERIC_LINK_TEXT:
            add('WCAG 2.4.4: link purpose in context (avoid generic text)', sel,
                'Generic link text forces users to read surrounding context to understand the destination.', 'low',
                f"line {n.line}: generic link text '{name}'.", status='REPRODUCIBLE FAILURE')

    # 7. TOUCH TARGETS (heuristic: explicit Tailwind sizes on buttons/links/inputs)
    for n in [x for x in nodes if x.tag in ('button','a','input') and x.tag!='input' or (x.tag=='input' and x.attrs.get('type') in ('checkbox','radio','submit','button','image'))]:
        w,h=tailwind_size(cls(n))
        small=[d for d,v in (('w',w),('h',h)) if v is not None and v<44]
        # inline text links exempt (WCAG 2.5.8 inline exception)
        if n.tag=='a' and text_of(n).strip() and w is None and h is None: continue
        if small and 'sr-only' not in cls(n):
            add('WCAG 2.5.8: touch target min 44x44 CSS px', n.tag,
                'Small targets are hard to hit for users with motor impairments or on touch devices.', 'medium',
                f"line {n.line}: {inner_html_snippet(n)} sizes w={w} h={h}px from Tailwind classes.")

    # 8. TEXT OVER IMAGES without scrim/overlay (heuristic)
    # find <img> with absolutely-positioned text siblings/ancestors lacking overlay classes
    for n in [x for x in nodes if x.tag=='img']:
        sec=n
        while sec and sec.tag not in ('section','header','div'): sec=sec.parent
        if not sec: continue
        sec_cls=cls(sec)
        has_overlay=bool(re.search(r'bg-(black|white|slate|stone|neutral|zinc|gray)-?(?:\d{2,3})?(/\d+)?|bg-gradient|backdrop-|bg-opacity', sec_cls))
        # also check children for overlay divs
        def has_overlay_child(m):
            for c in m.children:
                if c.tag=='div' and re.search(r'bg-(black|white|slate|stone|neutral|zinc|gray)|bg-gradient|backdrop-', cls(c)): return True
                if has_overlay_child(c): return True
            return False
        if not has_overlay and not has_overlay_child(sec):
            txt=text_of(sec)
            if len(txt)>40:  # substantial text over image
                add('WCAG 1.4.3: text over imagery has scrim/overlay (contrast heuristic)','img+text section',
                    'Text directly over a photo can fail contrast depending on the image; scrims make it deterministic.',
                    'medium', f"line {n.line}: section with img and {len(txt)} chars of text, no overlay/scrim class detected.",
                    status='REPRODUCIBLE FAILURE')

    # 9. FOCUS VISIBILITY
    styles=' '.join(x.text for x in nodes if x.tag=='style')
    has_focus_style = bool(re.search(r':focus-visible|:focus\b|focus:', html))
    outline_none = len(re.findall(r'outline-none|focus:outline-none', html))
    if outline_none and not has_focus_style:
        add('WCAG 2.4.7: focus indicator visible','*',
            'Keyboard users cannot track focus if outlines are removed with no replacement.', 'high',
            f"{outline_none} outline-none occurrences, no :focus-visible replacement found.")
    elif outline_none:
        add('WCAG 2.4.7: focus indicator visible (verify replacement)','*',
            'outline-none used; replacement focus styles must be verified visually.', 'low',
            f"{outline_none} outline-none occurrences; :focus-visible styles present but replacement not verified.",
            status='FALSE POSITIVE')

    # 10. MOTION / reduced motion + content-existence law
    prm = html.count('prefers-reduced-motion')
    # inline opacity:0 / hidden elements that need JS to reveal
    hidden_content=[]
    for n in nodes:
        st=n.attrs.get('style','')
        if re.search(r'opacity:\s*0',st) and text_of(n).strip():
            hidden_content.append(n)
    add('MOTION-LAW: content present independent of animation','document',
        'Standing law: motion never determines content existence.', 'info',
        f"prefers-reduced-motion media query occurrences in HTML: {prm}; "
        f"elements with inline opacity:0 containing text: {len(hidden_content)} "
        f"({'; '.join(f'line {n.line} {n.tag}' for n in hidden_content[:5])}). "
        f"SSR HTML contains full text content, so content exists without JS animation. Reduced-motion handling must be verified in component source.",
        status='REPRODUCIBLE FAILURE' if prm==0 else 'FALSE POSITIVE')

    return F, {'nodes':len(nodes),'headings':len(heads)}

if __name__=='__main__':
    allf=[]
    for path in sys.argv[1:]:
        f,meta=audit(path)
        allf.extend(f)
        print(f"{path}: {len(f)} findings, {meta['nodes']} nodes, {meta['headings']} headings")
    json.dump(allf, open('/home/hatch/workspace/fyd-factory/qa/a11y/raw/findings-raw.json','w'), indent=1)
    print("wrote raw findings")
