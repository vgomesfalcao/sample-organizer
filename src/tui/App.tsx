import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Song } from '../types/index.js';
import type { Key } from 'ink';
import { scanSource } from '../core/scanner.js';
import { hydrateSongsWithMetadata, saveSongMetadata } from '../core/metadata.js';

type Field = 'title' | 'author' | 'key' | 'bpm';

export default function App({ source }: { source: string }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [idx, setIdx] = useState(0);
  const [editing, setEditing] = useState<Field | null>(null);
  const [buffer, setBuffer] = useState('');
  const selected = songs[idx];

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
    files: s.files.length.toString(),
  })), [songs]);

  useInput((input: string, key: Key) => {
    if (!songs.length) return;

    if (editing) {
      if (key.return) {
        // Commit
  setSongs((prev: Song[]) => {
          const copy = [...prev];
          const current = { ...copy[idx] };
          const meta = { ...current.meta };
          if (editing === 'bpm') {
            const n = parseInt(buffer, 10);
            if (!Number.isNaN(n)) meta.bpm = n;
          } else {
            (meta as any)[editing] = buffer;
          }
          current.meta = meta;
          copy[idx] = current;
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

  if (key.downArrow) setIdx((i: number) => Math.min(i + 1, songs.length - 1));
  else if (key.upArrow) setIdx((i: number) => Math.max(i - 1, 0));
    else if (input === 't') { setEditing('title'); setBuffer(selected?.meta.title || ''); }
    else if (input === 'a') { setEditing('author'); setBuffer(selected?.meta.author || ''); }
    else if (input === 'k') { setEditing('key'); setBuffer(selected?.meta.key || ''); }
    else if (input === 'b') { setEditing('bpm'); setBuffer(selected?.meta.bpm?.toString() || ''); }
    else if (input === 'q') { process.exit(0); }
  });

  return (
    <Box flexDirection="column">
      <Text>Setas para navegar • t/a/k/b para editar • Enter para salvar • Esc para cancelar • q para sair</Text>
      <Box marginTop={1}>
        <Text>
          {`Idx Title                          Author              Key   BPM  Files`}
        </Text>
      </Box>
      {rows.map((r, i) => (
        <Box key={i}>
          <Text color={i === idx ? 'cyan' : undefined}>
            {`${String(i).padStart(3)} ${r.title.padEnd(30).slice(0,30)}  ${r.author.padEnd(18).slice(0,18)}  ${r.key.padEnd(4).slice(0,4)}  ${r.bpm.padStart(4).slice(0,4)}  ${r.files.padStart(3)}`}
          </Text>
        </Box>
      ))}
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
