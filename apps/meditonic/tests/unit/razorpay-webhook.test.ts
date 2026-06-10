import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/razorpay/route';

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'order-123', total_amount: 1000 },
            error: null
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ error: null })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ error: null })
        })
      })
    })
  })
}));

// Mock crypto verification to always pass in test
vi.mock('crypto', () => ({
  createHmac: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('valid_signature_hash')
  })
}));

describe('Razorpay Webhook', () => {
  it('processes a payment.captured event successfully', async () => {
    // Construct fake Razorpay payload
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            amount: 100000, // in paise
            notes: {
              mt_order_id: 'order-123'
            }
          }
        }
      }
    };

    const req = new Request('http://localhost:3001/api/webhooks/razorpay', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'test_signature_bypass',
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    // You can also assert that the mocked supabase.from('mt_sync_queue').insert was called
  });

  it('rejects invalid signatures', async () => {
    // Restore original mock for this specific test if we wanted to test failure,
    // but for now we just pass a mismatched signature
    const req = new Request('http://localhost:3001/api/webhooks/razorpay', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'INVALID_SIGNATURE',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ event: 'payment.captured' })
    });

    const response = await POST(req);
    expect(response.status).toBe(401); // Unauthorized
  });
});
