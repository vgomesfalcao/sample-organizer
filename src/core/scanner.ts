import path from 'path';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { SUPPORTED_AUDIO_EXTENSIONS, type Song, type Track, type SupportedAudioExtension } from '../types/index.js';
import { sanitizeFileName, removeExtension, normalizePath } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

export interface ScanOptions {
  source: string;
}

const AUDIO_SET = new Set<string>(SUPPORTED_AUDIO_EXTENSIONS);

function isAudio(filePath: string): boolean {
  return AUDIO_SET.has(path.extname(filePath).toLowerCase());
}

function inferSongNameFromPath(songRoot: string): string {
  return sanitizeFileName(path.basename(songRoot));
}

async function listAudioFiles(root: string): Promise<string[]> {
  const pattern = '**/*';
  const entries = await fg(pattern, {
    cwd: root,
    onlyFiles: true,
    dot: false,
    unique: true,
    absolute: true,
    followSymbolicLinks: false,
  });
  return entries.filter(isAudio);
}

export interface ScannedSong {
  root: string; // diretório da música (pasta da música ou pasta do arquivo)
  files: string[]; // caminhos absolutos de arquivos de áudio
  hasMultitracksDir: boolean; // se possui subpasta multitracks/
}

export async function scanSource(source: string): Promise<Song[]> {
  const src = path.resolve(source);
  if (!(await fs.pathExists(src))) {
    throw new Error(`Fonte não existe: ${src}`);
  }

  const stats = await fs.stat(src);
  const candidates: ScannedSong[] = [];

  if (stats.isFile()) {
    if (!isAudio(src)) return [];
    const root = path.dirname(src);
    candidates.push({ root, files: [src], hasMultitracksDir: false });
  } else if (stats.isDirectory()) {
    // Estratégia:
    // 1) Se houver pastas com 'multitracks/' dentro, cada pasta pai é uma música
    // 2) Caso contrário, use heurística: cada subpasta com >=1 arquivos de áudio é uma música
    // 3) Arquivos soltos na raiz viram músicas individuais

    const multitrackDirs = await fg('**/multitracks', { cwd: src, onlyDirectories: true, absolute: true });
    const songRoots = new Set<string>();

    for (const mdir of multitrackDirs) {
      songRoots.add(path.dirname(mdir));
    }

    // Adicionar subpastas que contenham arquivos de áudio
    const subdirs = await fg('*', { cwd: src, onlyDirectories: true, absolute: true });
    for (const dir of subdirs) {
      const files = await listAudioFiles(dir);
      if (files.length > 0) {
        songRoots.add(dir);
      }
    }

    // Arquivos soltos na raiz
    const rootAudio = (await fg('*', { cwd: src, onlyFiles: true, absolute: true })).filter(isAudio);
    for (const file of rootAudio) {
      candidates.push({ root: path.dirname(file), files: [file], hasMultitracksDir: false });
    }

    for (const root of songRoots) {
      const files = await listAudioFiles(root);
      if (files.length === 0) continue;
      const hasMulti = await fs.pathExists(path.join(root, 'multitracks'));
      candidates.push({ root, files, hasMultitracksDir: hasMulti });
    }
  }

  // Normalizar para Song[]
  const songs: Song[] = candidates.map((c) => {
    const rootName = inferSongNameFromPath(c.root);
    const id = normalizePath(path.join(c.root, rootName));

    const tracks: Track[] = c.files.map((abs) => {
      const rel = path.relative(c.root, abs);
      const ext = path.extname(abs).toLowerCase() as SupportedAudioExtension;
      const action: Track['action'] = ext === '.mp3' ? 'copy' : 'convert';
      return {
        sourcePath: abs,
        relPath: rel,
        ext,
        kind: 'audio',
        action,
      };
    });

    return {
      id,
      sourcePath: c.root,
      inferredName: rootName,
      meta: { title: removeExtension(rootName) },
      files: tracks,
    };
  });

  logger.info(`Scan: ${songs.length} músicas encontradas`);
  return songs;
}

export default { scanSource };
