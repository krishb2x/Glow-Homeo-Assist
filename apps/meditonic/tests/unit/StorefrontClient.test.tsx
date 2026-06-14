import { describe, it, expect } from 'vitest';
import { formatCategoryName } from '../../components/store/StorefrontClient';

describe('formatCategoryName', () => {
  it('formats category names correctly', () => {
    expect(formatCategoryName('medicine')).toBe('Medicine');
    expect(formatCategoryName('combo')).toBe('Combo');
    expect(formatCategoryName('diagnosis')).toBe('Diagnosis');
  });

  it('special-cases gyne_pedia to Gyne & Pedia', () => {
    expect(formatCategoryName('gyne_pedia')).toBe('Gyne & Pedia');
    expect(formatCategoryName('GYNE_PEDIA')).toBe('Gyne & Pedia');
  });

  it('safely replaces underscores and hyphens with spaces for other categories', () => {
    expect(formatCategoryName('skin_care')).toBe('Skin Care');
    expect(formatCategoryName('hair-fall')).toBe('Hair Fall');
  });

  it('returns an empty string when empty category is passed', () => {
    expect(formatCategoryName('')).toBe('');
  });
});
