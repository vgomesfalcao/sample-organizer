import { describe, it, expect } from 'vitest';
import { mergeMetadata } from '../src/core/metadata.js';

describe('metadata', () => {
  it('mergeMetadata preserva valores atuais e usa os carregados quando presentes', () => {
    const current = { title: 'T', author: 'A' };
    const loaded = { author: 'B', bpm: 128 };
    const merged = mergeMetadata(current as any, loaded);
    expect(merged.title).toBe('T');
    expect(merged.author).toBe('B');
    expect(merged.bpm).toBe(128);
  });
});
