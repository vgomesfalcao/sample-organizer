import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { scanSource } from '../src/core/scanner.js';

const base = path.resolve('fixtures/scanner');

beforeAll(async () => {
  await fs.emptyDir(base);
  // Caso 1: pasta com multitracks/
  await fs.ensureDir(path.join(base, 'SongA/multitracks'));
  await fs.writeFile(path.join(base, 'SongA/multitracks/kick.wav'), 'x');
  await fs.writeFile(path.join(base, 'SongA/multitracks/bass.m4a'), 'x');
  // Caso 2: subpasta com arquivos de áudio (sem multitracks)
  await fs.ensureDir(path.join(base, 'SongB'));
  await fs.writeFile(path.join(base, 'SongB/drums.wav'), 'x');
  // Caso 3: arquivo solto na raiz
  await fs.writeFile(path.join(base, 'single.mp3'), 'x');
});

describe('scanner', () => {
  it('detecta músicas em diferentes estruturas', async () => {
    const songs = await scanSource(base);
    // Espera ao menos 3 músicas detectadas
    expect(songs.length).toBeGreaterThanOrEqual(3);
    const names = songs.map(s => s.inferredName).sort();
    expect(names.join(',')).toContain('SongA');
    expect(names.join(',')).toContain('SongB');
  });
});
