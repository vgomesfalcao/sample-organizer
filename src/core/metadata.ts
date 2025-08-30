import fs from 'fs-extra';
import path from 'path';
import { type Song, type SongMetadata } from '../types/index.js';

const META_FILENAME = 'metadata.json';

export interface MetadataFile {
  title?: string;
  author?: string;
  key?: string;
  bpm?: number;
}

export async function loadSongMetadata(songDir: string): Promise<MetadataFile | null> {
  const file = path.join(songDir, META_FILENAME);
  if (!(await fs.pathExists(file))) return null;
  try {
    const data = await fs.readJSON(file);
    return data as MetadataFile;
  } catch {
    return null;
  }
}

export async function saveSongMetadata(songDir: string, meta: MetadataFile): Promise<void> {
  const file = path.join(songDir, META_FILENAME);
  await fs.writeJSON(file, meta, { spaces: 2 });
}

export function mergeMetadata(current: SongMetadata, loaded?: MetadataFile | null): SongMetadata {
  if (!loaded) return current;
  return {
    title: loaded.title ?? current.title,
    author: loaded.author ?? current.author,
    key: loaded.key ?? current.key,
    bpm: loaded.bpm ?? current.bpm,
  };
}

export async function hydrateSongsWithMetadata(songs: Song[]): Promise<Song[]> {
  const out: Song[] = [];
  for (const s of songs) {
    const loaded = await loadSongMetadata(s.sourcePath);
    out.push({ ...s, meta: mergeMetadata(s.meta, loaded) });
  }
  return out;
}

export default { loadSongMetadata, saveSongMetadata, mergeMetadata, hydrateSongsWithMetadata };
