import { describe, it, expect } from 'vitest';
import { buildNameFromMeta } from '../src/core/naming.js';

describe('naming', () => {
  it('monta nome com campos quando presentes', () => {
    const name = buildNameFromMeta({ title: 'Song', author: 'Artist', key: 'Am', bpm: 120 }, 'Fallback');
    expect(name).toContain('Song');
    expect(name).toContain('Artist');
    expect(name).toContain('Am');
    expect(name).toContain('120bpm');
  });

  it('usa fallback quando título ausente', () => {
    const name = buildNameFromMeta({ title: '', author: 'X' }, 'Fallback');
    expect(name.startsWith('Fallback')).toBe(true);
  });
});
