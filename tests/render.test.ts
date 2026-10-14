/**
 * Unit tests for the shared embed renderer: widget discovery from
 * `data-mk-widget` attributes, config/attribute parsing, and per-widget
 * rendering (paywall, pricing table, usage banner).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { initializeAll, initWidget, parseWidgetConfig } from "../src/render";

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

const growthPlan = {
  id: "plan_growth",
  name: "Growth",
  description: "For scaling teams",
  pricing: [
    { amount: 29, currency: "usd", interval: "monthly" },
    { amount: 290, currency: "usd", interval: "annually" },
  ],
  entitlements: [
    { featureDisplayName: "Seats", type: "number", value: 10 },
    { featureDisplayName: "SSO", type: "boolean", value: true },
  ],
  trialDays: 14,
};

const freePlan = {
  id: "plan_free",
  name: "Free",
  description: "Get started",
  pricing: [{ amount: 0, currency: "usd", interval: "monthly" }],
  entitlements: [{ featureDisplayName: "Seats", type: "number", value: 1 }],
  trialDays: null,
};

const draftPlan = {
  id: "plan_draft",
  name: "Draft",
  description: "Not yet published",
  pricing: [],
  entitlements: [],
  trialDays: null,
};

let logSpy: MockInstance;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parseWidgetConfig", () => {
  it("parses widget type, key, and strips the data-mk- prefix from options", () => {
    const el = mount(
      `<div data-mk-widget="pricing-table" data-mk-key="pk_live_123" data-mk-highlight="growth" data-mk-upgrade-url="https://example.com/upgrade"></div>`,
    );
    const config = parseWidgetConfig(el);
    expect(config).not.toBeNull();
    expect(config!.widget).toBe("pricing-table");
    expect(config!.key).toBe("pk_live_123");
    expect(config!.options).toEqual({
      highlight: "growth",
      "upgrade-url": "https://example.com/upgrade",
    });
    // The widget/key attributes must not leak into options.
    expect(config!.options).not.toHaveProperty("widget");
    expect(config!.options).not.toHaveProperty("key");
  });

  it("returns null when required attributes are missing", () => {
    const missingKey = mount(`<div data-mk-widget="paywall"></div>`);
    expect(parseWidgetConfig(missingKey)).toBeNull();

    const missingWidget = mount(`<div data-mk-key="pk_live_123"></div>`);
    expect(parseWidgetConfig(missingWidget)).toBeNull();
  });
});

describe("initializeAll", () => {
  it("discovers un-rendered widgets and returns serializable descriptors", () => {
    document.body.innerHTML = `
      <div id="a" data-mk-widget="paywall" data-mk-key="pk_1" data-mk-title="Locked"></div>
      <div id="b" data-mk-widget="customer-portal" data-mk-key="pk_2" data-mk-plan="Growth"></div>
    `;
    const configs = initializeAll();
    expect(configs).toEqual([
      { key: "pk_1", widget: "paywall", options: { title: "Locked" } },
      { key: "pk_2", widget: "customer-portal", options: { plan: "Growth" } },
    ]);
    // Descriptors are serializable — no DOM node attached.
    expect(configs[0]).not.toHaveProperty("element");
    expect(document.getElementById("a")!.getAttribute("data-mk-rendered")).toBe("true");
    expect(document.getElementById("b")!.getAttribute("data-mk-rendered")).toBe("true");
  });

  it("skips elements that are already rendered", () => {
    mount(
      `<div data-mk-widget="paywall" data-mk-key="pk_1" data-mk-rendered="true">existing</div>`,
    );
    const configs = initializeAll();
    expect(configs).toEqual([]);
    expect(document.body.firstElementChild!.innerHTML).toBe("existing");
  });

  it("ignores widget elements missing the required data-mk-key", () => {
    const el = mount(`<div data-mk-widget="paywall"></div>`);
    const configs = initializeAll();
    expect(configs).toEqual([]);
    expect(el.innerHTML).toBe("");
    expect(el.hasAttribute("data-mk-rendered")).toBe(false);
  });
});

describe("initWidget", () => {
  it("logs and leaves the element untouched for unknown widget types", async () => {
    const el = mount(`<div data-mk-widget="fancy-chart" data-mk-key="pk_1"></div>`);
    const config = parseWidgetConfig(el)!;
    await initWidget(config);
    expect(el.innerHTML).toBe("");
    expect(el.hasAttribute("data-mk-rendered")).toBe(false);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("[MonetizeKit Embed"),
      "Unknown widget type: fancy-chart",
    );
  });
});

describe("paywall widget", () => {
  it("renders default copy when no options are provided", async () => {
    const el = mount(`<div data-mk-widget="paywall" data-mk-key="pk_1"></div>`);
    await initWidget(parseWidgetConfig(el)!);
    expect(el.getAttribute("data-mk-rendered")).toBe("true");
    expect(el.textContent).toContain("Upgrade to unlock this feature");
    expect(el.querySelector("a")!.getAttribute("href")).toBe("#");
  });

  it("escapes HTML in user-supplied options", async () => {
    const el = mount(`<div data-mk-widget="paywall" data-mk-key="pk_1"></div>`);
    el.setAttribute("data-mk-title", `<img src=x onerror=alert(1)>`);
    await initWidget(parseWidgetConfig(el)!);
    expect(el.querySelector("img")).toBeNull();
    expect(el.innerHTML).toContain("&lt;img");
  });
});

describe("pricing-table widget", () => {
  it("fetches plans with the publishable key and renders published plans only", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [growthPlan, freePlan, draftPlan] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const el = mount(
      `<div data-mk-widget="pricing-table" data-mk-key="pk_live_123" data-mk-base-url="https://api.example.com" data-mk-highlight="growth"></div>`,
    );
    await initWidget(parseWidgetConfig(el)!);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/plans?page=1&pageSize=50",
      { headers: { Authorization: "Bearer pk_live_123" } },
    );
    expect(el.textContent).toContain("Growth");
    expect(el.textContent).toContain("$29");
    expect(el.textContent).toContain("14-day free trial");
    // Highlighted plan gets the badge.
    expect(el.textContent).toContain("Most Popular");
    // Zero-price plan renders as Free.
    expect(el.textContent).toContain("Free");
    expect(el.textContent).toContain("Get Started");
    // Plans with no pricing terms are filtered out.
    expect(el.textContent).not.toContain("Draft");
  });

  it("renders annual pricing when data-mk-billing is annually", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [growthPlan] }) }),
    );
    const el = mount(
      `<div data-mk-widget="pricing-table" data-mk-key="pk_1" data-mk-billing="annually"></div>`,
    );
    await initWidget(parseWidgetConfig(el)!);
    expect(el.textContent).toContain("$290");
    expect(el.textContent).toContain("/yr");
  });

  it("renders an empty state when the plans API fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const el = mount(`<div data-mk-widget="pricing-table" data-mk-key="pk_bad"></div>`);
    await initWidget(parseWidgetConfig(el)!);
    expect(el.getAttribute("data-mk-rendered")).toBe("true");
    expect(el.textContent).toContain("No published plans available.");
  });
});

describe("usage-banner widget", () => {
  it("renders formatted usage against the limit with a proportional bar", async () => {
    const el = mount(
      `<div data-mk-widget="usage-banner" data-mk-key="pk_1" data-mk-label="API calls" data-mk-current="1500" data-mk-limit="2000"></div>`,
    );
    await initWidget(parseWidgetConfig(el)!);
    const fmt = (n: number) => new Intl.NumberFormat().format(n);
    expect(el.textContent).toContain("API calls");
    expect(el.textContent).toContain(`${fmt(1500)} / ${fmt(2000)}`);
    expect(el.innerHTML).toContain("width:75%");
    expect(el.textContent).not.toContain("Over included allotment");
  });

  it("shows the overage notice when usage exceeds the limit", async () => {
    const el = mount(
      `<div data-mk-widget="usage-banner" data-mk-key="pk_1" data-mk-current="120" data-mk-limit="100"></div>`,
    );
    await initWidget(parseWidgetConfig(el)!);
    // Bar is clamped at 100% even when over.
    expect(el.innerHTML).toContain("width:100%");
    expect(el.textContent).toContain("Over included allotment");
  });
});

describe("theme resolution", () => {
  it("applies preset tokens with per-attribute overrides winning", async () => {
    const dark = mount(`<div data-mk-widget="paywall" data-mk-key="pk_1" data-mk-preset="dark"></div>`);
    await initWidget(parseWidgetConfig(dark)!);
    expect(dark.innerHTML).toContain("background:#0a0a0a");

    const overridden = mount(
      `<div data-mk-widget="paywall" data-mk-key="pk_1" data-mk-preset="dark" data-mk-bg="#123456"></div>`,
    );
    await initWidget(parseWidgetConfig(overridden)!);
    expect(overridden.innerHTML).toContain("background:#123456");
    expect(overridden.innerHTML).not.toContain("background:#0a0a0a");
  });
});
