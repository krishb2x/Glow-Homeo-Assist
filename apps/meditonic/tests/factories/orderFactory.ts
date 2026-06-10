export const generateMockOrder = (overrides = {}) => ({
  id: "order-123",
  clinic_id: "clinic-123",
  customer_name: "Jane Doe",
  customer_email: "customer@example.com",
  total_amount: 1500,
  status: "paid",
  fulfillment_status: "fulfilled",
  items: [
    {
      product: {
        id: "prod-1",
        title: "Mock eBook",
        product_type: "EBOOK",
        price: 1500
      },
      quantity: 1
    }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const generateMockAttribution = (overrides = {}) => ({
  id: "attr-123",
  order_id: "order-123",
  partner_id: "partner-123",
  referral_code_id: "code-123",
  product_type: "EBOOK",
  revenue_after_discount: 1200,
  commission_percentage: 20,
  commission_amount: 240,
  status: "pending",
  created_at: new Date().toISOString(),
  mt_partners: {
    mt_partner_applications: { name: "John Influencer" }
  },
  mt_referral_codes: {
    code: "JOHN20"
  },
  ...overrides
});
