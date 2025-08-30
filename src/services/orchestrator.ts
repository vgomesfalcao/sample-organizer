import { type Settings, type ExecutionResult } from '../types/index.js';
import { scanSource } from '../core/scanner.js';
import { hydrateSongsWithMetadata } from '../core/metadata.js';
import { buildPlan } from '../core/planner.js';
import { executeOperation, ensureFfmpegBinaries } from '../core/ffmpeg.js';
import pLimit from 'p-limit';
import ora from 'ora';
import cliProgress from 'cli-progress';

export async function runPipeline(settings: Settings): Promise<ExecutionResult[]> {
  const spinner = ora('Escaneando origem...').start();
  const scanned = await scanSource(settings.source);
  spinner.text = 'Carregando metadados...';
  const songs = await hydrateSongsWithMetadata(scanned);
  spinner.text = 'Planejando operações...';
  const plan = await buildPlan(songs, settings);
  spinner.succeed(`Plano criado: ${plan.summary.totalTracks} operações`);

  if (settings.dryRun) {
    return plan.operations.map((op) => ({ success: true, operation: op }));
  }

  ensureFfmpegBinaries();
  const limit = pLimit(settings.concurrency);
  const bar = new cliProgress.SingleBar({
    format: 'Progresso [{bar}] {value}/{total} | {percentage}% | {song}',
  }, cliProgress.Presets.shades_classic);
  bar.start(plan.operations.length, 0, { song: '' });

  const results: ExecutionResult[] = await Promise.all(
    plan.operations.map(op => limit(async () => {
      try {
        const r = await executeOperation(op, settings.bitrate);
        bar.increment({ song: op.track.relPath });
        return r;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        bar.increment({ song: op.track.relPath });
        return { success: false, operation: op, error: message } as ExecutionResult;
      }
    }))
  );
  bar.stop();
  return results;
}

export default { runPipeline };
