import { describe, it, expect } from 'vitest';
import { 
  Template_EbookPurchased,
  Template_PartnerApplication,
  Template_PartnerApproved
} from '../../lib/email-templates';

describe('Email Templates', () => {
  it('generates the ebook purchase email correctly', () => {
    const html = Template_EbookPurchased('John Doe', { amount: 1500 });
    
    expect(html).toContain('John Doe');
    expect(html).toContain('1500');
    expect(html).toContain('eBook');
    // Ensure mobile-first classes are present
    expect(html).toContain('mobile-box');
  });

  it('generates the partner application received email correctly', () => {
    const html = Template_PartnerApplication('Jane Smith');
    
    expect(html).toContain('Jane Smith');
    expect(html).toContain('received your application');
  });

  it('generates the partner approval email correctly', () => {
    const html = Template_PartnerApproved('Jane Smith', 'https://example.com/login', 'TEMP123', 'jane@example.com');
    
    expect(html).toContain('Jane Smith');
    expect(html).toContain('https://example.com/login');
    expect(html).toContain('TEMP123');
    expect(html).toContain('jane@example.com');
  });
});
