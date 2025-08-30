import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { buildPlan } from '../src/core/planner.js';
import { executeOperation } from '../src/core/ffmpeg.js';
import type { Song, Settings } from '../src/types/index.js';

// Mock do fluent-ffmpeg para não invocar binários reais
vi.mock('fluent-ffmpeg', () => {
  return {
    default: (input: string) => {
      const api: any = {
        outputOptions() { return api; },
        toFormat() { return api; },
        on(event: string, cb: Function) {
          if (event === 'end') {
            api._onEnd = cb;
          }
          if (event === 'error') {
            api._onError = cb;
          }
          return api;
        },
        save(dest: string) {
          // simula escrita do arquivo convertido
          fs.ensureDirSync(path.dirname(dest));
          fs.writeFileSync(dest, 'mp3data');
          setTimeout(() => api._onEnd && api._onEnd(), 0);
          return api;
        },
      };
      return api;
    },
  };
});

const temp = path.resolve('fixtures/planner-ffmpeg');

beforeAll(async () => {
  await fs.emptyDir(temp);
  await fs.ensureDir(path.join(temp, 'SongZ', 'multitracks'));
  await fs.writeFile(path.join(temp, 'SongZ', 'multitracks', 'keys.wav'), 'x');
  await fs.writeFile(path.join(temp, 'SongZ', 'multitracks', 'click.mp3'), 'x');
});

describe('planner + ffmpeg (mocks)', () => {
  it('planeja convert/copy e executa operações com mock de ffmpeg', async () => {
    const song: Song = {
      id: '1',
      sourcePath: path.join(temp, 'SongZ'),
      inferredName: 'SongZ',
      meta: { title: 'SongZ', author: 'Auth', key: 'C', bpm: 120 },
      files: [
        { sourcePath: path.join(temp, 'SongZ', 'multitracks', 'keys.wav'), relPath: 'keys.wav', ext: '.wav', kind: 'audio', action: 'convert' },
        { sourcePath: path.join(temp, 'SongZ', 'multitracks', 'click.mp3'), relPath: 'click.mp3', ext: '.mp3', kind: 'audio', action: 'copy' },
      ],
    };

    const settings: Settings = {
      source: temp,
      dest: path.join(temp, 'out'),
      bitrate: '320k',
      reencodeMp3: false,
      dryRun: false,
      nonInteractive: true,
      concurrency: 1,
      overwrite: false,
    };

    const plan = await buildPlan([song], settings);
    expect(plan.operations).toHaveLength(2);
    const [op1, op2] = plan.operations;

    // .wav deve virar .mp3 no destino e ação convert
    expect(op1.action).toBe('convert');
    expect(op1.destPath.endsWith('keys.mp3')).toBe(true);

    // .mp3 deve ser copiado quando reencodeMp3=false
    expect(op2.action).toBe('copy');
    expect(op2.destPath.endsWith('click.mp3')).toBe(true);

    const res1 = await executeOperation(op1, settings.bitrate);
    const res2 = await executeOperation(op2, settings.bitrate);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(await fs.pathExists(op1.destPath)).toBe(true);
    expect(await fs.pathExists(op2.destPath)).toBe(true);
  });
});
