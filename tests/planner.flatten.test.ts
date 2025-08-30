import { describe, it, expect } from 'vitest';
import path from 'path';
import { buildPlan } from '../src/core/planner.js';
import type { Song, Settings } from '../src/types/index.js';

function makeSong(): Song {
  return {
    id: 's1',
    sourcePath: '/music/Song1',
    inferredName: 'Song1',
    meta: { title: 'Song1', author: 'Auth', key: 'C', bpm: 120 },
    files: [
      { sourcePath: '/music/Song1/multitracks/drums/kick.wav', relPath: 'drums/kick.wav', ext: '.wav', kind: 'audio', action: 'convert' },
      { sourcePath: '/music/Song1/multitracks/vox/lead.wav', relPath: 'vox/lead.wav', ext: '.wav', kind: 'audio', action: 'convert' },
    ],
  };
}

const baseSettings: Settings = {
  source: '/music',
  dest: '/out',
  bitrate: '320k',
  reencodeMp3: false,
  dryRun: true,
  nonInteractive: true,
  concurrency: 1,
  overwrite: false,
  flatten: true,
};

describe('planner flatten', () => {
  it('achata subpastas quando flatten=true', async () => {
    const plan = await buildPlan([makeSong()], { ...baseSettings, flatten: true });
    const dests = plan.operations.map(o => path.normalize(o.destPath));
    expect(dests.every(p => p.includes(path.normalize('multitracks')))).toBe(true);
    expect(dests.some(p => p.endsWith(path.normalize('drums-kick.mp3')))).toBe(true);
    expect(dests.some(p => p.endsWith(path.normalize('vox-lead.mp3')))).toBe(true);
  });

  it('gera sufixos -vN quando nomes colidem ao achatar', async () => {
    const song: Song = {
      id: 's2',
      sourcePath: '/music/Song2',
      inferredName: 'Song2',
      meta: { title: 'Song2' },
      files: [
        { sourcePath: '/music/Song2/multitracks/kit/kick.wav', relPath: 'kit/kick.wav', ext: '.wav', kind: 'audio', action: 'convert' },
        { sourcePath: '/music/Song2/multitracks/kit/kick.m4a', relPath: 'kit/kick.m4a', ext: '.m4a', kind: 'audio', action: 'convert' },
        { sourcePath: '/music/Song2/multitracks/kit/kick.mp3', relPath: 'kit/kick.mp3', ext: '.mp3', kind: 'audio', action: 'copy' },
      ],
    };
    const plan = await buildPlan([song], { ...baseSettings, flatten: true });
    const names = plan.operations.map(o => path.basename(o.destPath));
    // Espera colisões em 'kit-kick.mp3' gerando sufixos
    const occurrences = names.filter(n => n.startsWith('kit-kick')).length;
    expect(occurrences).toBe(3);
    const hasV2 = names.some(n => n === 'kit-kick-v2.mp3');
    const hasV3 = names.some(n => n === 'kit-kick-v3.mp3');
    expect(hasV2 || hasV3).toBe(true);
  });

  it('mantém hierarquia quando flatten=false', async () => {
    const plan = await buildPlan([makeSong()], { ...baseSettings, flatten: false });
    const dests = plan.operations.map(o => path.normalize(o.destPath));
    expect(dests.some(p => p.endsWith(path.normalize('drums/kick.mp3')))).toBe(true);
    expect(dests.some(p => p.endsWith(path.normalize('vox/lead.mp3')))).toBe(true);
  });
});
