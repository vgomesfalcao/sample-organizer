import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runPipeline } from '../src/services/orchestrator.js';

const base = path.resolve('fixtures/integration');

beforeAll(async () => {
  await fs.emptyDir(base);
  await fs.ensureDir(path.join(base, 'SongC'));
  await fs.writeFile(path.join(base, 'SongC/drum.wav'), 'x');
  await fs.writeFile(path.join(base, 'SongC/bass.m4a'), 'x');
  await fs.writeFile(path.join(base, 'SongC/synth.mp3'), 'x');
});

describe('orchestrator dry-run', () => {
  it('gera operações sem executar quando dryRun=true', async () => {
    const results = await runPipeline({
      source: base,
      dest: path.join(base, 'out'),
      bitrate: '320k',
      reencodeMp3: false,
      dryRun: true,
      nonInteractive: true,
      concurrency: 2,
      overwrite: false,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.success === true)).toBe(true);
  });
});
