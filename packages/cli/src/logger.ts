import pc from 'picocolors';

type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string) {
  const prefix = level === 'info' ? pc.blue('[base-lint]') : level === 'warn' ? pc.yellow('[base-lint]') : pc.red('[base-lint]');
  const output = `${prefix} ${message}`;
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (message: string) => log('info', message),
  warn: (message: string) => log('warn', message),
  error: (message: string) => log('error', message),
};
