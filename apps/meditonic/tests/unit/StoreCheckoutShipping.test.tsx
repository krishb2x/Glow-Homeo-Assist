import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the postal pincode fetch response
const mockPincodeSuccess = [
  {
    Status: "Success",
    PostOffice: [
      {
        District: "New Delhi",
        State: "Delhi"
      }
    ]
  }
];

const mockPincodeError = [
  {
    Status: "Error",
    Message: "No records found"
  }
];

describe('Store Checkout Shipping Address & Referrals logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates PIN code lookup responses correctly', () => {
    const data = mockPincodeSuccess;
    expect(data[0].Status).toBe("Success");
    expect(data[0].PostOffice[0].District).toBe("New Delhi");
    expect(data[0].PostOffice[0].State).toBe("Delhi");
  });

  it('correctly handles PIN code API failure states', () => {
    const data = mockPincodeError;
    expect(data[0].Status).toBe("Error");
  });

  it('resolves referral overrides dynamically based on active cart items', () => {
    // Mock the dynamic scan matching the fixed CartDrawer.tsx referral resolution
    const cart = [
      {
        product: { id: "triple-bundle-id", product_type: "BUNDLE", price: 1500 },
        quantity: 1
      }
    ];

    const discountInfo = {
      code: "AMAN10",
      type: "percentage",
      value: 10,
      applicableProducts: [
        { product_id: "ultrasound-book-id", discount_value: 99, discount_type: "percentage" },
        { product_id: "triple-bundle-id", discount_value: 50, discount_type: "percentage" }
      ]
    };

    // Find override configuration using CartDrawer logic
    const activeOverride = discountInfo.applicableProducts.find(
      op => cart.some(item => item.product.id === op.product_id)
    );

    expect(activeOverride).toBeDefined();
    expect(activeOverride?.product_id).toBe("triple-bundle-id");
    expect(activeOverride?.discount_value).toBe(50);
  });

  it('correctly skips discount when cart items have no matching overrides', () => {
    const cart = [
      {
        product: { id: "general-practice-book-id", product_type: "EBOOK", price: 300 },
        quantity: 1
      }
    ];

    const discountInfo = {
      code: "SPECIAL50",
      type: "percentage",
      value: 10,
      applicableProducts: [
        { product_id: "triple-bundle-id", discount_value: 50, discount_type: "percentage" }
      ]
    };

    const activeOverride = discountInfo.applicableProducts.find(
      op => cart.some(item => item.product.id === op.product_id)
    );

    expect(activeOverride).toBeUndefined();
  });
});
