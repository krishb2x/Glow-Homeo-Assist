import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/admin/email-settings/route';

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();

vi.mock('../../lib/supabase', () => {
  return {
    createAdminClient: vi.fn().mockImplementation(() => {
      return {
        auth: {
          getUser: mockGetUser
        },
        from: mockFrom
      };
    })
  };
});

describe('Email Settings API Restrictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSingle
            })
          })
        };
      }
      if (table === 'mt_email_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingle
            })
          }),
          upsert: () => ({
            select: () => ({
              single: mockSingle
            })
          })
        };
      }
      return {};
    });
  });

  it('returns 401 if token is missing', async () => {
    const req = new Request('http://localhost/api/admin/email-settings', {
      method: 'GET'
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 if role is not super_admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', user_metadata: { role: 'admin' } } },
      error: null
    });
    mockSingle.mockResolvedValue({
      data: { role: 'admin' },
      error: null
    });

    const req = new Request('http://localhost/api/admin/email-settings', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns 200 settings configuration if role is super_admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', user_metadata: { role: 'super_admin' } } },
      error: null
    });
    mockSingle.mockResolvedValue({
      data: { role: 'super_admin' },
      error: null
    });
    mockMaybeSingle.mockResolvedValue({
      data: {
        clinic_id: '595cd444-e89c-4d1f-b31f-27f76f59e0d7',
        provider: 'ses'
      },
      error: null
    });

    const req = new Request('http://localhost/api/admin/email-settings', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.settings.provider).toBe('ses');
  });
});
