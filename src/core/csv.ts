import fs from 'fs-extra';
import path from 'path';
import type { Song, SongMetadata } from '../types/index.js';
import { saveSongMetadata } from './metadata.js';

export interface CsvRow {
  sourcePath: string;
  title: string;
  author?: string;
  key?: string;
  bpm?: number | string;
}

function escapeCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function unescapeCsv(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"');
  }
  return value;
}

export function songsToCsvString(songs: Song[]): string {
  const header = ['sourcePath', 'title', 'author', 'key', 'bpm'].join(',');
  const lines = songs.map((s) => (
    [
      escapeCsv(s.sourcePath),
      escapeCsv(s.meta.title),
      escapeCsv(s.meta.author ?? ''),
      escapeCsv(s.meta.key ?? ''),
      escapeCsv(s.meta.bpm ?? ''),
    ].join(',')
  ));
  return [header, ...lines].join('\n');
}

export async function saveCsv(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

export function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines.shift()!;
  const cols = header.split(',');
  const idx = (name: string) => cols.indexOf(name);
  const iSrc = idx('sourcePath');
  const iTitle = idx('title');
  const iAuthor = idx('author');
  const iKey = idx('key');
  const iBpm = idx('bpm');

  function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = false; }
        } else {
          cur += ch;
        }
      } else {
        if (ch === ',') { out.push(cur); cur = ''; }
        else if (ch === '"') { inQuotes = true; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out;
  }

  return lines.map((line) => {
    const parts = splitCsvLine(line);
    const row: CsvRow = {
      sourcePath: unescapeCsv(parts[iSrc] ?? ''),
      title: unescapeCsv(parts[iTitle] ?? ''),
      author: unescapeCsv(parts[iAuthor] ?? ''),
      key: unescapeCsv(parts[iKey] ?? ''),
      bpm: unescapeCsv(parts[iBpm] ?? ''),
    };
    if (row.bpm === '') delete (row as any).bpm;
    return row;
  });
}

export async function applyCsvRows(rows: CsvRow[]): Promise<void> {
  for (const r of rows) {
    const meta: SongMetadata = {
      title: r.title,
      author: r.author || undefined,
      key: r.key || undefined,
      bpm: r.bpm !== undefined && r.bpm !== '' ? Number(r.bpm) : undefined,
    };
    await saveSongMetadata(r.sourcePath, meta);
  }
}

export default { songsToCsvString, saveCsv, parseCsv, applyCsvRows };
