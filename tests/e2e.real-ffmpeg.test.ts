import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { execFileSync } from 'node:child_process';
import { runPipeline } from '../src/services/orchestrator.js';

const base = path.resolve('fixtures/e2e');

function hasFfmpeg(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function makeSilentWav(file: string) {
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-t', '0.2', '-i', 'anullsrc=r=44100:cl=mono', file], { stdio: 'ignore' });
}

async function makeSilentMp3(file: string) {
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-t', '0.2', '-i', 'anullsrc=r=44100:cl=mono', '-codec:a', 'libmp3lame', '-b:a', '128k', file], { stdio: 'ignore' });
}

beforeAll(async () => {
  await fs.emptyDir(base);
  await fs.ensureDir(path.join(base, 'SongE', 'multitracks'));
  if (hasFfmpeg()) {
    await makeSilentWav(path.join(base, 'SongE', 'multitracks', 'pad.wav'));
    await makeSilentMp3(path.join(base, 'SongE', 'multitracks', 'click.mp3'));
  }
});

describe('E2E real com ffmpeg (opcional)', () => {
  it('converte/copía para MP3 quando ffmpeg está instalado', async () => {
    if (!hasFfmpeg()) {
      expect(true).toBe(true); // skip
      return;
    }
    const dest = path.join(base, 'out');
    const results = await runPipeline({
      source: base,
      dest,
      bitrate: '192k',
      reencodeMp3: false,
      dryRun: false,
      nonInteractive: true,
      concurrency: 1,
      overwrite: true,
    });
    expect(results.length).toBeGreaterThan(0);

    const outSong = await fs.readdir(dest);
    expect(outSong.some((d) => d.includes('SongE'))).toBe(true);
  });
});
