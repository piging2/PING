/**
 * @piging2/react-renderer: the presentation adapter.
 *
 * SemanticRenderModel (+ public facts) -> React -> static HTML.
 * React owns no facts, evidence, objects, SiteSpec, capabilities, or
 * authority. See README.md for the input contract and the boundary.
 */

export {
  factsFromProjection,
  type FactsById,
  type PublicObjectFacts,
} from "./facts";
export {
  REACT_RENDERER_VERSION,
  renderModelToStaticHtml,
  renderPageModel,
  renderSectionModel,
  type RenderOptions,
} from "./render";
export {
  BusinessLogoMark,
  BusinessLogoOverlay,
  LOGO_OVERLAY_CSS,
  resolveLogoMark,
  type LogoMarkId,
} from "./marks";
