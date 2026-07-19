import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLogisticsProvider } from "../../lib/logistics";
import { ShiprocketProvider } from "../../lib/logistics/shiprocket";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Logistics Provider Abstraction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should resolve shiprocket provider by name", () => {
    const provider = getLogisticsProvider("shiprocket");
    expect(provider).toBeInstanceOf(ShiprocketProvider);
    expect(provider.name).toBe("shiprocket");
  });

  it("should throw error for unsupported provider", () => {
    expect(() => getLogisticsProvider("unsupported")).toThrowError(
      "Unsupported logistics provider: unsupported"
    );
  });
});

describe("Shiprocket Provider implementation", () => {
  let provider: ShiprocketProvider;

  beforeEach(() => {
    provider = new ShiprocketProvider();
    vi.resetAllMocks();
    process.env.SHIPROCKET_EMAIL = "test@meditonic.com";
    process.env.SHIPROCKET_PASSWORD = "testpassword";
  });

  it("should check serviceability successfully when couriers are available", async () => {
    // 1. Mock auth token login response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "mock_jwt_token" }),
    });

    // 2. Mock serviceability response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 200,
        data: {
          available_courier_companies: [
            { courier_name: "Delhivery", rate: "65.50", cod: 1, etd_hours: 48 },
            { courier_name: "BlueDart", rate: "85.00", cod: 0, etd_hours: 24 }
          ]
        }
      }),
    });

    const result = await provider.checkServiceability({
      pickupPincode: "110001",
      deliveryPincode: "500001",
      weightGrams: 500,
      isCod: true
    });

    expect(result.isServiceable).toBe(true);
    expect(result.codAvailable).toBe(true);
    expect(result.shippingCharge).toBe(65.50);
    expect(result.estimatedDays).toBe(2);
    expect(result.carrierName).toBe("Delhivery");
  });

  it("should return unserviceable fallback when no couriers are found", async () => {
    // Mock token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "mock_jwt_token" }),
    });

    // Mock empty couriers list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 200,
        data: {
          available_courier_companies: []
        }
      }),
    });

    const result = await provider.checkServiceability({
      pickupPincode: "110001",
      deliveryPincode: "999999",
      weightGrams: 500,
      isCod: false
    });

    expect(result.isServiceable).toBe(false);
    expect(result.codAvailable).toBe(false);
    expect(result.shippingCharge).toBe(0);
    expect(result.carrierName).toBe("");
  });

  it("should return unserviceable when checkServiceability API fails", async () => {
    // Mock login token success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "mock_jwt_token" }),
    });

    // Mock API fetch failure
    mockFetch.mockRejectedValueOnce(new Error("API Down"));

    const result = await provider.checkServiceability({
      pickupPincode: "110001",
      deliveryPincode: "500001",
      weightGrams: 500,
      isCod: false
    });

    expect(result.isServiceable).toBe(false);
    expect(result.codAvailable).toBe(false);
    expect(result.shippingCharge).toBe(0);
    expect(result.carrierName).toBe("");
  });
});
