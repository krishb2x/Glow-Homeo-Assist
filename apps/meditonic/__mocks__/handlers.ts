import { http, HttpResponse } from 'msw';
import { generateMockPartnerList } from '../tests/factories/partnerFactory';
import { generateMockAttribution } from '../tests/factories/orderFactory';

// This is a simplified MSW handler setup for mocking Supabase REST endpoints.
// In a real scenario, you'd intercept the specific POST/GET requests to the Supabase URL.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';

export const handlers = [
  // Intercept Partner fetching
  http.get(`${SUPABASE_URL}/rest/v1/mt_partners`, () => {
    return HttpResponse.json(generateMockPartnerList(5));
  }),

  // Intercept Commissions fetching
  http.get(`${SUPABASE_URL}/rest/v1/mt_order_attributions`, () => {
    return HttpResponse.json([
      generateMockAttribution({ status: 'pending', commission_amount: 500 }),
      generateMockAttribution({ status: 'paid', commission_amount: 1500 }),
    ]);
  }),

  // Intercept marking commission as paid
  http.patch(`${SUPABASE_URL}/rest/v1/mt_order_attributions`, async ({ request }) => {
    return HttpResponse.json({ success: true });
  })
];
