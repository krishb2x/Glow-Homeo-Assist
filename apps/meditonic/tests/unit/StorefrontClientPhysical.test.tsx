import { describe, it, expect } from 'vitest';
import { formatCategoryName } from '../../components/store/StorefrontClientPhysical';

describe('formatCategoryName for Physical Store', () => {
  it('formats physical categories correctly', () => {
    expect(formatCategoryName('medicine')).toBe('Medicine');
    expect(formatCategoryName('diagnosis')).toBe('Diagnosis');
  });

  it('special-cases gyne_pedia to Gyne & Pedia', () => {
    expect(formatCategoryName('gyne_pedia')).toBe('Gyne & Pedia');
    expect(formatCategoryName('GYNE_PEDIA')).toBe('Gyne & Pedia');
  });

  it('replaces underscores and hyphens with spaces for custom categories', () => {
    expect(formatCategoryName('wellness_kit')).toBe('Wellness Kit');
    expect(formatCategoryName('pain-relief')).toBe('Pain Relief');
  });

  it('returns empty string when empty category is passed', () => {
    expect(formatCategoryName('')).toBe('');
  });
});
