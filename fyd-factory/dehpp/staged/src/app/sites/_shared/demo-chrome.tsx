/**
 * DemoChrome: the operator surface for the FYD Social generated-site demo.
 * Wraps CustomerSite with the demo header, validation status, validator
 * notes, the structured editor, and the dev-only owner-mode panel. Rendered
 * only when the deployment resolves chromeMode "demo" (P2); customer mode
 * renders CustomerSite alone with none of this DOM present.
 */

"use client";

import { useState } from "react";
import { resolveQuery } from "@/fyd/components/renderer";
import { getComponentDef } from "@/fyd/components/registry";
import {
  applySitePatch,
  proposeSitePatch,
  type SiteIntent,
  type SitePatchBody,
} from "@/fyd/proceduralize/patch";
import type {
  FYDSiteSpec,
  FYDThemeTokens,
  ObjectGraph,
} from "@/fyd/sitespec/types";
import { DemoOwnerMode } from "@/fyd/owner-mode/demo-owner-mode";
import { CustomerSite } from "./customer-site";
import type { ComposedSite } from "./compose-site";

export function DemoChrome({ site }: { site: ComposedSite }) {
  const [spec, setSpec] = useState<FYDSiteSpec>(site.spec);
  const [activeSlug, setActiveSlug] = useState(
    site.spec.navigation[0]?.pageSlug ?? "home",
  );
  const [proposal, setProposal] = useState<SitePatchBody | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);

  const page = spec.pages.find((p) => p.slug === activeSlug) ?? spec.pages[0];
  const notes = site.findings.filter((f) => f.severity !== "error");

  const runIntent = (intent: SiteIntent) => {
    setPatchError(null);
    const result = proposeSitePatch(spec, intent);
    if (!result.ok || !result.proposal) {
      setPatchError(result.error ?? "Invalid intent.");
      setProposal(null);
      return;
    }
    setProposal(result.proposal);
  };

  const approveProposal = () => {
    if (!proposal) return;
    setSpec(applySitePatch(spec, proposal));
    setProposal(null);
  };

  return (
    <div>
      {/* FYD Social demo header. Product surface says FYD Social. */}
      <header className="border-b border-border-soft bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              FYD Social
            </p>
            <h1 className="text-xl font-bold">Generated site demo</h1>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-accent">
            Procedural clone proof
          </span>
        </div>
      </header>

      {/* Validation status. An invalid spec never renders. */}
      {!site.renderable ? (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <h2 className="text-lg font-semibold text-red-700">
            Spec failed validation
          </h2>
          <ul className="mt-3 list-disc pl-5 text-sm">
            {site.findings
              .filter((f) => f.severity === "error")
              .map((f, i) => (
                <li key={i}>
                  {f.path}: {f.message}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <CustomerSite
        spec={spec}
        graph={site.graph}
        renderable={site.renderable}
        siteId={site.tenantId}
        heroMedia={site.heroMedia}
        galleryMedia={site.galleryMedia}
        objectMedia={site.objectMedia}
        provenanceSentence={site.provenanceSentence}
        activeSlug={activeSlug}
        onActiveSlugChange={setActiveSlug}
      />

      {/* Validator notes: operator tooling, demo only. */}
      {notes.length > 0 && (
        <div className="border-t border-border-soft bg-background">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-accent sm:px-6">
            <details>
              <summary className="cursor-pointer underline">
                Validator notes ({notes.length})
              </summary>
              <ul className="mt-2 list-disc pl-5">
                {notes.map((f, i) => (
                  <li key={i}>
                    [{f.severity}] {f.path}: {f.message}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      )}

      {/* Structured editor. */}
      <section className="border-t-4 border-primary bg-background">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <h2 className="text-2xl font-semibold">Customize this site</h2>
          <p className="mt-2 max-w-2xl text-sm text-accent">
            Structured editing only: reorder sections, hide or show them, pick
            featured objects, propose copy edits, tune basic design tokens.
            Every change becomes a proposal with a digest. Copy and token edits
            stay drafts until the digest is approved.
          </p>
          {page && (
            <EditorPanel
              spec={spec}
              graph={site.graph}
              pageSlug={page.slug}
              onIntent={runIntent}
            />
          )}
          {patchError && (
            <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {patchError}
            </p>
          )}
          {proposal && (
            <div className="mt-4 rounded border border-border-soft bg-surface p-4">
              <h3 className="font-semibold">Proposed change</h3>
              <pre className="mt-2 overflow-x-auto rounded bg-primary p-3 text-xs text-primary-foreground">
                {JSON.stringify(proposal, null, 2)}
              </pre>
              <p className="mt-2 text-xs text-accent">
                Digest:{" "}
                <code className="break-all">{proposal.proposalDigest}</code>
              </p>
              <p className="mt-1 text-xs text-accent">
                Draft only. Approving applies it to this demo preview.
              </p>
              <button
                onClick={approveProposal}
                className="mt-3 rounded bg-honey px-5 py-2 text-sm font-semibold text-honey-foreground"
              >
                Approve and apply to preview
              </button>
            </div>
          )}
        </div>
      </section>

      <DemoOwnerMode siteId={site.tenantId} />
    </div>
  );
}

function EditorPanel({
  spec,
  graph,
  pageSlug,
  onIntent,
}: {
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  pageSlug: string;
  onIntent: (intent: SiteIntent) => void;
}) {
  const page = spec.pages.find((p) => p.slug === pageSlug);
  const [copyDrafts, setCopyDrafts] = useState<
    Record<string, { heading: string; copy: string }>
  >({});
  const [tokenDrafts, setTokenDrafts] = useState<
    Partial<Record<keyof FYDThemeTokens, string>>
  >({});
  if (!page) return null;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {page.sections.map((s, i) => {
        const def = getComponentDef(s.component);
        const objects = resolveQuery(s.query, graph, spec.ownerObjectId);
        const draft = copyDrafts[s.id] ?? {
          heading: s.presentation.heading ?? "",
          copy: s.presentation.copy ?? "",
        };
        return (
          <div
            key={s.id}
            className="rounded border border-border-soft bg-surface p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {def?.label ?? s.component}{" "}
                  <span className="text-xs font-normal text-accent">
                    ({s.id})
                  </span>
                </p>
                <p className="text-xs text-accent">
                  {objects.length} object{objects.length === 1 ? "" : "s"}{" "}
                  resolved
                  {s.presentation.hidden ? " - hidden" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded border border-border-soft px-3 py-1 text-xs"
                  disabled={i === 0}
                  onClick={() =>
                    onIntent({
                      kind: "reorder_section",
                      pageSlug,
                      sectionId: s.id,
                      toIndex: i - 1,
                    })
                  }
                >
                  Up
                </button>
                <button
                  className="rounded border border-border-soft px-3 py-1 text-xs"
                  disabled={i === page.sections.length - 1}
                  onClick={() =>
                    onIntent({
                      kind: "reorder_section",
                      pageSlug,
                      sectionId: s.id,
                      toIndex: i + 1,
                    })
                  }
                >
                  Down
                </button>
                <button
                  className="rounded border border-border-soft px-3 py-1 text-xs"
                  onClick={() =>
                    onIntent({
                      kind: "toggle_section",
                      pageSlug,
                      sectionId: s.id,
                      hidden: !s.presentation.hidden,
                    })
                  }
                >
                  {s.presentation.hidden ? "Show" : "Hide"}
                </button>
              </div>
            </div>

            {objects.length > 1 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Featured
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {objects.map((o) => {
                    const active =
                      s.presentation.featuredIds?.includes(o.id) ?? false;
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          const current = new Set(
                            s.presentation.featuredIds ??
                              objects.map((x) => x.id),
                          );
                          if (active) current.delete(o.id);
                          else current.add(o.id);
                          onIntent({
                            kind: "set_featured",
                            pageSlug,
                            sectionId: s.id,
                            objectIds: [...current],
                          });
                        }}
                        className={
                          "rounded-full border px-3 py-1 text-xs " +
                          (active
                            ? "bg-primary text-primary-foreground"
                            : "border-border-soft")
                        }
                      >
                        {o.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="rounded border border-border-soft bg-background px-3 py-2 text-sm"
                placeholder="Proposed heading"
                value={draft.heading}
                onChange={(e) =>
                  setCopyDrafts({
                    ...copyDrafts,
                    [s.id]: { ...draft, heading: e.target.value },
                  })
                }
                aria-label={"Proposed heading for " + s.id}
              />
              <input
                className="rounded border border-border-soft bg-background px-3 py-2 text-sm"
                placeholder="Proposed copy"
                value={draft.copy}
                onChange={(e) =>
                  setCopyDrafts({
                    ...copyDrafts,
                    [s.id]: { ...draft, copy: e.target.value },
                  })
                }
                aria-label={"Proposed copy for " + s.id}
              />
            </div>
            <button
              className="mt-2 rounded border border-border-soft px-3 py-1 text-xs"
              onClick={() =>
                onIntent({
                  kind: "edit_copy",
                  pageSlug,
                  sectionId: s.id,
                  heading: draft.heading || undefined,
                  copy: draft.copy || undefined,
                })
              }
            >
              Propose copy edit
            </button>
          </div>
        );
      })}

      <div className="rounded border border-border-soft bg-surface p-4">
        <p className="font-semibold">Design tokens</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["accent", "surface", "ink"] as (keyof FYDThemeTokens)[]).map(
            (token) => (
              <label key={token} className="flex items-center gap-2 text-sm">
                <span className="w-20 capitalize text-accent">{token}</span>
                <input
                  className="min-w-0 flex-1 rounded border border-border-soft bg-background px-3 py-2 text-sm"
                  value={tokenDrafts[token] ?? String(spec.themeTokens[token])}
                  onChange={(e) =>
                    setTokenDrafts({ ...tokenDrafts, [token]: e.target.value })
                  }
                />
                <button
                  className="rounded border border-border-soft px-3 py-1 text-xs"
                  onClick={() => {
                    const value = (
                      tokenDrafts[token] ?? String(spec.themeTokens[token])
                    ).trim();
                    onIntent({ kind: "set_theme_token", token, value });
                  }}
                >
                  Propose
                </button>
              </label>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
