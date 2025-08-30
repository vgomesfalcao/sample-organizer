import { describe, it, expect } from 'vitest';
import { sanitizeFileName, removeExtension, formatFileSize } from '../src/utils/fs.js';
import { processWithLimit } from '../src/utils/concurrency.js';

describe('utils/fs', () => {
  it('sanitizeFileName remove chars inválidos e normaliza espaços', () => {
    expect(sanitizeFileName(' File:bad*name ')).toBe('File-bad-name');
    expect(sanitizeFileName('...name..')).toBe('name');
    expect(sanitizeFileName('a    b')).toBe('a b');
  });

  it('removeExtension remove extensão corretamente', () => {
    expect(removeExtension('song.wav')).toBe('song');
    expect(removeExtension('folder/file.mp3')).toBe('file');
  });

  it('formatFileSize formata bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });
});

describe('utils/concurrency', () => {
  it('processWithLimit executa com concorrência limitada', async () => {
    const items = [1, 2, 3, 4, 5];
    const start = Date.now();

    const results = await processWithLimit(
      items,
      async (n: number) => {
        await new Promise((r) => setTimeout(r, 100));
        return n * 2;
      },
      2
    );

    const duration = Date.now() - start;

    expect(results).toEqual([2, 4, 6, 8, 10]);
    // Com limite 2 e 5 itens de 100ms, deve levar >200ms
    expect(duration).toBeGreaterThanOrEqual(200);
  });
});
