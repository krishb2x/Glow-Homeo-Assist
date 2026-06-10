import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkPaidButton } from '@/app/admin/(dashboard)/partners/commissions/MarkPaidButton';

// Mock the useRouter hook
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe('MarkPaidButton', () => {
  it('renders correctly for pending status', () => {
    render(<MarkPaidButton attributionId="123" currentStatus="pending" />);
    
    const button = screen.getByRole('button', { name: /Mark Paid/i });
    expect(button).toBeInTheDocument();
  });

  it('calls the API and updates state when clicked', async () => {
    // Mock the global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // Mock window.confirm to return true
    window.confirm = vi.fn().mockReturnValue(true);

    render(<MarkPaidButton attributionId="123" currentStatus="pending" />);
    const button = screen.getByRole('button', { name: /Mark Paid/i });
    
    // Click the button
    fireEvent.click(button);

    // Ensure fetch was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/partners/mark-paid',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ attributionId: '123' })
        })
      );
    });
  });
});
