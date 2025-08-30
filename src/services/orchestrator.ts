import { type Settings, type ExecutionResult } from '../types/index.js';
import { scanSource } from '../core/scanner.js';
import { hydrateSongsWithMetadata } from '../core/metadata.js';
import { buildPlan } from '../core/planner.js';
import { executeOperation, ensureFfmpegBinaries } from '../core/ffmpeg.js';
import pLimit from 'p-limit';

export async function runPipeline(settings: Settings): Promise<ExecutionResult[]> {
  const scanned = await scanSource(settings.source);
  const songs = await hydrateSongsWithMetadata(scanned);
  const plan = await buildPlan(songs, settings);

  if (settings.dryRun) {
    return plan.operations.map((op) => ({ success: true, operation: op }));
  }

  ensureFfmpegBinaries();
  const limit = pLimit(settings.concurrency);
  const results = await Promise.all(
    plan.operations.map((op) => limit(() => executeOperation(op, settings.bitrate)))
  );
  return results;
}

export default { runPipeline };
