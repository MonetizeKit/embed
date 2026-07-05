/**
 * MonetizeKit Embed SDK (npm entry)
 *
 * Vanilla-JS embed for non-React apps. Unlike a script-tag include, importing
 * this module lets you control when widgets render.
 *
 * ```ts
 * import { initializeEmbeds } from "@monetizekit/embed";
 * // Renders every `data-mk-widget` element found in the DOM:
 * const rendered = initializeEmbeds();
 * ```
 *
 * Or via the CDN bundle (auto-renders on load):
 * ```html
 * <script src="https://app.monetizekit.app/v1/embed.js"></script>
 * <div data-mk-widget="pricing-table" data-mk-key="pk_live_xxx"></div>
 * ```
 */
import { initializeAll, type EmbedConfig } from "./render";

export { initializeAll, initWidget, parseWidgetConfig, MK_VERSION } from "./render";
export type { EmbedConfig, WidgetConfig } from "./render";

/**
 * Scan the DOM for `data-mk-widget` elements and render each MonetizeKit
 * widget. Returns the descriptors that were initialized.
 */
export function initializeEmbeds(root: ParentNode = document): EmbedConfig[] {
  return initializeAll(root);
}

// Convenience auto-init so a bare `import "@monetizekit/embed"` still renders.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initializeEmbeds());
  } else {
    initializeEmbeds();
  }
}
