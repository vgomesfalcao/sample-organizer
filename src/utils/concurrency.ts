import pLimit from 'p-limit';

/**
 * Cria um limitador de concorrência para controlar o número de operações simultâneas
 */
export function createConcurrencyLimit(concurrency: number) {
  return pLimit(concurrency);
}

/**
 * Processa uma lista de itens com concorrência limitada
 */
export async function processWithLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const limit = createConcurrencyLimit(concurrency);
  
  return Promise.all(
    items.map(item => limit(() => processor(item)))
  );
}

/**
 * Processa uma lista de itens em lotes sequenciais
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Executa operações com retry em caso de falha
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Delay exponencial: 1s, 2s, 4s...
      await new Promise(resolve => 
        setTimeout(resolve, delayMs * Math.pow(2, attempt - 1))
      );
    }
  }
  
  throw lastError!;
}
