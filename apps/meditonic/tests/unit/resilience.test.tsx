import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock component that simulates a save action that throws an error
const AdminSettings = () => {
  const [error, setError] = React.useState('');

  const handleSave = async () => {
    try {
      // Simulate API call that throws 500 Error
      throw new Error('Internal Server Error');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <button onClick={handleSave}>Save Settings</button>
      {error && <div role="alert" className="toast-error">{error}</div>}
    </div>
  );
};

describe('Error Boundaries & Notifications', () => {
  it('displays an error toast when API throws 500', async () => {
    render(<AdminSettings />);
    
    const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveBtn);
    
    // Assert error is displayed
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Internal Server Error');
  });
});
