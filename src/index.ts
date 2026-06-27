/**
 * MonetizeKit Embed SDK
 *
 * Vanilla JS embed script for non-React applications.
 * Scans DOM for data-mk-widget attributes and renders widgets.
 *
 * Usage:
 * ```html
 * <script src="https://cdn.monetizekit.com/v1/embed.js"></script>
 * <div data-mk-widget="pricing-table"
 *      data-mk-key="pk_live_xxx"
 *      data-mk-highlight="growth"
 *      data-mk-theme="dark">
 * </div>
 * ```
 */

export interface EmbedConfig {
  key: string;
  widget: string;
  options: Record<string, string>;
}

/**
 * Scan DOM for data-mk-widget elements and initialize them.
 */
export function initializeEmbeds(): EmbedConfig[] {
  const elements = document.querySelectorAll("[data-mk-widget]");
  const configs: EmbedConfig[] = [];

  elements.forEach((element) => {
    const el = element as HTMLElement;
    const widget = el.getAttribute("data-mk-widget");
    const key = el.getAttribute("data-mk-key");

    if (!widget || !key) return;

    const options: Record<string, string> = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith("data-mk-") && attr.name !== "data-mk-widget" && attr.name !== "data-mk-key") {
        const optionKey = attr.name.replace("data-mk-", "");
        options[optionKey] = attr.value;
      }
    }

    configs.push({ key, widget, options });
  });

  return configs;
}

/**
 * Auto-initialize on DOMContentLoaded.
 */
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initializeEmbeds());
  } else {
    initializeEmbeds();
  }
}
