"use client";

/**
 * MobileSheet: the mobile projection of the object layer.
 * (Nolan, 2026-09-22: do NOT emulate desktop margins on mobile.)
 *
 * Same object model, different spatial projection: a small edge tab
 * (no hover, no obscured article text, no horizontal overflow) opens a
 * bottom sheet listing the page's objects; tapping one shows the compact
 * object card directly (no peek, no Expand), and Ask FYD opens Ask mode.
 * The card components are the exact same ones the desktop layer renders;
 * the sheet only changes their spatial projection (relative, centered
 * at the fixed oval size).
 */

import * as React from "react";
import { ChevronRight, X } from "lucide-react";
import { claimExpanded, subscribeExpanded, subscribeOpenRequest } from "./expansion";
import { BackButton, OBJECT_W, ObjectRichCard, RICH_W } from "./ObjectCircle";
import { fyd } from "./fyd-tokens";
import type { MarginObjectDescriptor } from "./types";

export function MobileSheet({
  objects,
  onClose,
}: {
  objects: MarginObjectDescriptor[];
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = objects.find((o) => o.objectId === selectedId) ?? null;
  const [sheetAskOpen, setSheetAskOpen] = React.useState(false);

  // Selecting a different object resets Ask mode.
  React.useEffect(() => {
    setSheetAskOpen(false);
  }, [selectedId]);

  // Peer jump: a related-object link in any card selects that object here.
  React.useEffect(
    () =>
      subscribeOpenRequest((id) => {
        if (objects.some((o) => o.objectId === id)) setSelectedId(id);
      }),
    [objects],
  );

  // Claim the sheet slot on mount (collapses any stray expanded card);
  // being superseded closes the sheet.
  React.useEffect(() => {
    claimExpanded("sheet");
    const unsub = subscribeExpanded((active) => {
      if (active !== "sheet") onClose();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unsub();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50" data-testid="mobile-object-sheet">
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="PING objects on this page"
        className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-[48px] border-t border-[#E5E0D5] bg-[#FBFAF7] p-4 pb-8 pt-5 text-[#1A1729]"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-widest text-honey">PING objects</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close object list"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#E5E0D5] bg-white text-[#1A1729]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {selected ? (
          <div>
            <div className="mb-3">
              <BackButton
                light
                onBack={() =>
                  sheetAskOpen ? setSheetAskOpen(false) : setSelectedId(null)
                }
                label={sheetAskOpen ? "Back" : "Back to object list"}
              />
            </div>
            <ObjectRichCard
              descriptor={selected}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: sheetAskOpen ? RICH_W : OBJECT_W,
                margin: "0 auto",
              }}
              askOpen={sheetAskOpen}
              onAskChange={setSheetAskOpen}
            />
            <p className="mt-3 text-center text-sm font-semibold text-neutral-600">{selected.name}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {objects.map((o) => (
              <li key={o.objectId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(o.objectId)}
                  aria-label={`View ${o.name}`}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-full border border-[#E5E0D5] bg-white p-2 text-left text-[#1A1729] hover:border-[rgba(201,162,39,0.7)]"
                >
                  <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                    {o.imageSrc ? (
                      <img
                        src={o.imageSrc}
                        srcSet={o.imageSrcSet ?? undefined}
                        sizes="88px"
                        alt=""
                        aria-hidden="true"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white"
                        style={{
                          background: fyd.gradient.identity,
                        }}
                      >
                        {o.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 flex-1 text-sm font-semibold leading-tight">
                    {o.name}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
