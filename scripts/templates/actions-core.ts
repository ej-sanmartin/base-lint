const INPUT_PREFIX = 'INPUT_';

type GetInputOptions = {
  required?: boolean;
  trimWhitespace?: boolean;
};

type GetBooleanInputOptions = {
  required?: boolean;
};

function toEnvKey(name: string): string {
  return `${INPUT_PREFIX}${name.replace(/ /g, '_')}`.toUpperCase();
}

function readInput(name: string, options: GetInputOptions = {}): string {
  const envKey = toEnvKey(name);
  const raw = process.env[envKey] ?? '';
  const trimWhitespace = options.trimWhitespace ?? true;
  return trimWhitespace ? raw.trim() : raw;
}

export function getInput(name: string, options?: GetInputOptions): string {
  const value = readInput(name, options);
  if (!value && options?.required) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return value;
}

export function getBooleanInput(name: string, options?: GetBooleanInputOptions): boolean {
  const normalized = getInput(name, { ...options, trimWhitespace: true }).toLowerCase();
  if (!normalized) {
    return false;
  }
  if (['true', '1'].includes(normalized)) {
    return true;
  }
  if (['false', '0'].includes(normalized)) {
    return false;
  }
  throw new TypeError(`Input does not meet boolean requirements: ${name}`);
}

export function info(message: string): void {
  console.log(message);
}

export function warning(message: string): void {
  console.warn(message);
}

export function error(message: string): void {
  console.error(message);
}

export function setFailed(message: string | Error): void {
  const output = message instanceof Error ? message.message : String(message);
  console.error(output);
  process.exitCode = 1;
}
