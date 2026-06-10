// Factory for generating mock partner data

export const generateMockPartner = (overrides = {}) => ({
  id: "partner-123",
  user_id: "user-123",
  clinic_id: "clinic-123",
  status: "active",
  base_commission_rate: 20,
  total_revenue: 5000,
  total_commission: 1000,
  total_orders: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  mt_partner_applications: {
    name: "John Influencer",
    email: "john@example.com",
    mobile: "1234567890",
    profession: "Homeopath",
    social_links: { instagram: "@john" },
    audience_size: "10k-50k",
    status: "approved"
  },
  mt_referral_codes: [
    {
      id: "code-123",
      code: "JOHN20",
      discount_type: "percentage",
      discount_value: 20,
      is_active: true,
      current_usage: 5
    }
  ],
  ...overrides
});

export const generateMockPartnerList = (count = 3) => {
  return Array.from({ length: count }).map((_, i) => generateMockPartner({
    id: `partner-${i}`,
    mt_partner_applications: {
      name: `Partner ${i}`,
      email: `partner${i}@example.com`,
      status: "approved"
    }
  }));
};
