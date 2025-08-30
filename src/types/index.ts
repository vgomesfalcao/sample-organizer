import os from 'os';
export interface Song {
  id: string;
  sourcePath: string;
  inferredName: string;
  desiredName?: string;
  meta: SongMetadata;
  files: Track[];
}

export interface SongMetadata {
  title: string;
  author?: string;
  key?: string;
  bpm?: number;
}

export interface Track {
  sourcePath: string;
  relPath: string;
  ext: string;
  kind: 'audio' | 'other';
  action: 'convert' | 'copy' | 'ignore';
}

export interface Plan {
  songs: Song[];
  operations: Operation[];
  summary: PlanSummary;
}

export interface Operation {
  songId: string;
  track: Track;
  destPath: string;
  action: 'convert' | 'copy' | 'ignore';
  estimatedSize?: number;
}

export interface PlanSummary {
  totalSongs: number;
  totalTracks: number;
  toConvert: number;
  toCopy: number;
  toIgnore: number;
  estimatedOutputSize?: number;
}

export interface Settings {
  source: string;
  dest: string;
  bitrate: string;
  reencodeMp3: boolean;
  dryRun: boolean;
  nonInteractive: boolean;
  concurrency: number;
  overwrite: boolean;
  flatten: boolean; // achatar subpastas dentro de multitracks
}

export interface ExecutionResult {
  success: boolean;
  operation: Operation;
  error?: string;
  actualSize?: number;
  duration?: number;
}

export interface ExecutionSummary {
  totalOperations: number;
  successful: number;
  failed: number;
  totalSize: number;
  totalDuration: number;
  errors: Array<{ operation: Operation; error: string }>;
}

export const SUPPORTED_AUDIO_EXTENSIONS = ['.wav', '.m4a', '.mp3'] as const;
export type SupportedAudioExtension = typeof SUPPORTED_AUDIO_EXTENSIONS[number];

export const DEFAULT_SETTINGS: Partial<Settings> = {
  bitrate: '320k',
  reencodeMp3: false,
  dryRun: false,
  nonInteractive: false,
  concurrency: Math.min(4, os.cpus().length),
  overwrite: false,
  flatten: true,
};
