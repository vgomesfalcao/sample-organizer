import path from 'path';
import { sanitizeFileName, generateUniquePath } from '../utils/fs.js';
import { type Song, type SongMetadata } from '../types/index.js';

export function buildNameFromMeta(meta: SongMetadata, fallback: string): string {
  const title = meta.title?.trim() || fallback;
  const parts = [title];
  if (meta.author) parts.push(meta.author.trim());
  if (meta.key) parts.push(meta.key.trim());
  if (typeof meta.bpm === 'number' && !Number.isNaN(meta.bpm)) parts.push(`${meta.bpm}bpm`);
  return sanitizeFileName(parts.join('-'));
}

export async function resolveDestination(baseDest: string, song: Song): Promise<string> {
  const name = sanitizeFileName(song.desiredName || buildNameFromMeta(song.meta, song.inferredName));
  const destDir = path.join(baseDest, name);
  return await generateUniquePath(destDir);
}

export default { buildNameFromMeta, resolveDestination };
