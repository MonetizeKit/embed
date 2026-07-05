/**
 * MonetizeKit Embed Script — served at `${appOrigin}/v1/embed.js`
 * (e.g. https://app.monetizekit.app/v1/embed.js).
 *
 * Self-initializing IIFE that scans the DOM for `data-mk-widget` elements and
 * renders MonetizeKit widgets (pricing tables, paywalls, portals, banners).
 * The rendering logic lives in `./render` so the npm entry can share it.
 *
 * Usage:
 * ```html
 * <script src="https://app.monetizekit.app/v1/embed.js"></script>
 * <div data-mk-widget="pricing-table"
 *      data-mk-key="pk_live_xxxx"
 *      data-mk-highlight="growth"
 *      data-mk-billing="monthly"
 *      data-mk-preset="dark">
 * </div>
 * ```
 */
import { initializeAll, MK_VERSION } from "./render";

// Auto-initialize on load.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initializeAll());
  } else {
    initializeAll();
  }
}

// Expose for manual re-initialization.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).MonetizeKit = {
    version: MK_VERSION,
    init: () => initializeAll(),
  };
}
