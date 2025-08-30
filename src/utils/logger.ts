import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().substr(11, 8);
    const prefix = `[${timestamp}]`;

    switch (level) {
      case 'debug':
        return chalk.gray(`${prefix} ${message}`);
      case 'info':
        return chalk.blue(`${prefix} ${message}`);
      case 'warn':
        return chalk.yellow(`${prefix} ${message}`);
      case 'error':
        return chalk.red(`${prefix} ${message}`);
      default:
        return `${prefix} ${message}`;
    }
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message));
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
    }
  }

  error(message: string): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
    }
  }

  success(message: string): void {
    console.log(chalk.green(`✓ ${message}`));
  }

  progress(message: string): void {
    console.log(chalk.cyan(`⏳ ${message}`));
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Instância global do logger
export const logger = new Logger();

// Funções de conveniência
export const log = {
  debug: (msg: string) => logger.debug(msg),
  info: (msg: string) => logger.info(msg),
  warn: (msg: string) => logger.warn(msg),
  error: (msg: string) => logger.error(msg),
  success: (msg: string) => logger.success(msg),
  progress: (msg: string) => logger.progress(msg),
};
