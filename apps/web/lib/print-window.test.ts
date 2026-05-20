/**
 * Regression tests for the print/save flow.
 *
 * Background: `window.open("", "_blank", "noopener,noreferrer")` returns `null`
 * in Chrome / Firefox / Safari, which silently breaks the "Print / Save PDF"
 * button in the prescription preview modal. Tests below pin the contract so
 * that bug cannot regress without us noticing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openRxPrintWindow } from "@homeoassist/print";

type StubWindow = {
  document: {
    open: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    readyState: string;
    title: string;
  };
  focus: ReturnType<typeof vi.fn>;
  print: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

function makeStubWindow(opts: { readyState?: string } = {}): StubWindow {
  return {
    document: {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      readyState: opts.readyState ?? "complete",
      title: ""
    },
    focus: vi.fn(),
    print: vi.fn(),
    addEventListener: vi.fn()
  };
}

describe("openRxPrintWindow", () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;

  beforeEach(() => {
    originalWindow = (globalThis as { window?: typeof globalThis.window }).window;
    originalDocument = (globalThis as { document?: typeof globalThis.document }).document;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: typeof globalThis.window }).window = originalWindow;
    }
    if (originalDocument === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document?: typeof globalThis.document }).document = originalDocument;
    }
    vi.restoreAllMocks();
  });

  it("calls window.open WITHOUT noopener/noreferrer (so we keep the handle)", () => {
    const stub = makeStubWindow();
    const openSpy = vi.fn().mockReturnValue(stub);
    (globalThis as { window?: unknown }).window = {
      open: openSpy
    } as unknown as typeof globalThis.window;

    openRxPrintWindow("<!DOCTYPE html><html><head></head><body>Rx</body></html>", "Rx test");

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [target, name, features] = openSpy.mock.calls[0]!;
    expect(target).toBe("");
    expect(name).toBe("_blank");
    expect(features ?? "").not.toContain("noopener");
    expect(features ?? "").not.toContain("noreferrer");
  });

  it("writes the HTML into the popup and triggers print", () => {
    const stub = makeStubWindow({ readyState: "complete" });
    (globalThis as { window?: unknown }).window = {
      open: vi.fn().mockReturnValue(stub)
    } as unknown as typeof globalThis.window;

    openRxPrintWindow("<!DOCTYPE html><html><head><title>old</title></head><body>Rx</body></html>", "My prescription");

    expect(stub.document.open).toHaveBeenCalled();
    expect(stub.document.write).toHaveBeenCalledTimes(1);
    const written = stub.document.write.mock.calls[0]![0] as string;
    expect(written).toContain("<title>My prescription</title>");
    expect(stub.document.close).toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(stub.print).toHaveBeenCalled();
  });

  it("falls back to a downloadable blob when the popup is blocked (window.open → null)", () => {
    const clickSpy = vi.fn();
    const fakeAnchor = {
      href: "",
      download: "",
      click: clickSpy,
      remove: vi.fn()
    };
    (globalThis as { document?: unknown }).document = {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: { appendChild: vi.fn() }
    } as unknown as typeof globalThis.document;
    (globalThis as { window?: unknown }).window = {
      open: vi.fn().mockReturnValue(null)
    } as unknown as typeof globalThis.window;

    const originalBlob = (globalThis as { Blob?: typeof Blob }).Blob;
    const originalUrl = (globalThis as { URL?: typeof URL }).URL;
    (globalThis as { Blob?: unknown }).Blob = class {
      constructor(parts: unknown[], _opts?: unknown) {
        void parts;
      }
    } as unknown as typeof Blob;
    (globalThis as { URL?: unknown }).URL = {
      createObjectURL: vi.fn().mockReturnValue("blob:rx"),
      revokeObjectURL: vi.fn()
    } as unknown as typeof URL;

    try {
      openRxPrintWindow("<html><body>Rx</body></html>", "Fallback test");
      expect(clickSpy).toHaveBeenCalled();
      expect(fakeAnchor.download.toLowerCase().endsWith(".html")).toBe(true);
    } finally {
      (globalThis as { Blob?: typeof Blob }).Blob = originalBlob;
      (globalThis as { URL?: typeof URL }).URL = originalUrl;
    }
  });

  it("is a no-op on the server (no window)", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(() => openRxPrintWindow("<html></html>", "x")).not.toThrow();
  });
});
