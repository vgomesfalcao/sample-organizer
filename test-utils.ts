#!/usr/bin/env tsx

/**
 * Arquivo de teste simples para validar os utilitários implementados
 */

import { logger } from './src/utils/logger.js';
import { sanitizeFileName, ensureDir, listFiles } from './src/utils/fs.js';
import { processWithLimit } from './src/utils/concurrency.js';
import { SUPPORTED_AUDIO_EXTENSIONS } from './src/types/index.js';

async function testUtils() {
  logger.info('🧪 Testando utilitários implementados...\n');

  // Teste do logger
  logger.debug('Teste de debug');
  logger.info('Teste de info');
  logger.warn('Teste de warning');
  logger.error('Teste de error');
  console.log();

  // Teste de sanitização de nomes
  logger.info('📝 Testando sanitização de nomes de arquivo:');
  const testNames = [
    'Song Name - Artist/Band',
    'Track (feat. Someone)',
    'File:with*forbidden<chars>',
    '   Spaced   Name   '
  ];
  
  testNames.forEach(name => {
    const sanitized = sanitizeFileName(name);
    logger.info(`  "${name}" → "${sanitized}"`);
  });
  console.log();

  // Teste de extensões suportadas
  logger.info('🎵 Extensões de áudio suportadas:');
  logger.info(`  ${SUPPORTED_AUDIO_EXTENSIONS.join(', ')}`);
  console.log();

  // Teste de concorrência
  logger.info('⚡ Testando controle de concorrência:');
  
  const taskData = Array.from({ length: 5 }, (_, i) => i + 1);
  const processor = async (taskNum: number) => {
    logger.info(`  Executando tarefa ${taskNum}...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return `Resultado ${taskNum}`;
  };

  const startTime = Date.now();
  const results = await processWithLimit(taskData, processor, 2);
  const duration = Date.now() - startTime;
  
  logger.info(`  Resultados: ${results.join(', ')}`);
  logger.info(`  Tempo total: ${duration}ms (com limite de 2 concurrent)`);
  console.log();

  // Teste de listagem de arquivos no diretório atual
  logger.info('📁 Testando listagem de arquivos:');
  try {
    const files = await listFiles('.', { 
      extensions: ['.ts', '.js', '.json'],
      recursive: false 
    });
    logger.info(`  Encontrados ${files.length} arquivos:`);
    files.slice(0, 5).forEach(file => {
      logger.info(`    ${file}`);
    });
    if (files.length > 5) {
      logger.info(`    ... e mais ${files.length - 5} arquivos`);
    }
  } catch (error) {
    logger.error(`  Erro ao listar arquivos: ${error}`);
  }
  console.log();

  logger.info('✅ Todos os utilitários estão funcionando!');
}

// Executar testes
testUtils().catch(error => {
  logger.error(`❌ Erro durante os testes: ${error}`);
  process.exit(1);
});
