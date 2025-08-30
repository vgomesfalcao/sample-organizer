import fs from 'fs-extra';
import path from 'path';

/**
 * Sanitiza um nome de arquivo/pasta removendo caracteres inválidos
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-') // Remove caracteres inválidos
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
    .trim()
    .replace(/^\.+/, '') // Remove pontos no início
    .replace(/\.+$/, ''); // Remove pontos no final
}

/**
 * Garante que um diretório existe, criando-o se necessário
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Verifica se um caminho existe
 */
export async function pathExists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

/**
 * Copia um arquivo de origem para destino, criando diretórios se necessário
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.copy(src, dest);
}

/**
 * Move um arquivo de origem para destino, criando diretórios se necessário
 */
export async function moveFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.move(src, dest);
}

/**
 * Obtém o tamanho de um arquivo em bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Formata um tamanho em bytes para uma string legível (KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Gera um nome único para evitar colisões, adicionando sufixos como -v2, -v3
 */
export async function generateUniquePath(basePath: string): Promise<string> {
  if (!(await pathExists(basePath))) {
    return basePath;
  }

  const dir = path.dirname(basePath);
  const ext = path.extname(basePath);
  const name = path.basename(basePath, ext);

  let counter = 2;
  let uniquePath: string;

  do {
    uniquePath = path.join(dir, `${name}-v${counter}${ext}`);
    counter++;
  } while (await pathExists(uniquePath));

  return uniquePath;
}

/**
 * Lista arquivos em um diretório com filtros opcionais
 */
export async function listFiles(
  dirPath: string,
  options: {
    extensions?: string[];
    recursive?: boolean;
  } = {}
): Promise<string[]> {
  const { extensions, recursive = false } = options;

  if (!(await pathExists(dirPath))) {
    return [];
  }

  const files: string[] = [];
  const items = await fs.readdir(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stats = await fs.stat(fullPath);

    if (stats.isFile()) {
      if (!extensions || extensions.includes(path.extname(item).toLowerCase())) {
        files.push(fullPath);
      }
    } else if (stats.isDirectory() && recursive) {
      const subFiles = await listFiles(fullPath, options);
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * Remove extensão de um nome de arquivo
 */
export function removeExtension(fileName: string): string {
  return path.basename(fileName, path.extname(fileName));
}

/**
 * Normaliza um caminho para usar separadores do sistema
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}
