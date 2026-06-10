export const generateMockCustomer = (overrides = {}) => ({
  id: "customer-123",
  clinic_id: "clinic-123",
  email: "customer@example.com",
  first_name: "Jane",
  last_name: "Doe",
  phone: "0987654321",
  created_at: new Date().toISOString(),
  last_order_date: new Date().toISOString(),
  total_orders: 2,
  total_spent: 1500,
  ...overrides
});
