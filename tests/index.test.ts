/**
 * Unit tests for the npm entry: `initializeEmbeds` scoping and re-exports.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeEmbeds, initializeAll, parseWidgetConfig, MK_VERSION } from "../src/index";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("initializeEmbeds", () => {
  it("only renders widgets under the provided root", () => {
    document.body.innerHTML = `
      <section id="inside">
        <div id="scoped" data-mk-widget="paywall" data-mk-key="pk_1"></div>
      </section>
      <div id="outside" data-mk-widget="paywall" data-mk-key="pk_2"></div>
    `;
    const configs = initializeEmbeds(document.getElementById("inside")!);
    expect(configs).toEqual([{ key: "pk_1", widget: "paywall", options: {} }]);
    expect(document.getElementById("scoped")!.getAttribute("data-mk-rendered")).toBe("true");
    expect(document.getElementById("outside")!.hasAttribute("data-mk-rendered")).toBe(false);
  });

  it("re-exports the shared renderer API", () => {
    expect(typeof initializeAll).toBe("function");
    expect(typeof parseWidgetConfig).toBe("function");
    expect(MK_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
