/**
 * MonetizeKit Embed Script — cdn.monetizekit.com/v1/embed.js
 * 
 * Self-initializing IIFE that scans the DOM for data-mk-widget elements
 * and renders MonetizeKit widgets (pricing tables, paywalls, portals, banners).
 *
 * Usage:
 * ```html
 * <script src="https://entitlements.c9d.dev/v1/embed.js"></script>
 * <div data-mk-widget="pricing-table"
 *      data-mk-key="pk_live_xxxx"
 *      data-mk-highlight="growth"
 *      data-mk-billing="monthly"
 *      data-mk-theme="dark">
 * </div>
 * ```
 */

interface WidgetConfig {
  element: HTMLElement;
  widget: string;
  key: string;
  options: Record<string, string>;
}

interface PlanData {
  id: string;
  name: string;
  description: string;
  pricing: Array<{ amount: number; currency: string; interval: string }>;
  entitlements: Array<{ featureDisplayName: string; type: string; value: unknown }>;
  trialDays: number | null;
}

const MK_VERSION = "1.0.0";
const MK_BASE_URL_ATTR = "data-mk-base-url";

/**
 * Theme tokens — mirrors the @monetizekit/react token contract so embed and
 * React renders match. Selected via `data-mk-preset` (memphis|dashboard|light|
 * dark) and overridable per-token via data-mk-* attributes
 * (e.g. data-mk-primary, data-mk-accent, data-mk-radius, data-mk-font).
 */
interface ThemeTokens {
  bg: string;
  fg: string;
  muted: string;
  primary: string;
  primaryFg: string;
  accent: string;
  border: string;
  radius: string;
  font: string;
}

const SYSTEM_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

const THEME_PRESETS: Record<string, ThemeTokens> = {
  light: { bg: "#ffffff", fg: "#0a0a0a", muted: "#71717a", primary: "#4f46e5", primaryFg: "#ffffff", accent: "#10b981", border: "#e4e4e7", radius: "0.5rem", font: SYSTEM_FONT },
  dark: { bg: "#0a0a0a", fg: "#fafafa", muted: "#a1a1aa", primary: "#6366f1", primaryFg: "#0a0a0a", accent: "#10b981", border: "#27272a", radius: "0.5rem", font: SYSTEM_FONT },
  memphis: { bg: "#FFFEF2", fg: "#1a1a1a", muted: "#5b5b52", primary: "#FF6B35", primaryFg: "#1a1a1a", accent: "#00D9FF", border: "#1a1a1a", radius: "0", font: SYSTEM_FONT },
  dashboard: { bg: "#ffffff", fg: "#171717", muted: "#737373", primary: "#171717", primaryFg: "#fafafa", accent: "#f5f5f5", border: "#e5e5e5", radius: "0.625rem", font: SYSTEM_FONT },
};

/**
 * Resolve theme tokens from widget options. Precedence: explicit per-token
 * data-mk-* override > preset > legacy `data-mk-theme` (auto|light|dark).
 */
function resolveTokens(options: Record<string, string>): ThemeTokens {
  let presetName = options.preset;
  if (!presetName) {
    const theme = options.theme ?? "auto";
    const isDark =
      theme === "dark" ||
      (theme === "auto" &&
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    presetName = isDark ? "dark" : "light";
  }
  const base = THEME_PRESETS[presetName] ?? THEME_PRESETS.light;
  return {
    bg: options.bg ?? base.bg,
    fg: options.fg ?? base.fg,
    muted: options.muted ?? base.muted,
    primary: options.primary ?? base.primary,
    primaryFg: options["primary-fg"] ?? base.primaryFg,
    accent: options.accent ?? base.accent,
    border: options.border ?? base.border,
    radius: options.radius ?? base.radius,
    font: options.font ?? base.font,
  };
}

function log(msg: string) {
  console.log(`[MonetizeKit Embed v${MK_VERSION}]`, msg);
}

function getBaseUrl(element: HTMLElement): string {
  return element.getAttribute(MK_BASE_URL_ATTR) || 
         document.querySelector(`[${MK_BASE_URL_ATTR}]`)?.getAttribute(MK_BASE_URL_ATTR) ||
         window.location.origin;
}

function parseWidgetConfig(element: HTMLElement): WidgetConfig | null {
  const widget = element.getAttribute("data-mk-widget");
  const key = element.getAttribute("data-mk-key");
  if (!widget || !key) return null;

  const options: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.startsWith("data-mk-") && !["data-mk-widget", "data-mk-key"].includes(attr.name)) {
      options[attr.name.replace("data-mk-", "")] = attr.value;
    }
  }

  return { element, widget, key, options };
}

async function fetchPlans(baseUrl: string, apiKey: string): Promise<PlanData[]> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/plans?page=1&pageSize=50`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.data ?? [];
  } catch (err) {
    log(`Failed to fetch plans: ${err}`);
    return [];
  }
}

function renderPricingTable(config: WidgetConfig, plans: PlanData[]) {
  const { element, options } = config;
  const highlight = options.highlight ?? "";
  const billing = options.billing ?? "monthly";

  const t = resolveTokens(options);
  const bg = t.bg;
  const text = t.fg;
  const muted = t.muted;
  const border = t.border;
  const accent = t.accent;

  const publishedPlans = plans.filter(p => p.pricing.length > 0);

  const planCards = publishedPlans.map(plan => {
    const monthlyTerm = plan.pricing.find(p => p.interval === "monthly");
    const annualTerm = plan.pricing.find(p => p.interval === "annually");
    const price = billing === "annually" && annualTerm ? annualTerm.amount : (monthlyTerm?.amount ?? 0);
    const interval = billing === "annually" ? "/yr" : "/mo";
    const isHighlighted = plan.name.toLowerCase() === highlight.toLowerCase();

    const features = plan.entitlements.map(e => {
      const val = e.type === "boolean" ? (e.value ? "✓" : "—") : String(e.value);
      return `<div style="display:flex;align-items:center;gap:8px;font-size:14px;padding:4px 0">
        <span style="color:${accent};font-weight:bold">${val}</span>
        <span>${e.featureDisplayName}</span>
      </div>`;
    }).join("");

    return `<div style="flex:1;min-width:250px;max-width:350px;border:${isHighlighted ? 2 : 1}px solid ${isHighlighted ? t.primary : border};border-radius:${t.radius};padding:24px">
      ${isHighlighted ? `<div style="font-size:11px;font-weight:600;color:${t.primary};text-transform:uppercase;margin-bottom:8px">Most Popular</div>` : ""}
      <h3 style="font-size:20px;font-weight:700;margin:0 0 4px">${plan.name}</h3>
      <p style="font-size:13px;color:${muted};margin:0 0 16px">${plan.description}</p>
      <div style="margin-bottom:16px">
        <span style="font-size:36px;font-weight:800">${price === 0 ? "Free" : `$${price}`}</span>
        ${price > 0 ? `<span style="font-size:14px;color:${muted}">${interval}</span>` : ""}
      </div>
      ${plan.trialDays ? `<div style="font-size:12px;color:${accent};margin-bottom:12px">${plan.trialDays}-day free trial</div>` : ""}
      <button style="width:100%;padding:10px;border-radius:${t.radius};border:none;background:${isHighlighted ? t.primary : border};color:${isHighlighted ? t.primaryFg : text};font-weight:600;cursor:pointer;font-size:14px;margin-bottom:16px">
        ${price === 0 ? "Get Started" : plan.trialDays ? `Start ${plan.trialDays}-day trial` : "Upgrade"}
      </button>
      <div style="border-top:1px solid ${border};padding-top:12px">
        ${features}
      </div>
    </div>`;
  }).join("");

  element.innerHTML = `<div style="font-family:${t.font};color:${text};background:${bg};padding:16px">
    <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center">
      ${planCards || `<p style="color:${muted}">No published plans available.</p>`}
    </div>
  </div>`;
  element.setAttribute("data-mk-rendered", "true");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPaywall(config: WidgetConfig) {
  const { element, options } = config;
  const t = resolveTokens(options);
  const title = escapeHtml(options.title ?? "Upgrade to unlock this feature");
  const description = escapeHtml(
    options.description ?? "This feature isn't included in your current plan.",
  );
  const cta = escapeHtml(options.cta ?? "Upgrade");
  const href = options["upgrade-url"] ?? "#";
  element.innerHTML = `<div data-mk-component="paywall" style="font-family:${t.font};color:${t.fg};background:${t.bg};border:1px solid ${t.border};border-radius:${t.radius};padding:32px;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center">
    <h3 style="margin:0;font-size:18px;font-weight:700">${title}</h3>
    <p style="margin:0;font-size:14px;color:${t.muted}">${description}</p>
    <a href="${escapeHtml(href)}" style="background:${t.primary};color:${t.primaryFg};border-radius:${t.radius};padding:10px 20px;font-weight:600;text-decoration:none;font-size:14px">${cta}</a>
  </div>`;
  element.setAttribute("data-mk-rendered", "true");
}

function renderUsageBanner(config: WidgetConfig) {
  const { element, options } = config;
  const t = resolveTokens(options);
  const label = escapeHtml(options.label ?? "Usage");
  const current = Number(options.current ?? "0");
  const limit = options.limit ? Number(options.limit) : null;
  const hasLimit = typeof limit === "number" && limit > 0;
  const fraction = hasLimit ? Math.min(1, current / (limit as number)) : 0;
  const over = hasLimit && current > (limit as number);
  const barColor = over || fraction >= 0.8 ? t.primary : t.accent;
  const fmt = (n: number) => new Intl.NumberFormat().format(n);
  element.innerHTML = `<div data-mk-component="usage-banner" style="font-family:${t.font};color:${t.fg};background:${t.bg};border:1px solid ${t.border};border-radius:${t.radius};padding:14px 16px;display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;font-size:14px">
      <span style="font-weight:600">${label}</span>
      <span style="color:${t.muted}">${fmt(current)}${hasLimit ? ` / ${fmt(limit as number)}` : ""}</span>
    </div>
    ${hasLimit ? `<div style="height:6px;border-radius:999px;background:${t.border};overflow:hidden"><div style="width:${fraction * 100}%;height:100%;background:${barColor}"></div></div>` : ""}
    ${over ? `<span style="color:${t.primary};font-size:12px">Over included allotment — overage billed per usage pricing.</span>` : ""}
  </div>`;
  element.setAttribute("data-mk-rendered", "true");
}

function renderCustomerPortal(config: WidgetConfig) {
  const { element, options } = config;
  const t = resolveTokens(options);
  const planName = escapeHtml(options.plan ?? "Current plan");
  const manageUrl = options["manage-url"] ?? "#";
  element.innerHTML = `<div data-mk-component="customer-portal" style="font-family:${t.font};color:${t.fg};background:${t.bg};border:1px solid ${t.border};border-radius:${t.radius};padding:20px;max-width:480px;display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:12px;color:${t.muted}">Plan</div>
        <div style="font-size:18px;font-weight:700">${planName}</div>
      </div>
      <a href="${escapeHtml(manageUrl)}" style="background:${t.primary};color:${t.primaryFg};border-radius:${t.radius};padding:8px 14px;font-weight:600;text-decoration:none;font-size:14px">Manage billing</a>
    </div>
  </div>`;
  element.setAttribute("data-mk-rendered", "true");
}

async function initWidget(config: WidgetConfig) {
  const baseUrl = getBaseUrl(config.element);
  
  switch (config.widget) {
    case "pricing-table": {
      const plans = await fetchPlans(baseUrl, config.key);
      renderPricingTable(config, plans);
      break;
    }
    case "paywall":
      renderPaywall(config);
      break;
    case "usage-banner":
      renderUsageBanner(config);
      break;
    case "customer-portal":
      renderCustomerPortal(config);
      break;
    default:
      log(`Unknown widget type: ${config.widget}`);
  }
}

function initializeAll() {
  const elements = document.querySelectorAll("[data-mk-widget]:not([data-mk-rendered])");
  log(`Found ${elements.length} widget(s) to initialize`);
  
  elements.forEach(el => {
    const config = parseWidgetConfig(el as HTMLElement);
    if (config) {
      initWidget(config);
    }
  });
}

// Auto-initialize
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAll);
  } else {
    initializeAll();
  }
}

// Expose for manual re-initialization
(window as unknown as Record<string, unknown>).MonetizeKit = {
  version: MK_VERSION,
  init: initializeAll,
};
