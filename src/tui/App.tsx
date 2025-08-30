import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Song } from '../types/index.js';
import type { Key } from 'ink';
import { scanSource } from '../core/scanner.js';
import { hydrateSongsWithMetadata, saveSongMetadata } from '../core/metadata.js';

type Field = 'title' | 'author' | 'key' | 'bpm';

export default function App({ source }: { source: string }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [idx, setIdx] = useState(0); // índice dentro da lista filtrada
  const [editing, setEditing] = useState<Field | null>(null);
  const [buffer, setBuffer] = useState('');
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'missing_author' | 'missing_key' | 'missing_bpm'>('all');

  // Mapeia índice visível para índice real
  const filteredIndices = useMemo(() => {
    if (!songs.length) return [] as number[];
    return songs.map((_, i) => i).filter((i) => {
      const m = songs[i].meta;
      if (filter === 'all') return true;
      if (filter === 'missing_author') return !m.author;
      if (filter === 'missing_key') return !m.key;
      if (filter === 'missing_bpm') return !m.bpm;
      return true;
    });
  }, [songs, filter]);

  const realIndex = filteredIndices[idx] ?? 0;
  const selected = songs[realIndex];

  useEffect(() => {
    (async () => {
      const scanned = await scanSource(source);
      const hydrated = await hydrateSongsWithMetadata(scanned);
      setSongs(hydrated);
    })();
  }, [source]);

  const rows = useMemo(() => songs.map((s: Song) => ({
    title: s.meta.title || '',
    author: s.meta.author || '',
    key: s.meta.key || '',
    bpm: s.meta.bpm?.toString() || '',
    status: (!s.meta.author || !s.meta.key || !s.meta.bpm) ? 'incompleto' : 'ok',
    files: s.files.length.toString(),
  })), [songs]);

  useInput((input: string, key: Key) => {
    if (!songs.length) return;

    if (editing) {
      if (key.return) {
        // Commit
        setSongs((prev: Song[]) => {
          const copy = [...prev];
          const current = { ...copy[realIndex] };
          const meta = { ...current.meta };
          if (editing === 'bpm') {
            const n = parseInt(buffer, 10);
            if (!Number.isNaN(n)) meta.bpm = n;
          } else {
            (meta as any)[editing] = buffer;
          }
          current.meta = meta;
          copy[realIndex] = current;
          // Salvar em disco
          saveSongMetadata(current.sourcePath, {
            title: meta.title,
            author: meta.author,
            key: meta.key,
            bpm: meta.bpm,
          }).catch(() => {});
          return copy;
        });
        setEditing(null);
        setBuffer('');
        return;
      }
      if (key.escape) {
        setEditing(null);
        setBuffer('');
        return;
      }
      if (key.backspace || key.delete) {
  setBuffer((prev: string) => prev.slice(0, -1));
        return;
      }
      // Append
  if (input) setBuffer((prev: string) => prev + input);
      return;
    }

    if (key.downArrow) setIdx((i: number) => Math.min(i + 1, Math.max(filteredIndices.length - 1, 0)));
    else if (key.upArrow) setIdx((i: number) => Math.max(i - 1, 0));
    else if (input === ' ') {
      // Alternar seleção do item atual (índice real)
      setSelectedSet((prev) => {
        const s = new Set(prev);
        if (s.has(realIndex)) s.delete(realIndex); else s.add(realIndex);
        return s;
      });
    }
    else if (input === 'x') { setSelectedSet(new Set()); }
    else if (input === 't') { setEditing('title'); setBuffer(selected?.meta.title || ''); }
    else if (input === 'a') { setEditing('author'); setBuffer(selected?.meta.author || ''); }
    else if (input === 'k') { setEditing('key'); setBuffer(selected?.meta.key || ''); }
    else if (input === 'b') { setEditing('bpm'); setBuffer(selected?.meta.bpm?.toString() || ''); }
    else if (input === 'A' || input === 'K' || input === 'B') {
      // Aplicar campo do item atual para todos selecionados
      const field: Field = input === 'A' ? 'author' : input === 'K' ? 'key' : 'bpm';
      const value = selected?.meta[field];
      if (value === undefined || value === null || value === '') return;
      setSongs((prev) => {
        const copy = [...prev];
        for (const i of selectedSet) {
          const cur = { ...copy[i] };
          const meta = { ...cur.meta } as any;
          meta[field] = field === 'bpm' ? Number(value) : value;
          cur.meta = meta;
          copy[i] = cur;
          // Persistir
          saveSongMetadata(cur.sourcePath, {
            title: cur.meta.title,
            author: cur.meta.author,
            key: cur.meta.key,
            bpm: cur.meta.bpm,
          }).catch(() => {});
        }
        return copy;
      });
    }
    else if (input === 'f') {
      setFilter((prev) => prev === 'all' ? 'missing_author' : prev === 'missing_author' ? 'missing_key' : prev === 'missing_key' ? 'missing_bpm' : 'all');
      setIdx(0);
    }
    else if (input === 's') {
      // salvar tudo explicitamente
      songs.forEach((s) => saveSongMetadata(s.sourcePath, s.meta as any).catch(() => {}));
    }
    else if (input === 'q') { process.exit(0); }
  });

  return (
    <Box flexDirection="column">
  <Text>Setas navegam • Espaço seleciona • t/a/k/b edita • A/K/B aplica aos selecionados • f filtra • s salva • q sai</Text>
      <Box marginTop={1}>
        <Text>
          {`Idx Title                          Author              Key   BPM  Status      Files`}
        </Text>
      </Box>
      {filteredIndices.map((realI, vi) => {
        const r = rows[realI];
        const isCursor = vi === idx;
        const isSel = selectedSet.has(realI);
        const mark = isSel ? '*' : ' ';
        return (
          <Box key={realI}>
            <Text color={isCursor ? 'cyan' : undefined}>
              {`${mark}${String(vi).padStart(2)} ${r.title.padEnd(30).slice(0,30)}  ${r.author.padEnd(18).slice(0,18)}  ${r.key.padEnd(4).slice(0,4)}  ${r.bpm.padStart(4).slice(0,4)}  ${r.status.padEnd(11).slice(0,11)}  ${r.files.padStart(3)}`}
            </Text>
          </Box>
        );
      })}
      {editing && (
        <Box marginTop={1}>
          <Text>
            {`Editando ${editing}: ${buffer}`}
          </Text>
        </Box>
      )}
    </Box>
  );
}
