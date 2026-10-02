import io

path = "src/fyd/ui/portal-circle.tsx"
s = io.open(path, encoding="utf-8").read()

# 1. Sheet state next to the other engagement state.
old = """  const [engagedD, setEngagedD] = React.useState(320);"""
new = """  const [engagedD, setEngagedD] = React.useState(320);
  // Mobile sheet: narrow viewports cannot honestly hold the circle+orbit
  // footprint (320px), so tap opens a compact bottom sheet instead of the
  // spatial expansion. Same identity, same actions, no forced geometry.
  const [sheetOpen, setSheetOpen] = React.useState(false);"""
assert s.count(old) == 1, "state anchor not found"
s = s.replace(old, new)

# 2. beginEngage: sheet path for narrow viewports.
old = """  const beginEngage = React.useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();"""
new = """  const beginEngage = React.useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    // Directive (Nolan, 2026-09-22): do not force desktop spatial behavior
    // onto mobile. Below 640px the tap opens the bottom sheet; the
    // circle+orbit expansion stays a desktop treatment.
    if (window.innerWidth < 640) {
      setSheetOpen(true);
      props.onEngageRequest(id);
      return;
    }
    const r = el.getBoundingClientRect();"""
assert s.count(old) == 1, "beginEngage anchor not found"
s = s.replace(old, new)

# 3. Sheet close handler, next to beginEngage's release path.
old = """      {engaged && center && typeof document !== "undefined"
        ? createPortal("""
new = """      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {sheetOpen && (
                <CompactSheet
                  portal={portal}
                  following={following}
                  liked={liked}
                  canFollow={canFollow}
                  canLike={canLike}
                  canAsk={canAsk}
                  webHref={webHref}
                  onToggleFollow={toggleFollow}
                  onToggleLike={toggleLike}
                  onAskRequest={(sid) => {
                    setSheetOpen(false);
                    props.onAskRequest(sid);
                  }}
                  onClose={() => {
                    setSheetOpen(false);
                    props.onRelease(id);
                  }}
                  reduceMotion={!!reduceMotion}
                />
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {engaged && !sheetOpen && center && typeof document !== "undefined"
        ? createPortal("""
assert s.count(old) == 1, "render anchor not found"
s = s.replace(old, new)

# 4. CompactSheet component, placed just before EngagedPortal.
old = """function EngagedPortal(p: EngagedProps) {"""
new = '''/**
 * CompactSheet: the mobile engaged treatment. A bottom sheet with the
 * identity's highest-value information: image, name, descriptor,
 * location, top facts, actions (Ask FYD, Follow, Like, Website), and
 * evidence provenance. One tap opens, readable at 320px, close/Escape/
 * outside-tap collapses. No orbit ring, no spatial footprint math.
 */
interface SheetProps {
  portal: PortalProjection;
  following: boolean | null;
  liked: boolean | null;
  canFollow: boolean;
  canLike: boolean;
  canAsk: boolean;
  webHref: string | null;
  onToggleFollow: () => void;
  onToggleLike: () => void;
  /** Routes to the ONE global assistant; the sheet closes so the dock is visible. */
  onAskRequest: (id: string) => void;
  onClose: () => void;
  reduceMotion: boolean;
}

function CompactSheet(p: SheetProps) {
  const { portal } = p;
  const c = portal.circle;
  const preview = portal.preview;
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  // Focus the close control on open; Escape closes; outside tap closes.
  // The open tap is deferred past so it never instantly dismisses.
  React.useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) p.onClose();
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 60);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [p]);

  const facts = c.topFacts.slice(0, 4);
  const sub = [c.category, c.locationLabel].filter(Boolean).join(" · ");
  const slide = p.reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 };

  return (
    <motion.div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label={c.name}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={slide}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-[95] max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border-soft bg-surface shadow-[0_-18px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="sticky top-0 flex items-center justify-between bg-surface px-4 pb-2 pt-3">
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-border-soft" />
        <button
          ref={closeRef}
          type="button"
          onClick={p.onClose}
          aria-label={`Close ${c.name}`}
          className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-accent/70 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {preview && (
        <div className="px-4">
          <img
            src={preview.thumbSrc ?? preview.src}
            srcSet={preview.srcSet}
            sizes="(max-width: 640px) 100vw, 480px"
            alt={`${c.name} website preview`}
            decoding="async"
            className="aspect-[16/9] w-full rounded-2xl object-cover"
            style={{ objectPosition: focalToObjectPosition({ x: preview.focalX, y: preview.focalY }) }}
          />
        </div>
      )}

      <div className="px-5 pb-6 pt-4">
        <h2 className="text-xl font-bold leading-tight text-accent">{c.name}</h2>
        {sub ? <p className="mt-1 text-sm text-accent/70">{sub}</p> : null}
        {c.tagline ? <p className="mt-2 text-sm leading-relaxed text-accent/85">{c.tagline}</p> : null}
        {facts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Top services">
            {facts.map((f) => (
              <li
                key={f}
                className="rounded-full border border-border-soft bg-surface-2 px-3 py-1.5 text-xs font-medium text-accent"
              >
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {p.canAsk && (
            <button
              type="button"
              onClick={() => p.onAskRequest(c.id)}
              className="flex min-h-[44px] items-center gap-2 rounded-full bg-honey px-5 text-sm font-semibold text-honey-foreground hover:bg-honey-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey"
            >
              <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
              Ask FYD
            </button>
          )}
          {p.canFollow && (
            <button
              type="button"
              onClick={p.onToggleFollow}
              aria-pressed={!!p.following}
              className="flex min-h-[44px] items-center gap-2 rounded-full border border-border-soft px-4 text-sm font-medium text-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey"
            >
              {p.following ? (
                <UserCheck className="h-4 w-4" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
              {p.following ? "Following" : "Follow"}
            </button>
          )}
          {p.canLike && (
            <button
              type="button"
              onClick={p.onToggleLike}
              aria-pressed={!!p.liked}
              aria-label={p.liked ? "Liked" : "Like"}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border-soft text-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey"
            >
              <Heart className="h-4 w-4" aria-hidden="true" fill={p.liked ? "currentColor" : "none"} />
            </button>
          )}
          {p.webHref && (
            <button
              type="button"
              onClick={() => openWebsite(p.webHref as string)}
              className="flex min-h-[44px] items-center gap-2 rounded-full border border-border-soft px-4 text-sm font-medium text-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Website
            </button>
          )}
        </div>

        <p className="mt-4 border-t border-border-soft/60 pt-3 text-xs leading-relaxed text-accent/60">
          <span className="font-semibold text-accent/75">Evidence: </span>
          {c.provenanceLabel}
          {c.provenanceDetail ? ` ${c.provenanceDetail}` : ""}
        </p>
      </div>
    </motion.div>
  );
}

function EngagedPortal(p: EngagedProps) {'''
assert s.count(old) == 1, "sheet component anchor not found"
s = s.replace(old, new)

io.open(path, "w", encoding="utf-8").write(s)
print("OK portal-circle.tsx sheet")
