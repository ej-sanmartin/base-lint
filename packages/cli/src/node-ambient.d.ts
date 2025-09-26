declare namespace NodeJS {
  interface Process {
    env: Record<string, string | undefined>;
    cwd(): string;
    exitCode?: number;
  }
}

declare const process: NodeJS.Process;

declare module 'child_process' {
  export interface ExecOptions {
    cwd?: string;
    env?: Record<string, string | undefined>;
  }

  export interface ExecException extends Error {
    code?: number | string;
    signal?: string;
  }

  export type ExecCallback = (
    error: ExecException | null,
    stdout: string,
    stderr: string
  ) => void;

  export function exec(command: string, callback?: ExecCallback): any;
  export function exec(command: string, options: ExecOptions, callback?: ExecCallback): any;
}

declare module 'util' {
  export function promisify<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => Promise<any>;
}

declare module 'path' {
  export function resolve(...segments: string[]): string;
  export function dirname(path: string): string;
  export function join(...segments: string[]): string;
  export function extname(path: string): string;
  export function relative(from: string, to: string): string;
  export function basename(path: string, ext?: string): string;
}

declare module 'fs' {
  interface Stats {
    isDirectory(): boolean;
  }

  interface FileHandle {
    readFile(options?: { encoding?: string } | string): Promise<string>;
  }

  export const promises: {
    readFile(path: string | URL, options?: { encoding?: string } | string): Promise<string>;
    writeFile(path: string | URL, data: string | Uint8Array, options?: { encoding?: string } | string): Promise<void>;
    mkdir(path: string | URL, options?: { recursive?: boolean }): Promise<void>;
    access(path: string | URL, mode?: number): Promise<void>;
    stat(path: string | URL): Promise<Stats>;
    readdir(path: string | URL): Promise<string[]>;
  };
  export function readFileSync(path: string | URL, options?: { encoding?: string } | string): string;
}

declare module 'url' {
  export function fileURLToPath(url: string): string;
  export function pathToFileURL(path: string): URL;
}

declare module 'os' {
  export function tmpdir(): string;
}

declare module 'module' {
  export interface NodeRequire {
    (id: string): any;
    resolve(id: string): string;
  }

  export function createRequire(url: string | URL): NodeRequire;
}
