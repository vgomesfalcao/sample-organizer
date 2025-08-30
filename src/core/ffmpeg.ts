import fs from 'fs-extra';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { type Operation, type ExecutionResult } from '../types/index.js';

export function ensureFfmpegBinaries() {
  // Apenas tentativa de acesso para disparar erros cedo caso não exista
  ffmpeg.getAvailableFormats(() => {});
}

export async function executeOperation(op: Operation, bitrate: string): Promise<ExecutionResult> {
  const start = Date.now();
  await fs.ensureDir(path.dirname(op.destPath));

  if (op.action === 'copy') {
    await fs.copy(op.track.sourcePath, op.destPath, { overwrite: true });
    const size = (await fs.stat(op.destPath)).size;
    return { success: true, operation: op, actualSize: size, duration: Date.now() - start };
  }

  // convert -> mp3 com bitrate
  await new Promise<void>((resolve, reject) => {
    ffmpeg(op.track.sourcePath)
      .outputOptions(['-codec:a libmp3lame', `-b:a ${bitrate}`])
      .toFormat('mp3')
      .on('error', reject)
      .on('end', () => resolve())
      .save(op.destPath);
  });

  const size = (await fs.stat(op.destPath)).size;
  return { success: true, operation: op, actualSize: size, duration: Date.now() - start };
}

export default { executeOperation, ensureFfmpegBinaries };
