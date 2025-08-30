#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import { logger } from '../utils/logger.js';
import { scanSource } from '../core/scanner.js';
import { hydrateSongsWithMetadata } from '../core/metadata.js';
import { runPipeline } from '../services/orchestrator.js';
import { DEFAULT_SETTINGS, type Settings } from '../types/index.js';
import React from 'react';
import { render } from 'ink';
import App from '../tui/App.js';
import { songsToCsvString, saveCsv, parseCsv, applyCsvRows } from '../core/csv.js';

// Registro lazy do prompt de seleção de árvore (ESM default)
let fileTreeRegistered = false;
async function ensureFileTreePrompt() {
  if (fileTreeRegistered) return;
  const mod = await import('inquirer-file-tree-selection-prompt');
  // módulo ESM pode exportar default; tipagem de inquirer não expõe registerPrompt com tipos genéricos
  const PromptCtor: unknown = (mod as unknown as { default?: unknown }).default ?? (mod as unknown);
  (inquirer as unknown as { registerPrompt: (name: string, ctor: unknown) => void }).registerPrompt('file-tree-selection', PromptCtor);
  fileTreeRegistered = true;
}

interface CLIFlags {
  source?: string;
  dest?: string;
  bitrate: string;
  reencodeMp3: boolean;
  dryRun: boolean;
  nonInteractive: boolean;
  tui: boolean;
  concurrency: number;
}

async function askForFolder(message: string, initial?: string): Promise<string> {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message,
      choices: [
        { name: 'Selecionar navegando pelas pastas', value: 'tree' },
        { name: 'Digitar caminho manualmente', value: 'manual' },
      ],
    },
  ]);

  if (mode === 'manual') {
    const { manual } = await inquirer.prompt([
      {
        type: 'input',
        name: 'manual',
        message: 'Informe o caminho completo:',
        default: initial || process.cwd(),
      },
    ]);
    return path.resolve(manual);
  }

  await ensureFileTreePrompt();
  const { folder } = await inquirer.prompt([
    {
      type: 'file-tree-selection',
      name: 'folder',
      message: 'Escolha a pasta',
      onlyShowDir: true,
      root: initial || process.cwd(),
      hideRoot: false,
    },
  ]);
  return path.resolve(folder);
}

async function resolveSource(flags: CLIFlags): Promise<string> {
  if (flags.source) return path.resolve(flags.source);
  if (flags.nonInteractive) throw new Error('Precisa de --source em modo não-interativo');
  return askForFolder('Selecione a pasta de origem (source):');
}

const program = new Command();
program
  .name('sample-organizer')
  .description('Organizador de multitracks (WAV/M4A → MP3) com estrutura padronizada')
  .option('--source <path>', 'Pasta de origem com músicas')
  .option('--dest <path>', 'Pasta de destino dos resultados')
  .option('--bitrate <br>', 'Bitrate para MP3', '320k')
  .option('--reencode-mp3', 'Sempre reencodar MP3 já existentes', false)
  .option('--dry-run', 'Não efetua escrita, só simula', false)
  .option('--non-interactive', 'Sem prompts interativos', false)
  .option('--tui', 'Abrir interface TUI', false)
  .option('--concurrency <n>', 'Concorrência de operações', (v) => parseInt(v, 10), 2)
  .option('--scan [src]', 'Atalho: executa o scan (opcionalmente informando a origem)');

program
  .command('scan')
  .description('Escaneia a origem e mostra status de metadados')
  .action(async () => {
    const flags = program.opts<CLIFlags>();
  const source = await resolveSource(flags);
    const scanned = await scanSource(source);
    const hydrated = await hydrateSongsWithMetadata(scanned);
    logger.info(`Músicas: ${hydrated.length}`);
    for (const s of hydrated) {
      const missing = [
        !s.meta.author ? 'author' : null,
        !s.meta.key ? 'key' : null,
        !s.meta.bpm ? 'bpm' : null,
      ].filter(Boolean);
      logger.info(`- ${s.inferredName} (${s.files.length} arquivos) ${missing.length ? `[faltando: ${missing.join(', ')}]` : ''}`);
    }
  });

program
  .command('tui')
  .description('Abre a interface TUI para editar metadados')
  .action(async () => {
  const flags = program.opts<CLIFlags>();
  const source = await resolveSource(flags);
  render(React.createElement(App, { source }));
  });

program
  .command('run')
  .description('Executa o pipeline (scan → plano → copiar/convert)')
  .action(async () => {
    const flags = program.opts<CLIFlags>();
    const source = await resolveSource(flags);
    const dest = flags.dest ? flags.dest : await askForFolder('Selecione a pasta de destino (dest):');
    const settings: Settings = {
      source,
      dest,
      bitrate: flags.bitrate || (DEFAULT_SETTINGS.bitrate as string),
      reencodeMp3: !!flags.reencodeMp3,
      dryRun: !!flags.dryRun,
      nonInteractive: !!flags.nonInteractive,
      concurrency: Number.isFinite(flags.concurrency) ? flags.concurrency : (DEFAULT_SETTINGS.concurrency as number),
      overwrite: false,
    };
    const results = await runPipeline(settings);
    const ok = results.filter(r => r.success).length;
    const fail = results.length - ok;
  const byAction = (action: 'convert'|'copy'|'ignore') => results.filter(r => r.success && r.operation.action === action).length;
  const converted = byAction('convert');
  const copied = byAction('copy');
  const ignored = byAction('ignore');
  const totalDurationMs = results.reduce((acc, r) => acc + (r.duration ?? 0), 0);
  const sec = (totalDurationMs/1000).toFixed(1);
  logger.info(`Concluído. Sucesso: ${ok}, Falhas: ${fail}`);
  logger.info(`Relatório: convertidos=${converted}, copiados=${copied}, ignorados=${ignored}, duração≈${sec}s`);
  });

program
  .command('export-csv')
  .description('Exporta metadados das músicas para um CSV')
  .option('--out <file>', 'Arquivo CSV de saída', 'metadata.csv')
  .action(async (cmd) => {
    const flags = program.opts<CLIFlags>();
    const source = await resolveSource(flags);
    const scanned = await scanSource(source);
    const hydrated = await hydrateSongsWithMetadata(scanned);
    const csv = songsToCsvString(hydrated);
    await saveCsv(cmd.out, csv);
    logger.info(`CSV exportado para ${cmd.out}`);
  });

program
  .command('import-csv')
  .description('Importa metadados de um CSV e aplica nas músicas via metadata.json')
  .argument('<file>', 'Arquivo CSV para importar')
  .action(async (file: string) => {
    const content = await (await import('fs/promises')).readFile(file, 'utf8');
    const rows = parseCsv(content);
    await applyCsvRows(rows);
    logger.info(`CSV importado: ${rows.length} linhas aplicadas`);
  });

// Fallback: permitir --scan sem subcomando
const hasScanFlag = process.argv.includes('--scan');
if (hasScanFlag) {
  (async () => {
    const flags = program.opts<CLIFlags>();
    // Tentar extrair src de --scan=/path ou próximo arg
    const scanIndex = process.argv.indexOf('--scan');
    const possible = process.argv[scanIndex + 1];
    if (!flags.source && possible && !possible.startsWith('-')) {
      flags.source = possible;
    }
    const source = await resolveSource(flags);
    const scanned = await scanSource(source);
    const hydrated = await hydrateSongsWithMetadata(scanned);
    logger.info(`Músicas: ${hydrated.length}`);
    for (const s of hydrated) {
      const missing = [
        !s.meta.author ? 'author' : null,
        !s.meta.key ? 'key' : null,
        !s.meta.bpm ? 'bpm' : null,
      ].filter(Boolean);
      logger.info(`- ${s.inferredName} (${s.files.length} arquivos) ${missing.length ? `[faltando: ${missing.join(', ')}]` : ''}`);
    }
  })();
} else {
  program.parseAsync();
}
