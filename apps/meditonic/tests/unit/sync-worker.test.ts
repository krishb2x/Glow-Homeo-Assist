import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/cron/sync-worker/route';
import { processStoreFulfillment } from '../../lib/storeFulfillment';

// Mock the processStoreFulfillment function so we don't hit the real DB
vi.mock('../../lib/storeFulfillment', () => ({
  processStoreFulfillment: vi.fn().mockResolvedValue(true)
}));

// Mock the Supabase client
vi.mock('../../lib/supabase', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                { id: 'task-1', target_system: 'store_fulfillment', payload: { order_id: '123' }, retries: 0 }
              ],
              error: null
            })
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    })
  })
}));

describe('Sync Worker Cron Job', () => {
  it('fetches pending tasks and processes them', async () => {
    // Call the GET endpoint
    const request = new Request('http://localhost:3001/api/cron/sync-worker');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(1);
    expect(data.failed).toBe(0);
    
    // Ensure the underlying fulfillment library was called with the correct payload
    expect(processStoreFulfillment).toHaveBeenCalledWith('123');
  });
});
