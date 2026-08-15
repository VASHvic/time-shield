type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function shouldLog(level: LogLevel): boolean {
  if (level === 'debug' || level === 'info') {
    return import.meta.env.DEV;
  }
  return true;
}

/**
 * Leveled logger. Debug/info output is stripped from production builds;
 * warn/error always surface so problems remain visible.
 */
export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) console.debug(...args);
  },
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) console.info(...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
