import path from 'path';
import { type Plan, type Song, type Operation, type Settings } from '../types/index.js';
import { resolveDestination } from './naming.js';

export async function buildPlan(songs: Song[], settings: Settings): Promise<Plan> {
  const operations: Operation[] = [];
  for (const song of songs) {
    const destRoot = await resolveDestination(settings.dest, song);
    for (const track of song.files) {
      const destPath = path.join(destRoot, 'multitracks', track.relPath.replace(/\\/g, '/'));
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
