import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodemailer from 'nodemailer';

// Mock Supabase admin client using global responses to avoid hoisting scope issues
vi.mock('../../lib/supabase', () => {
  return {
    createAdminClient: vi.fn().mockImplementation(() => {
      return {
        from: vi.fn().mockImplementation((table: string) => {
          return {
            select: vi.fn().mockImplementation((columns: string) => {
              return {
                eq: vi.fn().mockImplementation((col: string, val: any) => {
                  return {
                    maybeSingle: vi.fn().mockImplementation(async () => {
                      return (global as any).mockSupabaseResponse || { data: null, error: null };
                    })
                  };
                })
              };
            })
          };
        })
      };
    })
  };
});

// Mock Nodemailer with a globally accessible sendMail mock
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'ses-or-smtp-123' });
(global as any).mockSendMail = mockSendMail;

vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: vi.fn().mockImplementation(() => {
        return {
          sendMail: (global as any).mockSendMail
        };
      })
    }
  };
});

import { sendConfirmationEmail } from '../../lib/email';

// Mock SES SDK dependencies so they don't crash
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn(),
  SendRawEmailCommand: vi.fn()
}));

describe('Email Settings Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).mockSupabaseResponse = null;
    mockSendMail.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'ses-or-smtp-123' });

    // Setup default environment variables
    process.env.AWS_ACCESS_KEY_ID = 'test-aws-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';
    process.env.NOTIFICATION_FROM_EMAIL = 'MediTonic <care@glowhomeo.in>';
    process.env.SMTP_HOST = 'smtp.zoho.in';
    process.env.SMTP_USER = 'care@glowhomeo.in';
    process.env.SMTP_PASSWORD = 'pass';
  });



  it('skips email dispatch if corresponding template toggle is disabled', async () => {
    // Mock DB response: consultation confirmation is disabled (false)
    (global as any).mockSupabaseResponse = {
      data: {
        provider: 'ses',
        enable_consultation_confirmed: false,
        enable_store_product_delivery: true,
      },
      error: null
    };

    const result = await sendConfirmationEmail(
      'patient@example.com',
      'Your Consultation Confirmation',
      '<p>Confirmed</p>'
    );

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('sends via Resend HTTP API when provider is set to resend', async () => {
    // Mock DB response: provider is Resend
    (global as any).mockSupabaseResponse = {
      data: {
        provider: 'resend',
        resend_api_key: 're_custom_key_123',
        default_cc: 'cc1@test.com, cc2@test.com',
        default_bcc: 'bcc1@test.com',
        enable_consultation_confirmed: true,
      },
      error: null
    };

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'resend-msg-999' })
    });
    global.fetch = mockFetch;

    const result = await sendConfirmationEmail(
      'patient@example.com',
      'Your Booking Confirmed',
      '<p>Confirmed</p>',
      { cc: 'original-cc@test.com' }
    );

    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, reqOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(reqOptions.method).toBe('POST');
    
    // Check Authorization header
    const headers = reqOptions.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer re_custom_key_123');

    // Check payload details (default CC/BCC appended and duplicates removed)
    const body = JSON.parse(reqOptions.body as string);
    expect(body.to).toContain('patient@example.com');
    expect(body.cc).toContain('original-cc@test.com');
    expect(body.cc).toContain('cc1@test.com');
    expect(body.cc).toContain('cc2@test.com');
    expect(body.bcc).toContain('bcc1@test.com');
  });

  it('sends via AWS SES when provider is set to ses', async () => {
    // Mock DB response: provider is SES
    (global as any).mockSupabaseResponse = {
      data: {
        provider: 'ses',
        default_bcc: 'archive@test.com',
        enable_consultation_confirmed: true,
      },
      error: null
    };

    const result = await sendConfirmationEmail(
      'patient@example.com',
      'Your Booking Confirmed',
      '<p>Confirmed</p>'
    );

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('ses-or-smtp-123');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    
    const sendMailOptions = mockSendMail.mock.calls[0][0];
    expect(sendMailOptions.to).toBe('patient@example.com');
    expect(sendMailOptions.bcc).toContain('archive@test.com');
  });
});
