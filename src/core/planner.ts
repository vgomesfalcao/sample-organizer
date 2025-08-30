import path from 'path';
import { type Plan, type Song, type Operation, type Settings } from '../types/index.js';
import { sanitizeFileName } from '../utils/fs.js';
import { resolveDestination } from './naming.js';

export async function buildPlan(songs: Song[], settings: Settings): Promise<Plan> {
  const operations: Operation[] = [];
  for (const song of songs) {
    const destRoot = await resolveDestination(settings.dest, song);
    // Controla colisões de nomes dentro da mesma música
    const usedNames = new Map<string, number>();

    function ensureUniqueRelName(rel: string): string {
      const dir = path.posix.dirname(rel);
      const base = path.posix.basename(rel);
      const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : '';
      const nameOnly = ext ? base.slice(0, -ext.length) : base;
      const key = path.posix.join(dir, base);
      const count = usedNames.get(key);
      if (count === undefined) {
        usedNames.set(key, 1);
        return rel;
      }
      // já existe: gerar sufixo -vN
      const next = count + 1;
      usedNames.set(key, next);
      const withSuffix = `${nameOnly}-v${next}${ext}`;
      return dir && dir !== '.' ? path.posix.join(dir, withSuffix) : withSuffix;
    }
    for (const track of song.files) {
      // Ajustar extensão para .mp3 quando for conversão
      const relNormalized = track.relPath.replace(/\\/g, '/');
      const relMp3Norm = track.ext !== '.mp3' ? relNormalized.replace(/\.[^.]+$/i, '.mp3') : relNormalized;
      let destRel = relMp3Norm;
      if (settings.flatten) {
        const flattened = relMp3Norm.split('/').join('-');
        destRel = sanitizeFileName(flattened);
        // com flatten, colisões são prováveis: garantir unicidade
        destRel = ensureUniqueRelName(destRel);
      } else {
        // manter hierarquia, mas ainda pode haver colisões de extensão (ex.: kick.wav + kick.aiff → kick.mp3)
        destRel = ensureUniqueRelName(destRel);
      }
      const destPath = path.join(destRoot, 'multitracks', destRel);
      const isMp3 = track.ext === '.mp3';
      const action = isMp3 ? (settings.reencodeMp3 ? 'convert' : 'copy') : 'convert';
      operations.push({ songId: song.id, track, destPath, action });
    }
  }

  const plan: Plan = {
    songs,
    operations,
    summary: {
      totalSongs: songs.length,
      totalTracks: operations.length,
      toConvert: operations.filter(o => o.action === 'convert').length,
      toCopy: operations.filter(o => o.action === 'copy').length,
      toIgnore: operations.filter(o => o.action === 'ignore').length,
    },
  };
  return plan;
}

export default { buildPlan };
